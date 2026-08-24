-- Migration 20260825_09_chronology_hardening.sql
-- Accuracy + Speed in hardest conditions + chronology

-- 1. Strict constraints for accuracy — prevent invalid national_id
ALTER TABLE persons ADD CONSTRAINT chk_person_national_id_format CHECK (national_id IS NULL OR national_id ~ '^[0-9]{8,14}$');
ALTER TABLE employment_contracts ADD CONSTRAINT chk_contract_dates CHECK (end_date IS NULL OR end_date >= start_date);

-- 2. Partial indexes for speed — hardest conditions (weak network, low device)
CREATE INDEX IF NOT EXISTS idx_cases_created_brin ON cases USING brin (created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_worker_brin ON employment_contracts USING brin (created_at);

-- 3. Chronology materialized for fast timeline
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_chronology AS
SELECT 'case' as type, id::text as entity_id, created_at as at, case_number as title FROM cases
UNION ALL
SELECT 'contract', id::text, created_at, contract_number FROM employment_contracts
UNION ALL
SELECT 'inspection', id::text, inspection_date, inspection_number FROM inspections;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_chronology ON mv_chronology(type, entity_id);
