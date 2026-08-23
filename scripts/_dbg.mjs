import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env', 'utf8').split('\n');
env.forEach(l => {
  const t = l.trim();
  if (!t || t.startsWith('#')) return;
  const i = t.indexOf('=');
  if (i === -1) return;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!process.env[k]) process.env[k] = v;
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
const c = await pool.connect();
const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
console.log('TABLES:', tables.rows.length);
for (const { table_name } of tables.rows) {
  try {
    const r = await c.query(`SELECT COUNT(*)::int AS n FROM "${table_name}"`);
    console.log(table_name.padEnd(34), r.rows[0].n);
  } catch (e) { console.log(table_name.padEnd(34), 'ERR', e.message); }
}
await c.release();
await pool.end();
