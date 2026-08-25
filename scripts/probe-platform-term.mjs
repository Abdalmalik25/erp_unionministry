import fs from 'node:fs';
import pg from 'pg';
const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
console.log('URL host:', new URL(url.replace('postgresql://', 'http://')).host);
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
const t0 = Date.now();
try {
  const r = await pool.query('SELECT 1 as ok');
  console.log(`SELECT1 ok in ${Date.now() - t0}ms:`, r.rows[0]);
} catch (e) {
  console.log(`FAIL after ${Date.now() - t0}ms:`, e.message);
}
await pool.end();
