import fs from 'fs';
import pg from 'pg';

const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query("SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname");
const byTable = {};
for (const row of r.rows) {
  if (!byTable[row.tablename]) byTable[row.tablename] = [];
  byTable[row.tablename].push(row.indexname);
}
const hot = ['organizational_entities','commercial_establishments','members','violations','inspections','licenses','fee_payments','worker_dispatches','audit_log','compliance_alerts','expatriate_licenses','labor_disputes','activities','board_members','documents'];
for (const t of hot) {
  console.log(t + ': ' + ((byTable[t] || []).join(', ') || 'NO INDEXES'));
}
await c.end();
