// ترحيل استخبارات الجهاز والموقع — تزايدي (IF NOT EXISTS) وآمن للتكرار
import pg from 'pg';
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const steps = [
  // أعمدة الاستخبارات على user_sessions
  `ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_fingerprint text,
    ADD COLUMN IF NOT EXISTS device_type text, ADD COLUMN IF NOT EXISTS device_brand text,
    ADD COLUMN IF NOT EXISTS browser text, ADD COLUMN IF NOT EXISTS browser_version text,
    ADD COLUMN IF NOT EXISTS os text, ADD COLUMN IF NOT EXISTS os_version text,
    ADD COLUMN IF NOT EXISTS language text, ADD COLUMN IF NOT EXISTS timezone text,
    ADD COLUMN IF NOT EXISTS country text, ADD COLUMN IF NOT EXISTS region text,
    ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS latitude double precision,
    ADD COLUMN IF NOT EXISTS longitude double precision,
    ADD COLUMN IF NOT EXISTS risk_score smallint DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_flags jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS revoked_by uuid, ADD COLUMN IF NOT EXISTS revoked_reason text`,
  // سجل الأجهزة — هوية الجهاز لكل مستخدم مع الثقة/الإبطال
  `CREATE TABLE IF NOT EXISTS device_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    fingerprint text NOT NULL,
    device_type text, device_brand text, browser text, os text, os_version text,
    label text,
    first_seen_at timestamptz DEFAULT NOW(),
    last_seen_at timestamptz DEFAULT NOW(),
    trusted boolean DEFAULT false,
    revoked boolean DEFAULT false,
    UNIQUE(user_id, fingerprint))`,
  `CREATE INDEX IF NOT EXISTS idx_device_registry_user ON device_registry(user_id)`,
  // فهرس جلوس نشطة سريع للتحكم الحي
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true`,
];
for (const [i, sql] of steps.entries()) {
  process.stdout.write(`[${i + 1}/${steps.length}] `);
  await p.query(sql);
  console.log('OK');
}
await p.end();
console.log('DEVICE-INTEL MIGRATION OK');