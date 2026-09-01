-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Search Optimization + Data Integrity Hardening
-- Yemen National Labor Platform — Phase 2 Performance
-- ═══════════════════════════════════════════════════════════════════════
-- Date: 2026-09-01
-- Purpose: Enable pg_trgm for fast ILIKE searches, add missing unique
--          constraints, and fix broken RLS policies on critical tables.
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. ENABLE pg_trgm EXTENSION (if not already)
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────────
-- 2. GIN TRIGRAM INDEXES — for fast `%search%` ILIKE queries
-- ─────────────────────────────────────────────────────────────────────
-- These replace full table scans with index-accelerated trigram matching

-- Organizational entities search (used in /api/entities)
CREATE INDEX IF NOT EXISTS idx_oe_name_ar_trgm ON organizational_entities USING gin (name_ar gin_trgm_ops)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oe_name_en_trgm ON organizational_entities USING gin (name_en gin_trgm_ops)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oe_unified_code_trgm ON organizational_entities USING gin (unified_code gin_trgm_ops)
WHERE deleted_at IS NULL;

-- Members search (used in /api/members)
CREATE INDEX IF NOT EXISTS idx_members_full_name_trgm ON members USING gin (full_name gin_trgm_ops)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_national_id_trgm ON members USING gin (national_id gin_trgm_ops)
WHERE deleted_at IS NULL;

-- Commercial establishments search (used in /api/commercial)
CREATE INDEX IF NOT EXISTS idx_ce_name_ar_trgm ON commercial_establishments USING gin (name_ar gin_trgm_ops)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ce_name_en_trgm ON commercial_establishments USING gin (name_en gin_trgm_ops)
WHERE deleted_at IS NULL;

-- Worker profiles search
CREATE INDEX IF NOT EXISTS idx_wp_national_number_trgm ON worker_profiles USING gin (national_number gin_trgm_ops)
WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 3. UNIQUE CONSTRAINTS — prevent duplicate data
-- ─────────────────────────────────────────────────────────────────────

-- Members: unique national_id per entity (no duplicate membership)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_members_entity_national_id'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT uq_members_entity_national_id
      UNIQUE (entity_id, national_id);
  END IF;
EXCEPTION WHEN undefined_table OR duplicate_object THEN
  RAISE NOTICE 'Constraint uq_members_entity_national_id skipped';
END $$;

-- Worker profiles: unique member_id (one profile per member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_worker_profiles_member'
  ) THEN
    ALTER TABLE worker_profiles ADD CONSTRAINT uq_worker_profiles_member
      UNIQUE (member_id);
  END IF;
EXCEPTION WHEN undefined_table OR duplicate_object THEN
  RAISE NOTICE 'Constraint uq_worker_profiles_member skipped';
END $$;

-- Workflow definitions: unique workflow_key + version
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_workflow_definitions_key_version'
  ) THEN
    ALTER TABLE workflow_definitions ADD CONSTRAINT uq_workflow_definitions_key_version
      UNIQUE (workflow_key, version);
  END IF;
EXCEPTION WHEN undefined_table OR duplicate_object THEN
  RAISE NOTICE 'Constraint uq_workflow_definitions_key_version skipped';
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RLS POLICY FIXES — enable access on critical tables
-- ─────────────────────────────────────────────────────────────────────

-- persons: RLS enabled but NO policies = blocks all access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'persons' AND rowsecurity = true) THEN
    -- Drop existing deny-all and add proper policies
    DROP POLICY IF EXISTS persons_select_policy ON persons;
    CREATE POLICY persons_select_policy ON persons
      FOR SELECT TO authenticated
      USING (true);
    DROP POLICY IF EXISTS persons_insert_policy ON persons;
    CREATE POLICY persons_insert_policy ON persons
      FOR INSERT TO authenticated
      WITH CHECK (true);
    DROP POLICY IF EXISTS persons_update_policy ON persons;
    CREATE POLICY persons_update_policy ON persons
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE 'Fixed RLS policies on persons table';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table persons not found — skipping RLS fix';
END $$;

-- legal_entities: same issue
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'legal_entities' AND rowsecurity = true) THEN
    DROP POLICY IF EXISTS legal_entities_select_policy ON legal_entities;
    CREATE POLICY legal_entities_select_policy ON legal_entities
      FOR SELECT TO authenticated
      USING (true);
    DROP POLICY IF EXISTS legal_entities_insert_policy ON legal_entities;
    CREATE POLICY legal_entities_insert_policy ON legal_entities
      FOR INSERT TO authenticated
      WITH CHECK (true);
    DROP POLICY IF EXISTS legal_entities_update_policy ON legal_entities;
    CREATE POLICY legal_entities_update_policy ON legal_entities
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE 'Fixed RLS policies on legal_entities table';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table legal_entities not found — skipping RLS fix';
END $$;

-- documents: RLS enabled but no policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'documents' AND rowsecurity = true) THEN
    DROP POLICY IF EXISTS documents_select_policy ON documents;
    CREATE POLICY documents_select_policy ON documents
      FOR SELECT TO authenticated
      USING (true);
    DROP POLICY IF EXISTS documents_insert_policy ON documents;
    CREATE POLICY documents_insert_policy ON documents
      FOR INSERT TO authenticated
      WITH CHECK (true);
    RAISE NOTICE 'Fixed RLS policies on documents table';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table documents not found — skipping RLS fix';
END $$;

-- violations: RLS enabled but no policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'violations' AND rowsecurity = true) THEN
    DROP POLICY IF EXISTS violations_select_policy ON violations;
    CREATE POLICY violations_select_policy ON violations
      FOR SELECT TO authenticated
      USING (true);
    DROP POLICY IF EXISTS violations_insert_policy ON violations;
    CREATE POLICY violations_insert_policy ON violations
      FOR INSERT TO authenticated
      WITH CHECK (true);
    RAISE NOTICE 'Fixed RLS policies on violations table';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table violations not found — skipping RLS fix';
END $$;

-- service_requests: RLS enabled but no policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'service_requests' AND rowsecurity = true) THEN
    DROP POLICY IF EXISTS service_requests_select_policy ON service_requests;
    CREATE POLICY service_requests_select_policy ON service_requests
      FOR SELECT TO authenticated
      USING (true);
    DROP POLICY IF EXISTS service_requests_insert_policy ON service_requests;
    CREATE POLICY service_requests_insert_policy ON service_requests
      FOR INSERT TO authenticated
      WITH CHECK (true);
    RAISE NOTICE 'Fixed RLS policies on service_requests table';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table service_requests not found — skipping RLS fix';
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. INDEX FOR ENTITY OVERVIEW QUERY — optimize the 12-query parallel
-- ─────────────────────────────────────────────────────────────────────

-- Entity overview uses 12 parallel COUNT(*) queries
-- These indexes make each COUNT fast
CREATE INDEX IF NOT EXISTS idx_members_entity_status ON members (entity_id, status)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_violations_entity_status ON violations (entity_id, status)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_enterprise ON inspections (enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities (entity_id, start_date DESC)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents (entity_id)
WHERE deleted_at IS NULL;
CREATE INDEX IF EXISTS idx_licenses_enterprise_status ON licenses (enterprise_id, status)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dispatches_sending ON worker_dispatches (sending_enterprise_id, status)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_assessments_enterprise ON risk_assessments (enterprise_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_enterprise ON compliance_alerts (enterprise_id, is_resolved)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entity_relationships_source ON entity_relationships (source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_target ON entity_relationships (target_entity_id);

-- ─────────────────────────────────────────────────────────────────────
-- 6. VALIDATION
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_trgm_count INT;
  v_constraint_count INT;
BEGIN
  SELECT COUNT(*) INTO v_trgm_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE '%trgm%'
    AND indexdef LIKE 'CREATE INDEX%gin%';

  SELECT COUNT(*) INTO v_constraint_count
  FROM pg_constraint
  WHERE conname IN (
    'uq_members_entity_national_id',
    'uq_worker_profiles_member',
    'uq_workflow_definitions_key_version'
  );

  RAISE NOTICE '═══ Search + Integrity Validation ═══';
  RAISE NOTICE 'Trigram GIN indexes: % (expected: 7+)', v_trgm_count;
  RAISE NOTICE 'Unique constraints: % (expected: 3)', v_constraint_count;
  RAISE NOTICE '✅ Validation complete.';
END $$;

COMMIT;
-- ═══════════════════════════════════════════════════════════════════════
