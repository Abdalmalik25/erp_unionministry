/**
 * Database Query Monitor — Phase 5
 * Wraps pg.Pool with slow query logging and monitoring
 */

import crypto from 'crypto';

const SLOW_QUERY_THRESHOLD_MS = parseFloat(process.env.SLOW_QUERY_THRESHOLD_MS || '500');

const QUERY_METRICS = {
  total: 0,
  selects: 0,
  inserts: 0,
  updates: 0,
  deletes: 0,
  transactions: 0,
  slow: [],
  errors: [],
  byTable: {},
  recent: [],
};

const MAX_SLOW = 200;
const MAX_RECENT = 500;

function getTableFromQuery(sql) {
  const match = sql.match(/\bFROM\s+([\w.]+)/i)
    || sql.match(/\bINTO\s+([\w.]+)/i)
    || sql.match(/\bUPDATE\s+([\w.]+)/i)
    || sql.match(/\bDELETE\s+FROM\s+([\w.]+)/i);
  return match ? match[1] : 'unknown';
}

function redact(sql) {
  return sql
    .replace(/'[^']*'/g, "'?'")
    .replace(/\$[\d]+/g, '?')
    .replace(/\b\d{10,}\b/g, '?')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'uuid?')
    .trim();
}

function classify(sql) {
  const u = sql.trim().toUpperCase();
  if (/^\s*SELECT\b/i.test(u)) return 'SELECT';
  if (/^\s*INSERT\b/i.test(u)) return 'INSERT';
  if (/^\s*UPDATE\b/i.test(u)) return 'UPDATE';
  if (/^\s*DELETE\b/i.test(u)) return 'DELETE';
  if (/^\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/i.test(u)) return 'TRANSACTION';
  return 'OTHER';
}

function maskSensitive(sql) {
  return redact(sql)
    .replace(/\bpassword\b/gi, '?')
    .replace(/\btoken\b/gi, '?')
    .replace(/\bsecret\b/gi, '?')
    .replace(/\bapi[_-]?key\b/gi, '?')
    .substring(0, 300);
}

function wrapQuery(pgPool) {
  const origQuery = pgPool.query.bind(pgPool);
  const origConnect = pgPool.connect.bind(pgPool);

  // Track connections
  let activeConnections = 0;
  let totalConnectionsEver = 0;

  pgPool.query = async function monitoredQuery(sql, ...args) {
    const startNs = process.hrtime.bigint();
    const queryType = classify(sql);
    const table = getTableFromQuery(sql);
    const sqlHash = crypto.createHash('sha1').update(sql).digest('hex').substring(0, 8);
    const startTime = new Date().toISOString();
    let result = null;
    let err = null;
    let durationMs = 0;

    try {
      result = await origQuery(sql, ...args);
      durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
      return result;
    } catch (e) {
      err = e;
      durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
      throw e;
    } finally {
      const rowCount = result?.rowCount ?? (err ? -1 : 0);
      const ms = Math.round(durationMs * 100) / 100;
      const entry = {
        ts: startTime,
        durationMs: ms,
        type: queryType,
        table,
        rowCount,
        sqlHash,
        sql: maskSensitive(sql),
        error: err ? (err.code || err.message).substring(0, 80) : null,
        clientId: pgPool.options?.max?.toString() || '?',
      };

      // Update metrics
      QUERY_METRICS.total += 1;
      QUERY_METRICS.byTable[table] = (QUERY_METRICS.byTable[table] || 0) + 1;
      if (queryType === 'SELECT') QUERY_METRICS.selects += 1;
      if (queryType === 'INSERT') QUERY_METRICS.inserts += 1;
      if (queryType === 'UPDATE') QUERY_METRICS.updates += 1;
      if (queryType === 'DELETE') QUERY_METRICS.deletes += 1;
      if (queryType === 'TRANSACTION') QUERY_METRICS.transactions += 1;

      if (ms >= SLOW_QUERY_THRESHOLD_MS) {
        QUERY_METRICS.slow.unshift(entry);
        if (QUERY_METRICS.slow.length > MAX_SLOW) QUERY_METRICS.slow.pop();
      }
      if (err) {
        QUERY_METRICS.errors.unshift(entry);
        if (QUERY_METRICS.errors.length > 100) QUERY_METRICS.errors.pop();
      }
      QUERY_METRICS.recent.unshift(entry);
      if (QUERY_METRICS.recent.length > MAX_RECENT) QUERY_METRICS.recent.pop();
    }
  };

  pgPool.connect = async function monitoredConnect() {
    const client = await origConnect();
    totalConnectionsEver += 1;
    activeConnections += 1;
    const origEnd = client.end.bind(client);
    client.end = () => { activeConnections -= 1; return origEnd(); };
    client.release = () => { activeConnections -= 1; };
    return client;
  };

  return {
    getMetrics: () => ({
      total: QUERY_METRICS.total,
      byType: {
        SELECT: QUERY_METRICS.selects,
        INSERT: QUERY_METRICS.inserts,
        UPDATE: QUERY_METRICS.updates,
        DELETE: QUERY_METRICS.deletes,
        TRANSACTION: QUERY_METRICS.transactions,
      },
      byTable: { ...QUERY_METRICS.byTable },
      slowQueryCount: QUERY_METRICS.slow.length,
      errorCount: QUERY_METRICS.errors.length,
      connections: {
        active: activeConnections,
        totalEver: totalConnectionsEver,
      },
    }),
    getSlowQueries: (limit = 50) => QUERY_METRICS.slow.slice(0, limit),
    getErrors: (limit = 20) => QUERY_METRICS.errors.slice(0, limit),
    getRecent: (limit = 100) => QUERY_METRICS.recent.slice(0, limit),
    resetMetrics: () => {
      QUERY_METRICS.total = 0;
      QUERY_METRICS.selects = 0;
      QUERY_METRICS.inserts = 0;
      QUERY_METRICS.updates = 0;
      QUERY_METRICS.deletes = 0;
      QUERY_METRICS.transactions = 0;
      QUERY_METRICS.slow = [];
      QUERY_METRICS.errors = [];
      QUERY_METRICS.byTable = {};
      QUERY_METRICS.recent = [];
    },
  };
}

export { wrapQuery };
export default { wrapQuery };
