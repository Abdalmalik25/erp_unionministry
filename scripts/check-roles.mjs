import '../server/lib/loadEnv.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
const v = await pool.query('SELECT role, user_type, email FROM sector_users LIMIT 5');
console.log('users:', JSON.stringify(v.rows, null, 1));
const c = await pool.query(`SELECT conname, pg_get_constraintdef(oid) d FROM pg_constraint WHERE conrelid='sector_users'::regclass AND contype='c'`);
c.rows.forEach(x => console.log(x.conname, ':', x.d.substring(0, 160)));
await pool.end();
