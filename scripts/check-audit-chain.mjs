import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEON_DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
const r = await pool.query('SELECT action, table_name, left(prev_hash,10) prev, left(row_hash,10) hash FROM audit_log ORDER BY id DESC LIMIT 3');
if (r.rows.length === 0) console.log('NO AUDIT ROWS');
r.rows.forEach(x => console.log(`${x.action} | ${x.table_name} | prev:${x.prev || 'NULL'} -> hash:${x.hash || 'NULL'}`));
await pool.end();
process.exit(0);
