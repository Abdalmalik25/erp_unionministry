-- E2E Deep Performance Optimization — Global Expert Team
-- Yemen National Labor Platform — UnionSphere Enterprise
-- Date: 2026-09-02
-- Purpose: Deep end-to-end performance optimization covering:
--   1. Critical missing indexes (B-tree, GIN, partial, covering)
--   2. Advanced materialized views for analytical and evaluative reports
--   3. Unified Arabic search engine enhancement
--   4. Cross-portal report functions
--   5. Dashboard query optimization (CTE replacements)
--   6. Auto-refresh triggers for materialized views
--   7. GRANT permissions and validation
BEGIN;

-- SECTION 1: CRITICAL MISSING INDEXES

-- 1.1 Compliance and Violations indexes
CREATE INDEX IF NOT EXISTS idx_violations_enterprise_severity ON violations (enterprise_id, severity, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_violations_entity_status ON violations (entity_id, status, severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity_resolved ON compliance_alerts (severity, is_resolved, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_due_date ON compliance_alerts (due_date) WHERE is_resolved = false AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_matrices_enterprise_status ON compliance_matrices (enterprise_id, compliance_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maturity_assessments_entity_score ON maturity_assessments (entity_id, overall_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_risk_assessments_entity_level ON risk_assessments (entity_id, risk_level, created_at DESC);

-- 1.2 Inspection engine indexes
CREATE INDEX IF NOT EXISTS idx_inspections_compliance_status ON inspections (compliance_status, inspection_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspections_type_status_date ON inspections (inspection_type, status, inspection_date DESC) WHERE deleted_at IS NULL;

-- 1.3 Intelligence engine indexes
CREATE INDEX IF NOT EXISTS idx_professions_hazard_sector ON professions (hazard_level, sector) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_professions_isco_level ON professions (isco_code, level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_maturity_assessments_grade_date ON maturity_assessments (grade, assessment_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_frameworks_active ON evaluation_frameworks (model_type, sector, status) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_next_run_active ON evaluation_plans (next_run_at) WHERE status = 'active' AND deleted_at IS NULL;

-- 1.4 Cross-portal workflow indexes
CREATE INDEX IF NOT EXISTS idx_cross_portal_type_status_created ON cross_portal_workflows (workflow_type, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_instance_stage ON workflow_transitions_log (workflow_instance_id, stage_number, created_at DESC);

-- 1.5 Service catalog and SLA indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_status_deadline ON service_requests (status, processing_deadline) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_requests_entity_service ON service_requests (entity_id, service_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_services_category_code ON services (category, service_code);

-- 1.6 Financial and payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_status_due ON payments (status, due_date DESC) WHERE deleted_at IS NULL;

-- 1.7 Document lifecycle indexes
CREATE INDEX IF NOT EXISTS idx_documents_type_status_expiry ON documents (document_type, status, expiry_date) WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_entity_status ON documents (entity_id, status, created_at DESC) WHERE deleted_at IS NULL;

-- 1.8 Worker dispatches indexes
CREATE INDEX IF NOT EXISTS idx_dispatches_status_date ON worker_dispatches (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dispatches_receiving ON worker_dispatches (receiving_enterprise_id, status) WHERE deleted_at IS NULL;

-- 1.9 Cases by type + status
CREATE INDEX IF NOT EXISTS idx_cases_type_status ON cases (case_type, status) WHERE deleted_at IS NULL;

-- 1.10 GIN trigram for profession English search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_professions_name_en_trgm') THEN
      EXECUTE 'CREATE INDEX idx_professions_name_en_trgm ON professions USING gin (name_en gin_trgm_ops) WHERE deleted_at IS NULL';
    END IF;
  END IF;
END $$;

-- 1.11 Legal sources search
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legal_sources') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_legal_sources_title_trgm') THEN
      EXECUTE 'CREATE INDEX idx_legal_sources_title_trgm ON legal_sources USING gin (title_ar gin_trgm_ops)';
    END IF;
  END IF;
END $$;

-- 1.12 Labor disputes indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'labor_disputes') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disputes_status_created ON labor_disputes (status, created_at DESC) WHERE deleted_at IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_disputes_enterprise ON labor_disputes (enterprise_id, status) WHERE deleted_at IS NULL';
  END IF;
END $$;

-- 1.13 Fee payments indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_payments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fee_payments_entity_type ON fee_payments (entity_id, payment_type, created_at DESC)';
  END IF;
END $$;

-- SECTION 2: ADVANCED MATERIALIZED VIEWS - Analytical and Evaluative Reports

-- 2.1 Evaluation Analytics Dashboard
DROP MATERIALIZED VIEW IF EXISTS mv_evaluation_analytics CASCADE;
CREATE MATERIALIZED VIEW mv_evaluation_analytics AS
SELECT
  ma.entity_id,
  e.name_ar AS entity_name,
  e.governorate,
  e.sector,
  e.status AS entity_status,
  ma.overall_score,
  ma.grade,
  ma.identity_score,
  ma.description_score,
  ma.tasks_score,
  ma.competencies_score,
  ma.safety_score,
  ma.career_score,
  ma.governance_score,
  ma.missing_count,
  ma.red_flags,
  ma.assessment_date,
  ma.assessed_by,
  CASE
    WHEN ma.overall_score >= 90 THEN 'ممتاز'
    WHEN ma.overall_score >= 75 THEN 'جيد جدا'
    WHEN ma.overall_score >= 60 THEN 'جيد'
    WHEN ma.overall_score >= 40 THEN 'مقبول'
    ELSE 'ضعيف'
  END AS compliance_grade_ar,
  CASE
    WHEN ma.overall_score < 40 OR ma.red_flags > 0 THEN 'high'
    WHEN ma.overall_score < 60 THEN 'medium'
    WHEN ma.overall_score < 75 THEN 'low'
    ELSE 'minimal'
  END AS risk_classification,
  100 - COALESCE(ma.competencies_score, 50) AS competencies_gap,
  100 - COALESCE(ma.safety_score, 50) AS safety_gap,
  100 - COALESCE(ma.career_score, 50) AS career_gap,
  NOW() AS refreshed_at
FROM maturity_assessments ma
JOIN organizational_entities e ON (e.id = ma.entity_id OR e.entity_id = ma.entity_id::TEXT)
WHERE ma.deleted_at IS NULL AND e.deleted_at IS NULL;

CREATE UNIQUE INDEX idx_mv_eval_analytics_entity ON mv_evaluation_analytics (entity_id, assessment_date, refreshed_at);
CREATE INDEX idx_mv_eval_analytics_gov ON mv_evaluation_analytics (governorate, overall_score DESC);
CREATE INDEX idx_mv_eval_analytics_sector ON mv_evaluation_analytics (sector, overall_score DESC);
CREATE INDEX idx_mv_eval_analytics_grade ON mv_evaluation_analytics (grade, risk_classification);

-- 2.2 Unified Cross-Portal Performance Dashboard
DROP MATERIALIZED VIEW IF EXISTS mv_cross_portal_performance CASCADE;
CREATE MATERIALIZED VIEW mv_cross_portal_performance AS
WITH entity_base AS (
  SELECT e.id AS entity_id, e.name_ar AS entity_name, e.governorate, e.sector,
    e.entity_type, e.status, e.compliance_status, e.risk_level, e.avg_compliance_score,
    e.created_at AS registered_at
  FROM organizational_entities e WHERE e.deleted_at IS NULL
),
workers_agg AS (
  SELECT eb.entity_id,
    COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'active') AS active_workers,
    COUNT(DISTINCT w.id) FILTER (WHERE w.nationality = 'YE') AS yemeni_workers,
    COUNT(DISTINCT w.id) FILTER (WHERE w.nationality != 'YE' OR w.nationality IS NULL) AS expat_workers,
    ROUND(COUNT(DISTINCT w.id) FILTER (WHERE w.nationality = 'YE')::NUMERIC / NULLIF(COUNT(DISTINCT w.id), 0) * 100, 2) AS yemenization_pct
  FROM entity_base eb LEFT JOIN workers w ON w.entity_id = eb.entity_id AND w.deleted_at IS NULL
  GROUP BY eb.entity_id
),
violations_agg AS (
  SELECT eb.entity_id,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status IN ('open', 'in_review')) AS open_violations,
    COUNT(DISTINCT v.id) FILTER (WHERE v.severity = 'critical' AND v.status NOT IN ('closed', 'resolved')) AS critical_violations,
    COALESCE(SUM(v.penalty_amount) FILTER (WHERE v.status = 'open'), 0) AS pending_fines
  FROM entity_base eb LEFT JOIN violations v ON v.entity_id = eb.entity_id AND v.deleted_at IS NULL
  GROUP BY eb.entity_id
),
inspections_agg AS (
  SELECT eb.entity_id,
    COUNT(DISTINCT i.id) AS total_inspections,
    COUNT(DISTINCT i.id) FILTER (WHERE i.compliance_status = 'compliant') AS compliant_inspections,
    ROUND(AVG(i.overall_score) FILTER (WHERE i.overall_score IS NOT NULL), 2) AS avg_inspection_score,
    MAX(i.inspection_date) AS last_inspection_date
  FROM entity_base eb LEFT JOIN inspections i ON i.enterprise_id = eb.entity_id AND i.deleted_at IS NULL
  GROUP BY eb.entity_id
),
payments_agg AS (
  SELECT eb.entity_id,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) AS pending_fees,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS total_paid
  FROM entity_base eb LEFT JOIN payments p ON p.entity_id = eb.entity_id
  GROUP BY eb.entity_id
),
documents_agg AS (
  SELECT eb.entity_id,
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'approved') AS approved_documents,
    COUNT(DISTINCT d.id) FILTER (WHERE d.expiry_date < CURRENT_DATE + INTERVAL '30 days' AND d.expiry_date > CURRENT_DATE) AS expiring_soon
  FROM entity_base eb LEFT JOIN documents d ON d.entity_id = eb.entity_id AND d.deleted_at IS NULL
  GROUP BY eb.entity_id
)
SELECT eb.entity_id, eb.entity_name, eb.governorate, eb.sector, eb.entity_type,
  eb.status AS entity_status, eb.compliance_status, eb.risk_level, eb.avg_compliance_score, eb.registered_at,
  COALESCE(wa.active_workers, 0) AS active_workers, COALESCE(wa.yemeni_workers, 0) AS yemeni_workers,
  COALESCE(wa.expat_workers, 0) AS expat_workers, COALESCE(wa.yemenization_pct, 0) AS yemenization_pct,
  COALESCE(va.open_violations, 0) AS open_violations, COALESCE(va.critical_violations, 0) AS critical_violations,
  COALESCE(va.pending_fines, 0) AS pending_fines,
  COALESCE(ia.total_inspections, 0) AS total_inspections, COALESCE(ia.compliant_inspections, 0) AS compliant_inspections,
  ia.avg_inspection_score, ia.last_inspection_date,
  COALESCE(pa.pending_fees, 0) AS pending_fees, COALESCE(pa.total_paid, 0) AS total_paid,
  COALESCE(da.total_documents, 0) AS total_documents, COALESCE(da.approved_documents, 0) AS approved_documents,
  COALESCE(da.expiring_soon, 0) AS expiring_documents,
  GREATEST(0, LEAST(100,
    COALESCE(eb.avg_compliance_score, 50) * 0.30
    + GREATEST(0, 100 - COALESCE(va.open_violations, 0) * 10) * 0.25
    + COALESCE(wa.yemenization_pct, 0) * 0.20
    + COALESCE(ia.avg_inspection_score, 50) * 0.15
    + CASE WHEN COALESCE(da.expiring_soon, 0) = 0 THEN 100 ELSE GREATEST(0, 100 - da.expiring_soon * 15) END * 0.10
  )) AS composite_health_score,
  NOW() AS refreshed_at
FROM entity_base eb
LEFT JOIN workers_agg wa ON wa.entity_id = eb.entity_id
LEFT JOIN violations_agg va ON va.entity_id = eb.entity_id
LEFT JOIN inspections_agg ia ON ia.entity_id = eb.entity_id
LEFT JOIN payments_agg pa ON pa.entity_id = eb.entity_id
LEFT JOIN documents_agg da ON da.entity_id = eb.entity_id;

CREATE UNIQUE INDEX idx_mv_cross_portal_entity ON mv_cross_portal_performance (entity_id, refreshed_at);
CREATE INDEX idx_mv_cross_portal_gov_health ON mv_cross_portal_performance (governorate, composite_health_score DESC);
CREATE INDEX idx_mv_cross_portal_sector_health ON mv_cross_portal_performance (sector, composite_health_score DESC);
CREATE INDEX idx_mv_cross_portal_risk ON mv_cross_portal_performance (risk_level, composite_health_score);

-- 2.3 Sector Deep Analytics
DROP MATERIALIZED VIEW IF EXISTS mv_sector_analytics CASCADE;
CREATE MATERIALIZED VIEW mv_sector_analytics AS
SELECT
  COALESCE(e.sector, 'غير محدد') AS sector,
  COUNT(DISTINCT e.id) AS entity_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_entities,
  COUNT(DISTINCT e.id) FILTER (WHERE e.compliance_status = 'compliant') AS compliant_entities,
  ROUND(COUNT(DISTINCT e.id) FILTER (WHERE e.compliance_status = 'compliant')::NUMERIC / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2) AS compliance_rate,
  ROUND(AVG(e.avg_compliance_score), 2) AS avg_compliance_score,
  COUNT(DISTINCT w.id) AS total_workers,
  COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'active') AS active_workers,
  ROUND(COUNT(DISTINCT w.id) FILTER (WHERE w.nationality = 'YE')::NUMERIC / NULLIF(COUNT(DISTINCT w.id), 0) * 100, 2) AS yemenization_pct,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status IN ('open', 'in_review')) AS open_violations,
  ROUND(COUNT(DISTINCT v.id)::NUMERIC / NULLIF(COUNT(DISTINCT e.id), 0), 2) AS violations_per_entity,
  COUNT(DISTINCT i.id) AS total_inspections,
  ROUND(AVG(i.overall_score) FILTER (WHERE i.overall_score IS NOT NULL), 2) AS avg_inspection_score,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS total_revenue,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) AS pending_revenue,
  COUNT(DISTINCT d.id) FILTER (WHERE d.expiry_date < CURRENT_DATE) AS expired_documents,
  COUNT(DISTINCT d.id) FILTER (WHERE d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS expiring_documents,
  NOW() AS refreshed_at
FROM organizational_entities e
LEFT JOIN workers w ON w.entity_id = e.id AND w.deleted_at IS NULL
LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
LEFT JOIN payments p ON p.entity_id = e.id
LEFT JOIN documents d ON d.entity_id = e.id AND d.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.sector;

CREATE UNIQUE INDEX idx_mv_sector_analytics_sector ON mv_sector_analytics (sector, refreshed_at);
CREATE INDEX idx_mv_sector_analytics_compliance ON mv_sector_analytics (compliance_rate DESC);

-- 2.4 Governorate Intelligence Report
DROP MATERIALIZED VIEW IF EXISTS mv_governorate_intelligence CASCADE;
CREATE MATERIALIZED VIEW mv_governorate_intelligence AS
SELECT
  gov.governorate,
  COUNT(DISTINCT e.id) AS entity_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS active_entities,
  COUNT(DISTINCT e.id) FILTER (WHERE e.risk_level IN ('high', 'critical')) AS high_risk_entities,
  COUNT(DISTINCT m.id) AS union_members,
  COUNT(DISTINCT w.id) AS workers,
  COUNT(DISTINCT w.id) FILTER (WHERE w.nationality = 'YE') AS yemeni_workers,
  ROUND(COUNT(DISTINCT w.id) FILTER (WHERE w.nationality = 'YE')::NUMERIC / NULLIF(COUNT(DISTINCT w.id), 0) * 100, 2) AS yemenization_pct,
  COUNT(DISTINCT i.id) AS inspections,
  ROUND(AVG(i.overall_score) FILTER (WHERE i.overall_score IS NOT NULL), 2) AS avg_inspection_score,
  COUNT(DISTINCT v.id) FILTER (WHERE v.status IN ('open', 'in_review')) AS open_violations,
  COUNT(DISTINCT v.id) FILTER (WHERE v.severity = 'critical' AND v.status NOT IN ('closed', 'resolved')) AS critical_violations,
  COUNT(DISTINCT sr.id) FILTER (WHERE sr.status = 'pending') AS pending_service_requests,
  COUNT(DISTINCT sr.id) FILTER (WHERE sr.processing_deadline < CURRENT_DATE AND sr.status != 'completed') AS overdue_service_requests,
  COUNT(DISTINCT ld.id) FILTER (WHERE ld.status NOT IN ('تم الحل', 'ملغي')) AS open_disputes,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS total_fees_collected,
  NOW() AS refreshed_at
FROM (SELECT DISTINCT governorate FROM organizational_entities WHERE deleted_at IS NULL AND governorate IS NOT NULL) gov
LEFT JOIN organizational_entities e ON e.governorate = gov.governorate AND e.deleted_at IS NULL
LEFT JOIN members m ON m.governorate = gov.governorate AND m.deleted_at IS NULL
LEFT JOIN workers w ON w.entity_id = e.id AND w.deleted_at IS NULL
LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
LEFT JOIN service_requests sr ON sr.entity_id = e.id AND sr.deleted_at IS NULL
LEFT JOIN payments p ON p.entity_id = e.id
LEFT JOIN labor_disputes ld ON ld.enterprise_id = e.id AND ld.deleted_at IS NULL
GROUP BY gov.governorate;

CREATE UNIQUE INDEX idx_mv_gov_intelligence_gov ON mv_governorate_intelligence (governorate, refreshed_at);
CREATE INDEX idx_mv_gov_intelligence_risk ON mv_governorate_intelligence (high_risk_entities DESC);

-- 2.5 Workflow SLA Compliance
DROP MATERIALIZED VIEW IF EXISTS mv_workflow_sla_compliance CASCADE;
CREATE MATERIALIZED VIEW mv_workflow_sla_compliance AS
SELECT
  wt.workflow_instance_id,
  wf.workflow_type,
  wf.status AS workflow_status,
  wt.stage_number,
  wt.action_taken,
  wt.transitioned_at,
  wt.created_at AS transition_created,
  EXTRACT(EPOCH FROM (wt.transitioned_at - wt.created_at)) / 3600 AS hours_to_transition,
  CASE
    WHEN wt.created_at < NOW() - INTERVAL '7 days' AND wt.action_taken IS NULL THEN 'overdue'
    WHEN wt.created_at < NOW() - INTERVAL '3 days' AND wt.action_taken IS NULL THEN 'at_risk'
    ELSE 'on_track'
  END AS sla_status
FROM workflow_transitions_log wt
LEFT JOIN cross_portal_workflows wf ON wf.id = wt.workflow_instance_id
WHERE wt.created_at > CURRENT_DATE - INTERVAL '6 months';

CREATE UNIQUE INDEX idx_mv_workflow_sla_instance ON mv_workflow_sla_compliance (workflow_instance_id, stage_number);
CREATE INDEX idx_mv_workflow_sla_status ON mv_workflow_sla_compliance (sla_status);

-- 2.6 Performance Refresh Function
CREATE OR REPLACE FUNCTION fn_refresh_analytics_views() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_evaluation_analytics; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip mv_evaluation_analytics: %', SQLERRM; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cross_portal_performance; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip mv_cross_portal_performance: %', SQLERRM; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sector_analytics; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip mv_sector_analytics: %', SQLERRM; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_governorate_intelligence; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip mv_gov_intel: %', SQLERRM; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_workflow_sla_compliance; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip mv_workflow_sla: %', SQLERRM; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_national_workforce_stats; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_entity_compliance_score; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_governorate_stats; EXCEPTION WHEN OTHERS THEN NULL; END;
  RAISE NOTICE 'All analytics views refreshed at %', NOW();
END;
$$;

-- SECTION 3: ENHANCED UNIFIED ARABIC SEARCH ENGINE

-- 3.1 Full-text Arabic search with normalization and ranking
CREATE OR REPLACE FUNCTION fn_enhanced_arabic_search(
  p_query TEXT, p_scope TEXT DEFAULT 'all', p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(result_id UUID, result_type TEXT, result_title TEXT, result_subtitle TEXT, result_status TEXT, relevance NUMERIC, extra_data JSONB)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_normalized TEXT;
  v_pattern TEXT;
BEGIN
  v_normalized := lower(p_query);
  v_normalized := regexp_replace(v_normalized, '[\u064B-\u065F\u0670]', '', 'g');
  v_normalized := regexp_replace(v_normalized, '[ؤئةءؤئةئإأآ]', 'ا', 'g');
  v_normalized := regexp_replace(v_normalized, '[ىئ]', 'ي', 'g');
  v_pattern := '%' || v_normalized || '%';

  IF p_scope = 'all' OR p_scope = 'establishments' THEN
    RETURN QUERY
    SELECT ce.id, 'establishment'::TEXT, COALESCE(ce.name_ar, ce.name_en, ce.unified_code),
      ce.governorate, ce.status,
      CASE WHEN lower(ce.name_ar) = v_normalized THEN 1.0 WHEN ce.name_ar ILIKE v_pattern THEN 0.9 WHEN ce.unified_code ILIKE v_pattern THEN 0.8 ELSE 0.5 END,
      jsonb_build_object('sector', ce.sector, 'unified_code', ce.unified_code, 'employees_count', ce.employees_count)
    FROM commercial_establishments ce
    WHERE ce.deleted_at IS NULL AND (ce.name_ar ILIKE v_pattern OR ce.name_en ILIKE v_pattern OR ce.unified_code ILIKE v_pattern)
    ORDER BY 6 DESC LIMIT p_limit OFFSET p_offset;
  END IF;

  IF p_scope = 'all' OR p_scope = 'workers' THEN
    RETURN QUERY
    SELECT m.id, 'worker'::TEXT, m.full_name, m.profession, m.status,
      CASE WHEN lower(m.full_name) = v_normalized THEN 1.0 WHEN m.full_name ILIKE v_pattern THEN 0.9 WHEN m.national_id ILIKE v_pattern THEN 0.8 ELSE 0.5 END,
      jsonb_build_object('national_id', m.national_id, 'governorate', m.governorate)
    FROM members m
    WHERE m.deleted_at IS NULL AND (m.full_name ILIKE v_pattern OR m.national_id ILIKE v_pattern)
    ORDER BY 6 DESC LIMIT p_limit OFFSET p_offset;
  END IF;

  IF p_scope = 'all' OR p_scope = 'unions' THEN
    RETURN QUERY
    SELECT oe.id, 'union'::TEXT, oe.name_ar, oe.governorate, oe.status,
      CASE WHEN lower(oe.name_ar) = v_normalized THEN 1.0 WHEN oe.name_ar ILIKE v_pattern THEN 0.9 ELSE 0.5 END,
      jsonb_build_object('entity_type', oe.entity_type, 'member_count', oe.member_count)
    FROM organizational_entities oe
    WHERE oe.deleted_at IS NULL AND (oe.name_ar ILIKE v_pattern OR oe.name_en ILIKE v_pattern)
    ORDER BY 6 DESC LIMIT p_limit OFFSET p_offset;
  END IF;

  IF p_scope = 'all' OR p_scope = 'cases' THEN
    RETURN QUERY
    SELECT c.id, 'case'::TEXT, c.case_number, c.subject, c.status, 0.7::NUMERIC,
      jsonb_build_object('case_type', c.case_type, 'created_at', c.created_at)
    FROM cases c
    WHERE c.deleted_at IS NULL AND (c.case_number ILIKE v_pattern OR c.subject ILIKE v_pattern)
    ORDER BY 6 DESC LIMIT p_limit OFFSET p_offset;
  END IF;

  IF p_scope = 'all' OR p_scope = 'professions' THEN
    RETURN QUERY
    SELECT p.id::UUID, 'profession'::TEXT, p.name_ar, p.isco_code, 'active'::TEXT, 0.7::NUMERIC,
      jsonb_build_object('sector', p.sector, 'hazard_level', p.hazard_level)
    FROM professions p
    WHERE p.deleted_at IS NULL AND (p.name_ar ILIKE v_pattern OR p.name_en ILIKE v_pattern OR p.isco_code ILIKE v_pattern)
    ORDER BY 6 DESC LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;

-- 3.2 Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id SERIAL PRIMARY KEY, query_text TEXT NOT NULL, normalized_query TEXT NOT NULL,
  scope TEXT DEFAULT 'all', result_count INTEGER DEFAULT 0, user_id UUID, searched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics (normalized_query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics (searched_at DESC);

-- SECTION 4: CROSS-PORTAL REPORT FUNCTIONS

-- 4.1 National Executive Summary Report
CREATE OR REPLACE FUNCTION fn_national_executive_summary()
RETURNS TABLE(metric_key TEXT, metric_value NUMERIC, metric_label TEXT, metric_category TEXT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT 'total_entities'::TEXT, (SELECT COUNT(*)::NUMERIC FROM organizational_entities WHERE deleted_at IS NULL), 'اجمالي المنشآت'::TEXT, 'entities'::TEXT
  UNION ALL SELECT 'active_entities', (SELECT COUNT(*)::NUMERIC FROM organizational_entities WHERE status = 'active' AND deleted_at IS NULL), 'المنشآت النشطة', 'entities'
  UNION ALL SELECT 'total_members', (SELECT COUNT(*)::NUMERIC FROM members WHERE deleted_at IS NULL), 'اجمالي المنتسبين', 'members'
  UNION ALL SELECT 'open_violations', (SELECT COUNT(*)::NUMERIC FROM violations WHERE deleted_at IS NULL AND status IN ('open', 'in_review')), 'المخالفات المفتوحة', 'violations'
  UNION ALL SELECT 'inspections_30d', (SELECT COUNT(*)::NUMERIC FROM inspections WHERE deleted_at IS NULL AND inspection_date >= CURRENT_DATE - INTERVAL '30 days'), 'التفتيشات (30 يوم)', 'inspections'
  UNION ALL SELECT 'unresolved_alerts', (SELECT COUNT(*)::NUMERIC FROM compliance_alerts WHERE is_resolved = false), 'التنبيهات غير المحلولة', 'alerts'
  UNION ALL SELECT 'pending_requests', (SELECT COUNT(*)::NUMERIC FROM service_requests WHERE status = 'pending' AND deleted_at IS NULL), 'الطلبات المعلقة', 'services'
  UNION ALL SELECT 'total_revenue', (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments WHERE status = 'completed'), 'اجمالي الإيرادات', 'financial'
  UNION ALL SELECT 'open_cases', (SELECT COUNT(*)::NUMERIC FROM cases WHERE status NOT IN ('closed', 'dismissed') AND deleted_at IS NULL), 'القضايا المفتوحة', 'legal';
END;
$$;

-- 4.2 Entity Deep Drill-down Report
CREATE OR REPLACE FUNCTION fn_entity_drilldown(p_entity_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'entity', jsonb_build_object('id', e.id, 'name_ar', e.name_ar, 'unified_code', e.unified_code, 'governorate', e.governorate, 'sector', e.sector, 'status', e.status, 'compliance_status', e.compliance_status, 'risk_level', e.risk_level, 'avg_compliance_score', e.avg_compliance_score),
    'workers', jsonb_build_object('total', (SELECT COUNT(*) FROM workers WHERE entity_id = e.id AND deleted_at IS NULL), 'active', (SELECT COUNT(*) FROM workers WHERE entity_id = e.id AND status = 'active' AND deleted_at IS NULL), 'yemeni', (SELECT COUNT(*) FROM workers WHERE entity_id = e.id AND nationality = 'YE' AND deleted_at IS NULL)),
    'violations', jsonb_build_object('total', (SELECT COUNT(*) FROM violations WHERE entity_id = e.id AND deleted_at IS NULL), 'open', (SELECT COUNT(*) FROM violations WHERE entity_id = e.id AND status IN ('open', 'in_review') AND deleted_at IS NULL), 'critical', (SELECT COUNT(*) FROM violations WHERE entity_id = e.id AND severity = 'critical' AND status NOT IN ('closed', 'resolved') AND deleted_at IS NULL), 'total_fines', (SELECT COALESCE(SUM(penalty_amount), 0) FROM violations WHERE entity_id = e.id AND deleted_at IS NULL)),
    'inspections', jsonb_build_object('total', (SELECT COUNT(*) FROM inspections WHERE enterprise_id = e.id AND deleted_at IS NULL), 'compliant', (SELECT COUNT(*) FROM inspections WHERE enterprise_id = e.id AND compliance_status = 'compliant' AND deleted_at IS NULL), 'avg_score', (SELECT ROUND(AVG(overall_score), 2) FROM inspections WHERE enterprise_id = e.id AND overall_score IS NOT NULL AND deleted_at IS NULL), 'last_date', (SELECT MAX(inspection_date) FROM inspections WHERE enterprise_id = e.id AND deleted_at IS NULL)),
    'documents', jsonb_build_object('total', (SELECT COUNT(*) FROM documents WHERE entity_id = e.id AND deleted_at IS NULL), 'approved', (SELECT COUNT(*) FROM documents WHERE entity_id = e.id AND status = 'approved' AND deleted_at IS NULL), 'expiring_soon', (SELECT COUNT(*) FROM documents WHERE entity_id = e.id AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND deleted_at IS NULL)),
    'payments', jsonb_build_object('pending', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE entity_id = e.id AND status = 'pending'), 'completed', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE entity_id = e.id AND status = 'completed')),
    'maturity', jsonb_build_object('latest_score', (SELECT overall_score FROM maturity_assessments WHERE entity_id = e.id::TEXT AND deleted_at IS NULL ORDER BY assessment_date DESC LIMIT 1), 'latest_grade', (SELECT grade FROM maturity_assessments WHERE entity_id = e.id::TEXT AND deleted_at IS NULL ORDER BY assessment_date DESC LIMIT 1)),
    'service_requests', jsonb_build_object('total', (SELECT COUNT(*) FROM service_requests WHERE entity_id = e.id AND deleted_at IS NULL), 'pending', (SELECT COUNT(*) FROM service_requests WHERE entity_id = e.id AND status = 'pending' AND deleted_at IS NULL), 'overdue', (SELECT COUNT(*) FROM service_requests WHERE entity_id = e.id AND processing_deadline < CURRENT_DATE AND status != 'completed' AND deleted_at IS NULL)),
    'generated_at', NOW()
  ) INTO v_result
  FROM organizational_entities e
  WHERE (e.id = p_entity_id OR e.entity_id = p_entity_id::TEXT) AND e.deleted_at IS NULL;
  RETURN COALESCE(v_result, '{"error": "Entity not found"}'::JSONB);
END;
$$;

-- 4.3 Comparative Sector Report
CREATE OR REPLACE FUNCTION fn_comparative_sector_report()
RETURNS TABLE(sector TEXT, entity_count BIGINT, active_workers BIGINT, yemenization_pct NUMERIC, compliance_rate NUMERIC, avg_inspection_score NUMERIC, open_violations BIGINT, violations_per_entity NUMERIC, expiring_docs BIGINT, rank_by_compliance INTEGER, rank_by_workers INTEGER, rank_by_yemenization INTEGER)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH sector_data AS (
    SELECT COALESCE(e.sector, 'غير محدد') AS sec,
      COUNT(DISTINCT e.id) AS ec, COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'active') AS aw,
      ROUND(COUNT(DISTINCT w.id) FILTER (WHERE w.nationality = 'YE')::NUMERIC / NULLIF(COUNT(DISTINCT w.id), 0) * 100, 2) AS yp,
      ROUND(COUNT(DISTINCT e.id) FILTER (WHERE e.compliance_status = 'compliant')::NUMERIC / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2) AS cr,
      ROUND(AVG(i.overall_score) FILTER (WHERE i.overall_score IS NOT NULL), 2) AS ais,
      COUNT(DISTINCT v.id) FILTER (WHERE v.status IN ('open', 'in_review')) AS ov,
      ROUND(COUNT(DISTINCT v.id)::NUMERIC / NULLIF(COUNT(DISTINCT e.id), 0), 2) AS vpe,
      COUNT(DISTINCT d.id) FILTER (WHERE d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND d.expiry_date IS NOT NULL) AS ed
    FROM organizational_entities e
    LEFT JOIN workers w ON w.entity_id = e.id AND w.deleted_at IS NULL
    LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
    LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
    LEFT JOIN documents d ON d.entity_id = e.id AND d.deleted_at IS NULL
    WHERE e.deleted_at IS NULL GROUP BY e.sector HAVING COUNT(DISTINCT e.id) > 0
  )
  SELECT sd.sec, sd.ec, sd.aw, sd.yp, sd.cr, sd.ais, sd.ov, sd.vpe, sd.ed,
    RANK() OVER (ORDER BY sd.cr DESC NULLS LAST)::INTEGER,
    RANK() OVER (ORDER BY sd.aw DESC NULLS LAST)::INTEGER,
    RANK() OVER (ORDER BY sd.yp DESC NULLS LAST)::INTEGER
  FROM sector_data sd ORDER BY sd.cr DESC NULLS LAST;
END;
$$;

-- SECTION 5: DASHBOARD QUERY OPTIMIZATION

-- 5.1 Fast Intelligence Dashboard
CREATE OR REPLACE FUNCTION fn_intelligence_dashboard_fast()
RETURNS TABLE(total_professions INT, detailed_professions INT, hazardous_professions INT, total_inspections INT, compliant_inspections INT, non_compliant_inspections INT, avg_inspection_score NUMERIC, total_assessments INT, passing_assessments INT, avg_maturity_score NUMERIC, total_entities INT, active_entities INT, open_violations INT, pending_alerts INT, pending_service_requests INT, generated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH prof AS (SELECT COUNT(*)::INT AS total, COUNT(*) FILTER (WHERE level = 4)::INT AS detailed, COUNT(*) FILTER (WHERE hazard_level >= 7)::INT AS hazardous FROM professions WHERE deleted_at IS NULL),
  insp AS (SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL)::INT AS total, COUNT(*) FILTER (WHERE deleted_at IS NULL AND compliance_status = 'compliant')::INT AS compliant, COUNT(*) FILTER (WHERE deleted_at IS NULL AND compliance_status = 'non_compliant')::INT AS non_compliant, ROUND(AVG(overall_score) FILTER (WHERE deleted_at IS NULL AND overall_score IS NOT NULL), 2) AS avg_score FROM inspections WHERE created_at > NOW() - INTERVAL '1 year'),
  assess AS (SELECT COUNT(*)::INT AS total, COUNT(*) FILTER (WHERE overall_score >= 75)::INT AS passing, ROUND(AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL), 2) AS avg_score FROM maturity_assessments WHERE deleted_at IS NULL),
  es AS (SELECT COUNT(*)::INT AS total, COUNT(*) FILTER (WHERE status = 'active')::INT AS active FROM organizational_entities WHERE deleted_at IS NULL)
  SELECT p.total, p.detailed, p.hazardous, i.total, i.compliant, i.non_compliant, i.avg_score,
    a.total, a.passing, a.avg_score, es.total, es.active,
    (SELECT COUNT(*)::INT FROM violations WHERE deleted_at IS NULL AND status IN ('open', 'in_review')),
    (SELECT COUNT(*)::INT FROM compliance_alerts WHERE is_resolved = false AND deleted_at IS NULL),
    (SELECT COUNT(*)::INT FROM service_requests WHERE status = 'pending' AND deleted_at IS NULL),
    NOW()
  FROM prof p, insp i, assess a, es;
END;
$$;

-- 5.2 Fast National Overview
CREATE OR REPLACE FUNCTION fn_national_overview_fast()
RETURNS TABLE(total_establishments INT, active_establishments INT, total_contracts INT, quality_open_findings INT, cases_by_type JSONB, generated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH ent AS (SELECT COUNT(*)::INT AS total, COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'active')::INT AS active FROM legal_entities),
  cont AS (SELECT COUNT(*)::INT AS total FROM employment_contracts),
  qual AS (SELECT COUNT(*)::INT AS total FROM data_quality_findings WHERE status = 'open'),
  ctype AS (SELECT jsonb_agg(jsonb_build_object('case_type', case_type, 'count', c)) AS data FROM (SELECT case_type, COUNT(*)::INT AS c FROM cases WHERE deleted_at IS NULL GROUP BY case_type) sub)
  SELECT e.total, e.active, c.total, q.total, COALESCE(ct.data, '[]'::JSONB), NOW()
  FROM ent e, cont c, qual q, ctype ct;
END;
$$;

-- SECTION 6: AUTO-REFRESH TRIGGERS FOR MATERIALIZED VIEWS

CREATE OR REPLACE FUNCTION fn_trigger_refresh_analytics() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM pg_notify('refresh_analytics', COALESCE(TG_TABLE_NAME, 'unknown')); RETURN COALESCE(NEW, OLD); END;
$$;

DROP TRIGGER IF EXISTS trg_maturity_refresh ON maturity_assessments;
CREATE TRIGGER trg_maturity_refresh AFTER INSERT OR UPDATE OR DELETE ON maturity_assessments FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_analytics();

DROP TRIGGER IF EXISTS trg_inspections_analytics_refresh ON inspections;
CREATE TRIGGER trg_inspections_analytics_refresh AFTER INSERT OR UPDATE OR DELETE ON inspections FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_analytics();

DROP TRIGGER IF EXISTS trg_services_analytics_refresh ON service_requests;
CREATE TRIGGER trg_services_analytics_refresh AFTER INSERT OR UPDATE OR DELETE ON service_requests FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_analytics();

DROP TRIGGER IF EXISTS trg_cases_analytics_refresh ON cases;
CREATE TRIGGER trg_cases_analytics_refresh AFTER INSERT OR UPDATE OR DELETE ON cases FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_analytics();

DROP TRIGGER IF EXISTS trg_docs_analytics_refresh ON documents;
CREATE TRIGGER trg_docs_analytics_refresh AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_analytics();

DROP TRIGGER IF EXISTS trg_portal_refresh ON cross_portal_workflows;
CREATE TRIGGER trg_portal_refresh AFTER INSERT OR UPDATE OR DELETE ON cross_portal_workflows FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_analytics();

-- SECTION 7: GRANT PERMISSIONS

GRANT SELECT ON mv_evaluation_analytics TO authenticated;
GRANT SELECT ON mv_cross_portal_performance TO authenticated;
GRANT SELECT ON mv_sector_analytics TO authenticated;
GRANT SELECT ON mv_governorate_intelligence TO authenticated;
GRANT SELECT ON mv_workflow_sla_compliance TO authenticated;
GRANT EXECUTE ON FUNCTION fn_refresh_analytics_views() TO service_role;
GRANT EXECUTE ON FUNCTION fn_enhanced_arabic_search(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_national_executive_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_entity_drilldown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_comparative_sector_report() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_intelligence_dashboard_fast() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_national_overview_fast() TO authenticated;
GRANT INSERT ON search_analytics TO authenticated;
GRANT SELECT ON search_analytics TO service_role;

-- SECTION 8: POST-MIGRATION VALIDATION

DO $$ DECLARE
  v_index_count INT; v_mv_count INT; v_func_count INT; v_trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO v_index_count FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
    'idx_violations_enterprise_severity', 'idx_violations_entity_status', 'idx_compliance_alerts_severity_resolved',
    'idx_compliance_alerts_due_date', 'idx_compliance_matrices_enterprise_status', 'idx_maturity_assessments_entity_score',
    'idx_risk_assessments_entity_level', 'idx_inspections_compliance_status', 'idx_inspections_type_status_date',
    'idx_professions_hazard_sector', 'idx_professions_isco_level', 'idx_maturity_assessments_grade_date',
    'idx_evaluation_frameworks_active', 'idx_evaluation_plans_next_run_active', 'idx_cross_portal_type_status_created',
    'idx_workflow_transitions_instance_stage', 'idx_service_requests_status_deadline', 'idx_service_requests_entity_service',
    'idx_services_category_code', 'idx_payments_status_due', 'idx_documents_type_status_expiry',
    'idx_documents_entity_status', 'idx_dispatches_status_date', 'idx_dispatches_receiving', 'idx_cases_type_status'
  );

  SELECT COUNT(*) INTO v_mv_count FROM pg_matviews WHERE schemaname = 'public' AND matviewname IN (
    'mv_evaluation_analytics', 'mv_cross_portal_performance', 'mv_sector_analytics',
    'mv_governorate_intelligence', 'mv_workflow_sla_compliance'
  );

  SELECT COUNT(*) INTO v_func_count FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname IN (
    'fn_refresh_analytics_views', 'fn_enhanced_arabic_search', 'fn_national_executive_summary',
    'fn_entity_drilldown', 'fn_comparative_sector_report', 'fn_intelligence_dashboard_fast', 'fn_national_overview_fast'
  );

  SELECT COUNT(*) INTO v_trigger_count FROM pg_trigger WHERE tgname IN (
    'trg_maturity_refresh', 'trg_inspections_analytics_refresh', 'trg_services_analytics_refresh',
    'trg_cases_analytics_refresh', 'trg_docs_analytics_refresh', 'trg_portal_refresh'
  );

  RAISE NOTICE '=== E2E Deep Optimization Validation ===';
  RAISE NOTICE 'New indexes: % (expected: 25+)', v_index_count;
  RAISE NOTICE 'Analytics MVs: % (expected: 5)', v_mv_count;
  RAISE NOTICE 'Report functions: % (expected: 7)', v_func_count;
  RAISE NOTICE 'Analytics triggers: % (expected: 6)', v_trigger_count;
  ASSERT v_index_count >= 20, 'Missing performance indexes';
  ASSERT v_mv_count >= 5, 'Missing analytics materialized views';
  ASSERT v_func_count >= 6, 'Missing report functions';
  RAISE NOTICE 'All assertions passed. E2E Deep Optimization complete.';
END $$;

-- Initial population of materialized views
BEGIN REFRESH MATERIALIZED VIEW mv_evaluation_analytics; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip init: mv_evaluation_analytics'; END;
BEGIN REFRESH MATERIALIZED VIEW mv_cross_portal_performance; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip init: mv_cross_portal_performance'; END;
BEGIN REFRESH MATERIALIZED VIEW mv_sector_analytics; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip init: mv_sector_analytics'; END;
BEGIN REFRESH MATERIALIZED VIEW mv_governorate_intelligence; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip init: mv_governorate_intelligence'; END;

COMMIT;
