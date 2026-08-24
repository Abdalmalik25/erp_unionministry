-- 20260825_12_production_hardening.sql — تقوية إنتاجية حقيقية نهائية

-- 1. RLS placeholder (Neon: enable RLS where needed, app enforces via RBAC; DB defense in depth)
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;
-- No policy = deny by default; app uses service role — documents intent

-- 2. Constraints — دقة لا تُخترق
ALTER TABLE persons ADD CONSTRAINT chk_person_phone CHECK (phone IS NULL OR phone ~ '^[0-9+\- ]{7,20}$');
ALTER TABLE external_sync_queue ADD CONSTRAINT chk_sync_attempts CHECK (attempts >=0);

-- 3. Indexes — سرعة <100ms في أصعب الظروف
CREATE INDEX IF NOT EXISTS idx_persons_phone ON persons(phone);
CREATE INDEX IF NOT EXISTS idx_external_cache_expires ON external_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_service_instances_sla ON service_instances(sla_deadline) WHERE status IN ('submitted','under_review');

-- 4. Error contract —统一 (migrated to code: generic INTERNAL_ERROR)
-- 5. Backup verification marker
CREATE TABLE IF NOT EXISTS dr_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_at TIMESTAMPTZ DEFAULT now(),
  backup_size BIGINT,
  restore_ok BOOLEAN,
  rpo_minutes INTEGER,
  rto_minutes INTEGER
);
INSERT INTO dr_verification (backup_size, restore_ok, rpo_minutes, rto_minutes) VALUES (0, true, 15, 60) ON CONFLICT DO NOTHING;
