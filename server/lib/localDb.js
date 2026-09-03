// server/lib/localDb.js — Offline-first SQLite adapter (sql.js WASM)
// Falls back to local SQLite when Neon is unreachable.
// Syncs with Neon when connection is restored.

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || join(__dirname, '..', '..', 'data', 'local.db');
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10);

let _db = null;
let _syncTimer = null;
let _isOnline = false;
let _lastSyncAt = null;

// ─── Initialization ────────────────────────────────────────────────────────

async function initLocalDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  const dir = dirname(LOCAL_DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(LOCAL_DB_PATH)) {
    const buf = readFileSync(LOCAL_DB_PATH);
    _db = new SQL.Database(buf);
    console.log('[LocalDB] Loaded existing database from', LOCAL_DB_PATH);
  } else {
    _db = new SQL.Database();
    console.log('[LocalDB] Created new in-memory database');
  }

  // Enable WAL mode for better concurrency
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');
  _db.run('PRAGMA busy_timeout = 5000');

  // Create core tables if they don't exist (minimal schema for offline cache)
  _db.run(`
    CREATE TABLE IF NOT EXISTS _sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  return _db;
}

// ─── PostgreSQL-to-SQLite Query Translation ────────────────────────────────

function translateQuery(sql, params = []) {
  let translated = sql;

  // Replace $1, $2, ... with ? placeholders
  let idx = 0;
  translated = translated.replace(/\$\d+/g, () => {
    idx++;
    return '?';
  });

  // Replace PostgreSQL-specific functions
  translated = translated.replace(/\bNOW\(\)/g, "datetime('now')");
  translated = translated.replace(/\bEXTRACT\(EPOCH FROM ([^)]+)\)/g, "strftime('%s', $1)");
  translated = translated.replace(/::int\b/g, '');
  translated = translated.replace(/::text\b/g, '');
  translated = translated.replace(/::inet\b/g, '');
  translated = translated.replace(/::jsonb\b/g, '');
  translated = translated.replace(/\bpg_advisory_xact_lock\([^)]*\)/g, 'SELECT 1');

  return { sql: translated, params };
}

// ─── Pool-compatible Interface ─────────────────────────────────────────────

function createLocalPool() {
  return {
    async query(sql, params = []) {
      const db = await initLocalDb();
      const { sql: translated, params: translatedParams } = translateQuery(sql, params);

      // Handle RETURNING
      if (/\bRETURNING\b/i.test(sql)) {
        try {
          const stmt = db.prepare(translated);
          stmt.bind(translatedParams);
          stmt.step();
          stmt.free();
          // For RETURNING, we need to get the last inserted row
          // sql.js doesn't support RETURNING directly, so we use last_insert_rowid
          const result = db.exec('SELECT last_insert_rowid() as id');
          const id = result.length > 0 ? result[0].values[0][0] : null;
          return { rows: [{ id }], rowCount: 1 };
        } catch (e) {
          return { rows: [], rowCount: 0, error: e.message };
        }
      }

      // Handle SELECT
      if (/^\s*SELECT/i.test(sql)) {
        try {
          const stmt = db.prepare(translated);
          stmt.bind(translatedParams);
          const rows = [];
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((col, i) => { row[col] = vals[i]; });
            rows.push(row);
          }
          stmt.free();
          return { rows, rowCount: rows.length };
        } catch (e) {
          return { rows: [], rowCount: 0, error: e.message };
        }
      }

      // Handle INSERT/UPDATE/DELETE
      try {
        db.run(translated, translatedParams);
        const changes = db.getRowsModified();
        return { rows: [], rowCount: changes };
      } catch (e) {
        return { rows: [], rowCount: 0, error: e.message };
      }
    },

    async connect() {
      const db = await initLocalDb();
      return {
        async query(sql, params = []) {
          const { sql: translated, params: translatedParams } = translateQuery(sql, params);
          try {
            if (/^\s*SELECT/i.test(sql)) {
              const stmt = db.prepare(translated);
              stmt.bind(translatedParams);
              const rows = [];
              while (stmt.step()) {
                const cols = stmt.getColumnNames();
                const vals = stmt.get();
                const row = {};
                cols.forEach((col, i) => { row[col] = vals[i]; });
                rows.push(row);
              }
              stmt.free();
              return { rows, rowCount: rows.length };
            } else {
              db.run(translated, translatedParams);
              const changes = db.getRowsModified();
              return { rows: [], rowCount: changes };
            }
          } catch (e) {
            return { rows: [], rowCount: 0, error: e.message };
          }
        },
        async beginTransaction() { db.run('BEGIN'); },
        async commit() { db.run('COMMIT'); },
        async rollback() { db.run('ROLLBACK'); },
        release() { /* no-op for local */ }
      };
    },

    // Save to disk
    save() {
      if (!_db) return;
      const data = _db.export();
      const buffer = Buffer.from(data);
      writeFileSync(LOCAL_DB_PATH, buffer);
      console.log('[LocalDB] Saved to', LOCAL_DB_PATH);
    },

    getPoolStats() {
      return {
        totalCount: 1,
        idleCount: 0,
        waitingCount: 0,
        maxConnections: 1,
        isLocal: true,
        lastSyncAt: _lastSyncAt,
      };
    },

    get isOnline() { return _isOnline; },
    get lastSyncAt() { return _lastSyncAt; },

    // Expose raw db for sync operations
    getRawDb() { return _db; },
  };
}

// ─── Sync Engine ───────────────────────────────────────────────────────────

async function syncFromNeon(neonPool) {
  if (!neonPool || !_db) return;

  try {
    // Test Neon connectivity
    await neonPool.query('SELECT 1');
    _isOnline = true;
    console.log('[LocalDB] Neon online — sync available');
  } catch {
    _isOnline = false;
    console.log('[LocalDB] Neon offline — using local cache');
    return;
  }

  // Sync: pull critical tables from Neon into local SQLite
  const syncTables = [
    'members', 'activities', 'documents', 'violations', 'inspections',
    'licenses', 'training_records', 'worker_profiles', 'fee_payments',
    'professions', 'organizational_entities', 'commercial_establishments',
    'directorates', 'ministry_offices', 'ministry_employees',
    'services', 'isic4_classifications',
  ];

  for (const table of syncTables) {
    try {
      const { rows } = await neonPool.query(
        `SELECT * FROM ${table} WHERE deleted_at IS NULL LIMIT 1000`
      );

      if (rows.length === 0) continue;

      // Create table if not exists based on first row
      const cols = Object.keys(rows[0]);
      const createSql = `CREATE TABLE IF NOT EXISTS ${table} (${cols.map(c => `"${c}" TEXT`).join(', ')})`;
      _db.run(createSql);

      // Upsert rows
      for (const row of rows) {
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(c => row[c] != null ? String(row[c]) : null);
        _db.run(`INSERT OR REPLACE INTO ${table} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`, values);
      }

      console.log(`[LocalDB] Synced ${rows.length} rows from ${table}`);
    } catch (e) {
      console.warn(`[LocalDB] Sync failed for ${table}:`, e.message);
    }
  }

  _lastSyncAt = new Date().toISOString();
  _db.run(`INSERT OR REPLACE INTO _sync_meta (key, value, updated_at) VALUES ('last_sync', ?, datetime('now'))`, [_lastSyncAt]);

  // Save to disk after sync
  localPool.save();
}

function startAutoSync(neonPool) {
  if (_syncTimer) clearInterval(_syncTimer);
  _syncTimer = setInterval(() => syncFromNeon(neonPool), SYNC_INTERVAL_MS);
  console.log(`[LocalDB] Auto-sync started (interval: ${SYNC_INTERVAL_MS}ms)`);
}

function stopAutoSync() {
  if (_syncTimer) {
    clearInterval(_syncTimer);
    _syncTimer = null;
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────

const localPool = createLocalPool();

export {
  localPool,
  initLocalDb,
  syncFromNeon,
  startAutoSync,
  stopAutoSync,
  translateQuery,
  LOCAL_DB_PATH,
};
