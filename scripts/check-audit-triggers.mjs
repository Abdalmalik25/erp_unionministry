import pg from 'pg';
import fs from 'fs';

const url = (fs.readFileSync('.env', 'utf8').match(/NEON_DATABASE_URL=(.*)/)?.[1] || '').trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });

const tg = await pool.query(`
  SELECT t.tgname, t.tgenabled, p.prosrc
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'audit_log'::regclass
`);
tg.rows.forEach(x => {
  console.log('=== TRIGGER:', x.tgname, '| enabled:', x.tgenabled);
  console.log(x.prosrc);
});
await pool.end();
