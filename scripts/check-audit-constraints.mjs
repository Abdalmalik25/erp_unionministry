import pg from 'pg';
import fs from 'fs';

const url = fs.readFileSync('.env', 'utf8').match(/NEON_DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
const c = await pool.query(`SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid='audit_log'::regclass AND contype='c'`);
c.rows.forEach(x => console.log(x.conname, ':', x.def));
await pool.end();
