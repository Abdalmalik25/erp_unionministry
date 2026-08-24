import pg from 'pg';
import fs from 'fs';

const url = fs.readFileSync('.env', 'utf8').match(/NEON_DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
try {
  const cnt = await pool.query(`SELECT COUNT(*) c FROM sector_users WHERE email='sys.admin@mosal.gov.ye'`);
  console.log('sector_users admin exists:', cnt.rows[0].c);
  await pool.query(`ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey`);
  await pool.query(`ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES sector_users(id) ON DELETE SET NULL`);
  console.log('FK now references sector_users(id) ON DELETE SET NULL');
} catch (e) {
  console.log('FAILED:', e.message);
}
await pool.end();
