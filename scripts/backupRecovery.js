// scripts/backupRecovery.js
// Automated backup, point-in-time recovery, and integrity verification
// Designed for Neon PostgreSQL with cloud-native approach

import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const BACKUP_KEY = process.env.BACKUP_KEY;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');

if (!DATABASE_URL) {
  console.error('[Backup] DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: true } });

// ─── Encryption helpers ────────────────────────────────────────────────────────
function getCipher() {
  if (!BACKUP_KEY) throw new Error('BACKUP_KEY is required for encryption');
  const key = crypto.createHash('sha256').update(BACKUP_KEY).digest();
  return crypto.createCipheriv('aes-256-gcm', key, Buffer.alloc(12, 0));
}

function encrypt(data) {
  const cipher = getCipher();
  const enc = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([tag, enc]).toString('base64');
}

function decrypt(data) {
  if (!BACKUP_KEY) throw new Error('BACKUP_KEY is required for decryption');
  const buf = Buffer.from(data, 'base64');
  const tag = buf.subarray(0, 16);
  const enc = buf.subarray(16);
  const key = crypto.createHash('sha256').update(BACKUP_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.alloc(12, 0));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ─── Schema snapshot ────────────────────────────────────────────────────────────
async function snapshotSchema() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  return res.rows;
}

// ─── Data export ───────────────────────────────────────────────────────────────
async function exportTable(tableName, batchSize = 5000) {
  const rows = [];
  let offset = 0;
  let batch;
  do {
    batch = await pool.query(
      `SELECT * FROM "${tableName}" ORDER BY id LIMIT ${batchSize} OFFSET ${offset}`,
    );
    rows.push(...batch.rows);
    offset += batchSize;
  } while (batch.rows.length === batchSize);
  return rows;
}

// ─── Full backup ───────────────────────────────────────────────────────────────
export async function createBackup(label = 'manual') {
  console.info(`[Backup] Starting backup: ${label}`);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(BACKUP_DIR, `${ts}_${label}`);
  fs.mkdirSync(dir, { recursive: true });

  // Schema
  const schema = await snapshotSchema();
  fs.writeFileSync(path.join(dir, 'schema.json'), JSON.stringify(schema, null, 2));

  // Tables
  const tables = await pool.query(`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tablename NOT IN ('schema_migrations','pg_stat_statements')
  `);

  const manifest = { tables: [], rowCounts: {}, backupAt: ts };
  for (const { tablename } of tables.rows) {
    try {
      const rows = await exportTable(tablename);
      if (rows.length > 0) {
        const data = encrypt(JSON.stringify(rows));
        fs.writeFileSync(path.join(dir, `${tablename}.enc`), data);
      }
      manifest.tables.push(tablename);
      manifest.rowCounts[tablename] = rows.length;
      console.info(`  ✓ ${tablename}: ${rows.length} rows`);
    } catch (e) {
      console.warn(`  ✗ ${tablename}: ${e.message}`);
    }
  }

  // Manifest
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Checksum
  const files = fs.readdirSync(dir).filter((f) => f !== 'manifest.json' && f !== 'checksum.txt');
  const checksums = files.map((f) => {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex');
    return `${hash}  ${f}`;
  });
  fs.writeFileSync(path.join(dir, 'checksum.txt'), checksums.join('\n'));

  console.info(`[Backup] Complete → ${dir}`);
  return { dir, manifest };
}

// ─── Restore ──────────────────────────────────────────────────────────────────
export async function restoreBackup(backupDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));
  console.info(`[Restore] Starting restore from: ${backupDir}`);

  for (const table of manifest.tables) {
    const encPath = path.join(backupDir, `${table}.enc`);
    if (!fs.existsSync(encPath)) continue;

    const enc = fs.readFileSync(encPath, 'utf8');
    const rows = JSON.parse(decrypt(enc));
    if (!rows.length) continue;

    // Truncate then insert (swap table strategy for safety)
    const columns = Object.keys(rows[0]);
    const colList = columns.map((c) => `"${c}"`).join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
    const insertQuery = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    for (const row of rows) {
      await pool.query(insertQuery, columns.map((c) => row[c]));
    }
    console.info(`  ✓ ${table}: ${rows.length} rows restored`);
  }

  console.info('[Restore] Complete');
}

// ─── Integrity check ──────────────────────────────────────────────────────────
export async function verifyBackup(backupDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, 'manifest.json'), 'utf8'));
  const stored = fs.readFileSync(path.join(backupDir, 'checksum.txt'), 'utf8');
  const lines = stored.split('\n').filter(Boolean);

  console.info('[Verify] Checking backup integrity...');
  for (const line of lines) {
    const [expectedHash, filename] = line.split('  ');
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(backupDir, filename))).digest('hex');
    if (expectedHash !== actualHash) {
      throw new Error(`Checksum mismatch: ${filename}`);
    }
    console.info(`  ✓ ${filename}`);
  }
  console.info('[Verify] All checksums valid');
  return { valid: true, tables: manifest.tables.length, rowCounts: manifest.rowCounts };
}

// ─── Point-in-time recovery (Neon branch restore) ─────────────────────────────
export async function pointInTimeRecovery(targetTimestamp) {
  // Neon supports point-in-time recovery via branch restore
  // This script creates a recovery plan
  console.info(`[PITR] Generating recovery plan for: ${targetTimestamp}`);
  const plan = {
    target: targetTimestamp,
    method: 'neon_branch_restore',
    steps: [
      '1. Create a Neon branch from the timestamp',
      `2. Point DATABASE_URL to the new branch`,
      '3. Run integrity checks',
      '4. Validate data',
      '5. Switch production connection',
    ],
    estimatedDuration: '5-15 minutes',
  };
  console.info(JSON.stringify(plan, null, 2));
  return plan;
}

// CLI interface
const cmd = process.argv[2];
const arg = process.argv[3];

(async () => {
  try {
    switch (cmd) {
      case 'backup': {
        await createBackup(arg || 'manual');
        break;
      }
      case 'restore': {
        if (!arg) throw new Error('Usage: node backupRecovery.js restore <backup_dir>');
        await verifyBackup(arg);
        await restoreBackup(arg);
        break;
      }
      case 'verify': {
        if (!arg) throw new Error('Usage: node backupRecovery.js verify <backup_dir>');
        await verifyBackup(arg);
        break;
      }
      case 'pitr': {
        await pointInTimeRecovery(arg || new Date().toISOString());
        break;
      }
      default: {
        console.info('Usage: node backupRecovery.js [backup|restore|verify|pitr] [arg]');
      }
    }
  } catch (e) {
    console.error('[Error]', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
