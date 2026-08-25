// ترحيل 11: عمود تتبع تغيير كلمة المرور — NULL تعني أن الحساب ما يزال بكلمة المرور الابتدائية
import pg from 'pg';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!url) { console.error('NO DATABASE_URL'); process.exit(1); }

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

await pool.query(`
  ALTER TABLE sector_users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
`);
await pool.query(`COMMENT ON COLUMN sector_users.password_changed_at IS 'NULL = كلمة مرور ابتدائية لم تُغيَّر بعد'`);

const { rows } = await pool.query(`
  SELECT email, role, password_changed_at,
         CASE WHEN password_changed_at IS NULL THEN 'INITIAL_PASSWORD' ELSE 'CHANGED' END AS state
  FROM sector_users WHERE deleted_at IS NULL ORDER BY created_at LIMIT 20
`);
console.table(rows);
console.log('migration 11 applied');
await pool.end();
