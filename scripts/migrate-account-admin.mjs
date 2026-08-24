/**
 * الهجرة المؤسسية #4 — إدارة الحسابات والجلسات والرقابة
 * - account_requests : طلبات فتح الحسابات (نقابة/منظمة/عامل/موظف) بدورة موافقات
 * - user_sessions    : جلسات العمل الفعلية (دخول/خروج/نشاط/مدة)
 * - login_attempts   : محاولات الدخول الناجحة والفاشلة
 * سكربت idempotent.
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const connStr = readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.+)$/m)?.[1].trim();
const c = new pg.Client({ connectionString: connStr, connectionTimeoutMillis: 30000 });
await c.connect();

await c.query(`
CREATE TABLE IF NOT EXISTS account_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL CHECK (request_type IN ('union','organization','worker','ministry_employee')),
  full_name text NOT NULL,
  email text,
  phone text,
  national_id text,
  entity_id text,
  entity_name text,
  governorate text,
  requested_role text,
  status text NOT NULL DEFAULT 'under_review' CHECK (status IN ('under_review','approved','rejected')),
  reviewed_by uuid REFERENCES sector_users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_user_id uuid REFERENCES sector_users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  deleted_at timestamptz
)`);
console.log('+ table account_requests');

await c.query(`
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES sector_users(id),
  login_at timestamptz NOT NULL DEFAULT NOW(),
  logout_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT NOW(),
  ip_address text,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true
)`);
console.log('+ table user_sessions');

await c.query(`
CREATE TABLE IF NOT EXISTS login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_attempted text NOT NULL,
  user_id uuid REFERENCES sector_users(id),
  success boolean NOT NULL,
  reason text CHECK (reason IN ('ok','bad_password','unknown_user','account_disabled')),
  ip_address text,
  user_agent text,
  attempted_at timestamptz NOT NULL DEFAULT NOW()
)`);
console.log('+ table login_attempts');

// فهارس
const IDX = [
  ['idx_account_requests_status', 'account_requests', "status, created_at DESC", "WHERE deleted_at IS NULL"],
  ['idx_user_sessions_user', 'user_sessions', "user_id, login_at DESC", null],
  ['idx_user_sessions_active', 'user_sessions', "is_active, last_activity_at DESC", "WHERE is_active = true"],
  ['idx_login_attempts_email', 'login_attempts', "email_attempted, attempted_at DESC", null],
];
for (const [name, tbl, cols, cond] of IDX) {
  const ex = await c.query(`SELECT 1 FROM pg_indexes WHERE indexname=$1`, [name]);
  if (!ex.rows.length) {
    await c.query(`CREATE INDEX ${name} ON ${tbl} (${cols}) ${cond || ''}`);
    console.log(`+ index ${name}`);
  }
}
await c.end();
console.log('DONE');
