import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEON_DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
try {
  await pool.query(`ALTER TABLE audit_log ALTER COLUMN record_id DROP NOT NULL`);
  console.log('record_id is now nullable — auth/system events can be audited');
  const r = await pool.query(
    `INSERT INTO audit_log (action, table_name, actor_id, notes, created_at, prev_hash, row_hash) VALUES ($1,$2,$3,$4,NOW(),$5,$6) RETURNING id`,
    ['test_chain', 'audit_log', null, '{}', 'GENESIS', 'test-hash-123']
  );
  await pool.query(`DELETE FROM audit_log WHERE id=$1`, [r.rows[0].id]);
  console.log('insert+cleanup OK id=', r.rows[0].id);
} catch (e) {
  console.log('FAILED:', e.message);
}
await pool.end();
