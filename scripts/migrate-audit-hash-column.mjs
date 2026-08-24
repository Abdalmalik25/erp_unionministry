import pg from 'pg';
import fs from 'fs';

// تحميل الاتصال من .env يدوياً
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEON_DATABASE_URL=(.*)/) || env.match(/DATABASE_URL=(.*)/);
const connStr = url ? url[1].trim() : null;
if (!connStr) { console.error('no conn'); process.exit(1); }

const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: true } });

try {
  const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='audit_log'`);
  console.log('audit_log columns:', cols.rows.map(r => r.column_name).join(', '));
  const has = cols.rows.some(r => r.column_name === 'entry_hash');
  if (!has) {
    await pool.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entry_hash TEXT`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_entry_hash ON audit_log(entry_hash)`);
    console.log('entry_hash column ADDED + indexed');
  } else {
    console.log('entry_hash already exists');
  }
} finally { await pool.end(); }
