// migrate-session-intel.mjs — ترحيل إنتاجي: هوية الجهاز + الموقع + المخاطر للجلسات
// يضاف تزايديًا دون المساس بالبيانات القائمة (كل الخطوات idempotent)
import pg from 'pg';

const steps = [
  {
    name: '[1/3] user_sessions: device/geo/risk columns + indexes',
    sql: `
      ALTER TABLE user_sessions
        ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
        ADD COLUMN IF NOT EXISTS device_type   TEXT,
        ADD COLUMN IF NOT EXISTS device_brand  TEXT,
        ADD COLUMN IF NOT EXISTS device_model  TEXT,
        ADD COLUMN IF NOT EXISTS browser       TEXT,
        ADD COLUMN IF NOT EXISTS os            TEXT,
        ADD COLUMN IF NOT EXISTS screen        TEXT,
        ADD COLUMN IF NOT EXISTS country       TEXT,
        ADD COLUMN IF NOT EXISTS region        TEXT,
        ADD COLUMN IF NOT EXISTS city          TEXT,
        ADD COLUMN IF NOT EXISTS geo_source    TEXT,
        ADD COLUMN IF NOT EXISTS risk_score    INT  DEFAULT 0,
        ADD COLUMN IF NOT EXISTS risk_flags    JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS revoked_by    UUID,
        ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
      CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON user_sessions(device_fingerprint);
      CREATE INDEX IF NOT EXISTS idx_sessions_country   ON user_sessions(country);
      CREATE INDEX IF NOT EXISTS idx_sessions_active    ON user_sessions(is_active, last_activity_at);
    `,
  },
  {
    name: '[2/3] device_registry table + indexes',
    sql: `
      CREATE TABLE IF NOT EXISTS device_registry (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES sector_users(id) ON DELETE CASCADE,
        fingerprint   TEXT NOT NULL,
        label         TEXT,
        device_type   TEXT,
        device_brand  TEXT,
        device_model  TEXT,
        browser       TEXT,
        os            TEXT,
        first_ip      INET,
        last_ip       INET,
        first_seen_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
        trusted       BOOLEAN DEFAULT FALSE,
        revoked       BOOLEAN DEFAULT FALSE,
        UNIQUE (user_id, fingerprint)
      );
      CREATE INDEX IF NOT EXISTS idx_devices_user   ON device_registry(user_id);
      CREATE INDEX IF NOT EXISTS idx_devices_fp     ON device_registry(fingerprint);
    `,
  },
  {
    name: '[3/3] login_attempts: enrich with device/geo snapshot',
    sql: `
      ALTER TABLE login_attempts
        ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
        ADD COLUMN IF NOT EXISTS country TEXT,
        ADD COLUMN IF NOT EXISTS city    TEXT,
        ADD COLUMN IF NOT EXISTS device_type TEXT,
        ADD COLUMN IF NOT EXISTS browser TEXT,
        ADD COLUMN IF NOT EXISTS os      TEXT,
        ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS risk_flags JSONB DEFAULT '[]'::jsonb;
      CREATE INDEX IF NOT EXISTS idx_login_attempts_fp ON login_attempts(device_fingerprint);
    `,
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  for (const s of steps) {
    process.stdout.write(s.name + ' ... ');
    await pool.query(s.sql);
    console.log('OK');
  }
  // تقرير حالة
  const s = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='user_sessions' AND column_name='device_fingerprint') AS sess_ok,
      (SELECT COUNT(*)::int FROM information_schema.tables  WHERE table_name='device_registry') AS dev_ok,
      (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='login_attempts' AND column_name='device_fingerprint') AS att_ok`);
  console.log('VERIFY:', s.rows[0]);
  console.log('MIGRATION OK');
} catch (e) {
  console.error('MIGRATION FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
