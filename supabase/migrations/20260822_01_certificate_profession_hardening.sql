-- Migration: 20260822_01_certificate_profession_hardening.sql
-- Hardening for evaluation_certificates data integrity.
--
-- Rule (Evidence Before Mutation / no "boolean fix"):
--   A certificate may ONLY be marked assessed_against_standards = true
--   when it is actually linked to a profession (profession_id IS NOT NULL).
--
-- All existing rows currently have assessed_against_standards = false,
-- so adding this constraint is safe and will not reject any current data.

ALTER TABLE evaluation_certificates
  ADD CONSTRAINT ck_ec_assessed_requires_profession
  CHECK (assessed_against_standards = false OR profession_id IS NOT NULL);

-- Index to speed up profession-scoped lookups / integrity scans.
CREATE INDEX IF NOT EXISTS idx_evaluation_certificates_profession_status
  ON evaluation_certificates (profession_id, assessed_against_standards)
  WHERE profession_id IS NOT NULL;
