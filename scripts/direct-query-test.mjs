import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await c.connect();

const queries = [
  ['contracts stats', `SELECT type, status, COUNT(*) as count, AVG(VERSION) as avg_version FROM contracts GROUP BY type, status`],
  ['disputes stats', `SELECT status, category, COUNT(*) as count FROM labor_disputes GROUP BY status, category`],
  ['inspections stats', `SELECT status, type, COUNT(*) as count FROM inspections GROUP BY status, type`],
  ['cross-portal analytics workflows', `SELECT status, COUNT(*) as count FROM cross_portal_workflows GROUP BY status`],
  ['cross-portal analytics notifications', `SELECT COUNT(*) as count FROM cross_portal_notifications`],
  ['cross-portal registry entry check', `SELECT COUNT(*) as count FROM unified_registry_entries WHERE entity_type = 'worker'`],
];

for (const [label, sql] of queries) {
  try {
    const r = await c.query(sql);
    console.log(`OK  ${label}: ${r.rowCount} rows`, r.rows.slice(0, 3).map(x => JSON.stringify(x)).join(' | '));
  } catch (e) {
    console.log(`ERR ${label}: ${e.message.slice(0, 200)}`);
  }
}
await c.end();