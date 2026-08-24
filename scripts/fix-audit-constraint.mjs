import pg from 'pg';
import fs from 'fs';

const url = fs.readFileSync('.env', 'utf8').match(/NEON_DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
try {
  await pool.query(`ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check`);
  await pool.query(`
    ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK ((action = ANY (ARRAY[
      'INSERT','UPDATE','DELETE','VIEW','EXPORT','IMPORT','LOGIN','LOGOUT',
      'LOGIN_FAILED','APPROVE','REJECT','CREATE','ARCHIVE','RESTORE','ACTION'
    ])))
  `);
  console.log('constraint extended');
  const r = await pool.query(
    `INSERT INTO audit_log (action, table_name, actor_id, notes, created_at, prev_hash, row_hash) VALUES ($1,$2,$3,$4,NOW(),$5,$6) RETURNING id`,
    ['TEST_CHAIN', 'audit_log', null, '{}', 'GENESIS', 'test-hash-123']
  );
  await pool.query(`DELETE FROM audit_log WHERE id=$1`, [r.rows[0].id]);
  console.log('insert+cleanup OK id=', r.rows[0].id);
} catch (e) {
  console.log('FAILED:', e.message);
}
await pool.end();
