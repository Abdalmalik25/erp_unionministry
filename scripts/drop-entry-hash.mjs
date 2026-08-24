import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEON_DATABASE_URL=(.*)/) || env.match(/DATABASE_URL=(.*)/);
const pool = new pg.Pool({ connectionString: url[1].trim(), ssl: { rejectUnauthorized: true } });

try {
  await pool.query(`DROP INDEX IF EXISTS idx_audit_log_entry_hash`);
  await pool.query(`ALTER TABLE audit_log DROP COLUMN IF EXISTS entry_hash`);
  console.log('redundant entry_hash removed — using canonical prev_hash/row_hash');
} finally { await pool.end(); }
