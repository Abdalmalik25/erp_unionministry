import fs from 'node:fs';
import pg from 'pg';
const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const r = await pool.query(`SELECT setting_key, pg_typeof(setting_value)::text AS t, setting_value::text AS v FROM system_settings WHERE setting_key = 'system_name_ar'`);
console.log(r.rows[0]);
await pool.end();
