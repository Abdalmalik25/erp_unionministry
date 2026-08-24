-- Migration 20260825_05_nfr_hardening.sql
-- Nuclear NFRs: indexes, soft-deletes, constraints, idempotency

-- 1. Performance indexes — TD-018, NFR Performance
CREATE INDEX IF NOT EXISTS idx_persons_nat ON persons(national_id);
CREATE INDEX IF NOT EXISTS idx_persons_gov ON persons(governorate);
CREATE INDEX IF NOT EXISTS idx_legal_entities_status ON legal_entities(status);
CREATE INDEX IF NOT EXISTS idx_legal_entities_gov ON legal_entities(governorate);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_status ON employment_contracts(status);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_dates ON employment_contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_cases_sla ON cases(sla_status, sla_deadline) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cases_type_status ON cases(case_type, status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_state ON workflow_instances(current_state);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence_records(file_hash);
-- audit_log has dynamic columns; use table_name if exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='resource_type') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, created_at DESC)';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='table_name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(table_name, created_at DESC)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_active ON regulatory_rules(status, effective_from, effective_to) WHERE status='active';

-- 2. Ensure soft-delete columns exist on all critical tables — TD-011 payoff
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='deleted_at') THEN
    ALTER TABLE persons ADD COLUMN deleted_at TIMESTAMPTZ, ADD COLUMN deleted_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_entities' AND column_name='deleted_at') THEN
    ALTER TABLE legal_entities ADD COLUMN deleted_at TIMESTAMPTZ, ADD COLUMN deleted_by UUID;
  END IF;
END $$;

-- 3. Idempotency keys for critical writes — NFR Reliability
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- 4. Data quality constraints — prevent duplicates at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_persons_national_notnull ON persons(national_id) WHERE national_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_entities_number ON legal_entities(entity_number) WHERE deleted_at IS NULL;

-- 5. Materialized view for National Intelligence Center — performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_national_stats AS
SELECT
  (SELECT COUNT(*) FROM persons WHERE deleted_at IS NULL) as total_persons,
  (SELECT COUNT(*) FROM legal_entities WHERE deleted_at IS NULL) as total_establishments,
  (SELECT COUNT(*) FROM employment_contracts WHERE status='active') as active_contracts,
  (SELECT COUNT(*) FROM cases WHERE deleted_at IS NULL) as total_cases,
  (SELECT COUNT(*) FROM cases WHERE sla_status='overdue') as overdue_cases,
  (SELECT COUNT(*) FROM evidence_records) as total_evidence;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_national_stats ON mv_national_stats(total_persons);

-- 6. Refresh helper
CREATE OR REPLACE FUNCTION refresh_national_stats() RETURNS void LANGUAGE plpgsql AS $$
BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_national_stats; EXCEPTION WHEN OTHERS THEN REFRESH MATERIALIZED VIEW mv_national_stats; END $$;

-- 7. Row-level security helpers (views) — jurisdiction isolation
CREATE OR REPLACE VIEW v_cases_scoped AS
SELECT c.*, o.governorate as office_governorate FROM cases c LEFT JOIN ministry_offices o ON c.office_id=o.id;
