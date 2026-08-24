import fs from 'fs';
import pg from 'pg';

const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
for (const t of ['inspections', 'worker_dispatches', 'labor_disputes']) {
  const r = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`,
    [t]
  );
  console.log(`\n=== ${t} (${r.rows.length}) ===`);
  console.log(r.rows.map(x => x.column_name).join(', '));
}
await pool.end();
