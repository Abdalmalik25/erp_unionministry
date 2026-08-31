-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Performance Indexes + Materialized Views
-- Yemen National Labor Platform — Performance Excellence Phase
-- ═══════════════════════════════════════════════════════════════════════
-- Date: 2026-08-30
-- Purpose: Add critical composite indexes and analytical materialized
--          views to achieve sub-100ms query performance on dashboards
--          and reporting pages.
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;
-- ─────────────────────────────────────────────────────────────────────
-- 1. COMPOSITE INDEXES — for the most common query patterns
-- ─────────────────────────────────────────────────────────────────────
-- Workforces by status + governorate (used in workforce dashboard)
CREATE INDEX IF NOT EXISTS idx_workforce_status_gov ON workers (status, governorate)
WHERE deleted_at IS NULL;
-- Active contracts by entity + date range (for compliance checks)
CREATE INDEX IF NOT EXISTS idx_contracts_entity_active ON contracts (entity_id, start_date DESC, end_date)
WHERE status = 'active'
    AND deleted_at IS NULL;
-- Recent inspections (for inspection dashboard)
CREATE INDEX IF NOT EXISTS idx_inspections_recent ON inspections (inspection_date DESC, entity_id, inspector_id)
WHERE deleted_at IS NULL;
-- Open violations by severity (for alerts dashboard)
CREATE INDEX IF NOT EXISTS idx_violations_open_severity ON violations (severity, detected_date DESC)
WHERE status IN ('open', 'in_review');
-- Documents expiring soon (for proactive alerts)
CREATE INDEX IF NOT EXISTS idx_documents_expiring ON documents (expiry_date)
WHERE expiry_date IS NOT NULL
    AND expiry_date > CURRENT_DATE
    AND expiry_date < CURRENT_DATE + INTERVAL '90 days'
    AND deleted_at IS NULL;
-- Audit log by user + date (for user activity reports)
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_log (user_id, created_at DESC);
-- Audit log by resource (for entity history)
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log (resource, resource_id, created_at DESC);
-- Users by role + status (for user management)
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, status)
WHERE deleted_at IS NULL;
-- Notifications unread by user (for notification badge)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, created_at DESC)
WHERE read_at IS NULL;
-- Cases by workflow status + SLA (for workflow dashboard)
CREATE INDEX IF NOT EXISTS idx_cases_workflow_sla ON workflow_cases (status, sla_due_date)
WHERE status NOT IN ('closed', 'rejected');
-- Payments by entity + status (for finance dashboard)
CREATE INDEX IF NOT EXISTS idx_payments_entity_status ON payments (entity_id, status, due_date DESC);
-- Union members by union + status (for member management)
CREATE INDEX IF NOT EXISTS idx_union_members_active ON union_members (union_id, status, joined_date DESC)
WHERE deleted_at IS NULL;
-- Workers by profession (for profession statistics)
CREATE INDEX IF NOT EXISTS idx_workers_profession ON workers (profession_code, governorate)
WHERE deleted_at IS NULL;
-- Entities by ISIC + status (for commercial registry)
CREATE INDEX IF NOT EXISTS idx_entities_isic_status ON entities (isic_code, status)
WHERE deleted_at IS NULL;
-- Licenses by type + expiry (for license management)
CREATE INDEX IF NOT EXISTS idx_licenses_type_expiry ON licenses (license_type, expiry_date)
WHERE status = 'active'
    AND deleted_at IS NULL;
-- Training records by worker + date (for worker history)
CREATE INDEX IF NOT EXISTS idx_training_worker_date ON training_records (worker_id, completion_date DESC);
-- ─────────────────────────────────────────────────────────────────────
-- 2. MATERIALIZED VIEWS — for analytical dashboards
-- ─────────────────────────────────────────────────────────────────────
-- 2.1 National Workforce Statistics (refreshed hourly)
DROP MATERIALIZED VIEW IF EXISTS mv_national_workforce_stats CASCADE;
CREATE MATERIALIZED VIEW mv_national_workforce_stats AS
SELECT COUNT(*) AS total_workers,
    COUNT(*) FILTER (
        WHERE status = 'active'
    ) AS active_workers,
    COUNT(*) FILTER (
        WHERE status = 'inactive'
    ) AS inactive_workers,
    COUNT(DISTINCT governorate) AS governorates_covered,
    COUNT(DISTINCT profession_code) AS professions_represented,
    COUNT(DISTINCT entity_id) AS entities_employing,
    ROUND(
        (
            COUNT(*) FILTER (
                WHERE nationality = 'YE'
            )::NUMERIC / NULLIF(COUNT(*), 0)
        ) * 100,
        2
    ) AS yemenization_pct,
    NOW() AS refreshed_at
FROM workers
WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_mv_national_workforce ON mv_national_workforce_stats (refreshed_at);
-- 2.2 Entity Compliance Score (refreshed daily)
DROP MATERIALIZED VIEW IF EXISTS mv_entity_compliance_score CASCADE;
CREATE MATERIALIZED VIEW mv_entity_compliance_score AS
SELECT e.id AS entity_id,
    e.commercial_name,
    e.governorate,
    e.isic_code,
    e.status,
    -- Active workers
    COALESCE(
        (
            SELECT COUNT(*)
            FROM workers w
            WHERE w.entity_id = e.id
                AND w.status = 'active'
                AND w.deleted_at IS NULL
        ),
        0
    ) AS active_workers,
    -- Open violations count
    COALESCE(
        (
            SELECT COUNT(*)
            FROM violations v
            WHERE v.entity_id = e.id
                AND v.status IN ('open', 'in_review')
        ),
        0
    ) AS open_violations,
    -- Critical violations count
    COALESCE(
        (
            SELECT COUNT(*)
            FROM violations v
            WHERE v.entity_id = e.id
                AND v.severity = 'critical'
                AND v.status NOT IN ('closed', 'resolved')
        ),
        0
    ) AS critical_violations,
    -- Pending fees
    COALESCE(
        (
            SELECT SUM(amount)
            FROM payments p
            WHERE p.entity_id = e.id
                AND p.status = 'pending'
        ),
        0
    ) AS pending_fees,
    -- Yemenization rate
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM workers w
            WHERE w.entity_id = e.id
                AND w.deleted_at IS NULL
        ) > 0 THEN ROUND(
            (
                SELECT COUNT(*)
                FROM workers w
                WHERE w.entity_id = e.id
                    AND w.nationality = 'YE'
                    AND w.deleted_at IS NULL
            )::NUMERIC / (
                SELECT COUNT(*)
                FROM workers w
                WHERE w.entity_id = e.id
                    AND w.deleted_at IS NULL
            )::NUMERIC * 100,
            2
        )
        ELSE 0
    END AS yemenization_pct,
    -- Compliance score (weighted)
    GREATEST(
        0,
        LEAST(
            100,
            100 -- Deduct for critical violations (-15 each)
            - (
                COALESCE(
                    (
                        SELECT COUNT(*)
                        FROM violations v
                        WHERE v.entity_id = e.id
                            AND v.severity = 'critical'
                            AND v.status NOT IN ('closed', 'resolved')
                    ),
                    0
                ) * 15
            ) -- Deduct for open violations (-5 each)
            - (
                COALESCE(
                    (
                        SELECT COUNT(*)
                        FROM violations v
                        WHERE v.entity_id = e.id
                            AND v.status IN ('open', 'in_review')
                    ),
                    0
                ) * 5
            ) -- Deduct for pending fees (-10)
            - (
                CASE
                    WHEN COALESCE(
                        (
                            SELECT SUM(amount)
                            FROM payments p
                            WHERE p.entity_id = e.id
                                AND p.status = 'pending'
                        ),
                        0
                    ) > 0 THEN 10
                    ELSE 0
                END
            ) -- Bonus for high Yemenization
            + (
                CASE
                    WHEN (
                        SELECT ROUND(
                                (
                                    SELECT COUNT(*)
                                    FROM workers w
                                    WHERE w.entity_id = e.id
                                        AND w.nationality = 'YE'
                                        AND w.deleted_at IS NULL
                                )::NUMERIC / NULLIF(
                                    (
                                        SELECT COUNT(*)
                                        FROM workers w
                                        WHERE w.entity_id = e.id
                                            AND w.deleted_at IS NULL
                                    ),
                                    0
                                )::NUMERIC * 100,
                                2
                            )
                    ) >= 80 THEN 5
                    ELSE 0
                END
            )
        )
    ) AS compliance_score,
    NOW() AS refreshed_at
FROM entities e
WHERE e.deleted_at IS NULL;
CREATE UNIQUE INDEX idx_mv_entity_compliance ON mv_entity_compliance_score (entity_id, refreshed_at);
CREATE INDEX idx_mv_entity_compliance_score ON mv_entity_compliance_score (compliance_score DESC);
CREATE INDEX idx_mv_entity_compliance_gov ON mv_entity_compliance_score (governorate, compliance_score DESC);
-- 2.3 Governorate Statistics (for geographical dashboard)
DROP MATERIALIZED VIEW IF EXISTS mv_governorate_stats CASCADE;
CREATE MATERIALIZED VIEW mv_governorate_stats AS
SELECT COALESCE(e.governorate, 'غير محدد') AS governorate,
    COUNT(DISTINCT e.id) AS entity_count,
    COUNT(DISTINCT w.id) AS worker_count,
    COUNT(DISTINCT w.id) FILTER (
        WHERE w.status = 'active'
    ) AS active_worker_count,
    COUNT(DISTINCT w.id) FILTER (
        WHERE w.nationality = 'YE'
    ) AS national_worker_count,
    COUNT(DISTINCT u.id) AS union_count,
    COUNT(DISTINCT c.id) AS active_contract_count,
    COUNT(DISTINCT v.id) FILTER (
        WHERE v.status IN ('open', 'in_review')
    ) AS open_violation_count,
    ROUND(
        (
            COUNT(DISTINCT w.id) FILTER (
                WHERE w.nationality = 'YE'
            )::NUMERIC / NULLIF(COUNT(DISTINCT w.id), 0)
        ) * 100,
        2
    ) AS yemenization_pct,
    ROUND(AVG(ecs.compliance_score), 2) AS avg_compliance_score,
    NOW() AS refreshed_at
FROM (
        SELECT DISTINCT governorate
        FROM entities
        WHERE deleted_at IS NULL
    ) g
    LEFT JOIN entities e ON e.governorate = g.governorate
    AND e.deleted_at IS NULL
    LEFT JOIN workers w ON w.entity_id = e.id
    AND w.deleted_at IS NULL
    LEFT JOIN unions u ON u.governorate = g.governorate
    AND u.deleted_at IS NULL
    LEFT JOIN contracts c ON c.entity_id = e.id
    AND c.status = 'active'
    AND c.deleted_at IS NULL
    LEFT JOIN violations v ON v.entity_id = e.id
    LEFT JOIN mv_entity_compliance_score ecs ON ecs.entity_id = e.id
GROUP BY g.governorate;
CREATE UNIQUE INDEX idx_mv_governorate_stats ON mv_governorate_stats (governorate, refreshed_at);
-- 2.4 Monthly Activity Summary (for trend analysis)
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_activity CASCADE;
CREATE MATERIALIZED VIEW mv_monthly_activity AS
SELECT DATE_TRUNC('month', activity_date) AS month,
    activity_type,
    COUNT(*) AS activity_count,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT entity_id) AS entities_involved
FROM activity_log
WHERE activity_date >= CURRENT_DATE - INTERVAL '24 months'
    AND deleted_at IS NULL
GROUP BY DATE_TRUNC('month', activity_date),
    activity_type;
CREATE UNIQUE INDEX idx_mv_monthly_activity ON mv_monthly_activity (month, activity_type);
-- 2.5 Inspection Performance (for inspector performance dashboard)
DROP MATERIALIZED VIEW IF EXISTS mv_inspector_performance CASCADE;
CREATE MATERIALIZED VIEW mv_inspector_performance AS
SELECT u.id AS inspector_id,
    u.full_name,
    u.governorate,
    COUNT(i.id) AS total_inspections,
    COUNT(i.id) FILTER (
        WHERE i.status = 'completed'
    ) AS completed_inspections,
    COUNT(i.id) FILTER (
        WHERE i.status = 'scheduled'
    ) AS scheduled_inspections,
    COUNT(DISTINCT v.id) AS violations_filed,
    COUNT(DISTINCT v.id) FILTER (
        WHERE v.severity = 'critical'
    ) AS critical_violations_filed,
    AVG(
        EXTRACT(
            EPOCH
            FROM (i.completion_date - i.inspection_date)
        ) / 3600
    )::NUMERIC(10, 2) AS avg_completion_hours,
    ROUND(
        (
            COUNT(i.id) FILTER (
                WHERE i.status = 'completed'
            )::NUMERIC / NULLIF(COUNT(i.id), 0)
        ) * 100,
        2
    ) AS completion_rate_pct,
    NOW() AS refreshed_at
FROM users u
    LEFT JOIN inspections i ON i.inspector_id = u.id
    AND i.deleted_at IS NULL
    LEFT JOIN violations v ON v.inspection_id = i.id
WHERE u.role IN (
        'inspector',
        'senior_inspector',
        'ministry_admin'
    )
    AND u.deleted_at IS NULL
GROUP BY u.id,
    u.full_name,
    u.governorate;
CREATE UNIQUE INDEX idx_mv_inspector_perf ON mv_inspector_performance (inspector_id, refreshed_at);
CREATE INDEX idx_mv_inspector_perf_rate ON mv_inspector_performance (completion_rate_pct DESC);
-- ─────────────────────────────────────────────────────────────────────
-- 3. REFRESH FUNCTIONS — with CONCURRENTLY for non-blocking refresh
-- ─────────────────────────────────────────────────────────────────────
-- Refresh all materialized views (called by cron hourly)
CREATE OR REPLACE FUNCTION fn_refresh_all_materialized_views() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RAISE NOTICE 'Refreshing mv_national_workforce_stats...';
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_national_workforce_stats;
RAISE NOTICE 'Refreshing mv_entity_compliance_score...';
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_entity_compliance_score;
RAISE NOTICE 'Refreshing mv_governorate_stats...';
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_governorate_stats;
RAISE NOTICE 'Refreshing mv_monthly_activity...';
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_activity;
RAISE NOTICE 'Refreshing mv_inspector_performance...';
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inspector_performance;
RAISE NOTICE 'All materialized views refreshed at %',
NOW();
END;
$$;
-- Single MV refresh (for targeted refresh)
CREATE OR REPLACE FUNCTION fn_refresh_materialized_view(view_name TEXT) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN CASE
        view_name
        WHEN 'mv_national_workforce_stats' THEN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_national_workforce_stats;
WHEN 'mv_entity_compliance_score' THEN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_entity_compliance_score;
WHEN 'mv_governorate_stats' THEN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_governorate_stats;
WHEN 'mv_monthly_activity' THEN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_activity;
WHEN 'mv_inspector_performance' THEN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inspector_performance;
ELSE RAISE EXCEPTION 'Unknown materialized view: %',
view_name;
END CASE
;
RAISE NOTICE 'Refreshed % at %',
view_name,
NOW();
END;
$$;
-- ─────────────────────────────────────────────────────────────────────
-- 4. TRIGGER — auto-refresh critical MV on data change
-- ─────────────────────────────────────────────────────────────────────
-- Refresh workforce stats when workers change
CREATE OR REPLACE FUNCTION fn_trigger_refresh_workforce_stats() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN -- Schedule refresh via pg_notify (non-blocking)
    PERFORM pg_notify('refresh_mv', 'mv_national_workforce_stats');
RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_workers_refresh_mv ON workers;
CREATE TRIGGER trg_workers_refresh_mv
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON workers FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_workforce_stats();
-- Refresh entity compliance when violations or workers change
CREATE OR REPLACE FUNCTION fn_trigger_refresh_compliance() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_notify('refresh_mv', 'mv_entity_compliance_score');
RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_violations_refresh_mv ON violations;
CREATE TRIGGER trg_violations_refresh_mv
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON violations FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_compliance();
DROP TRIGGER IF EXISTS trg_payments_refresh_mv ON payments;
CREATE TRIGGER trg_payments_refresh_mv
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON payments FOR EACH STATEMENT EXECUTE FUNCTION fn_trigger_refresh_compliance();
-- ─────────────────────────────────────────────────────────────────────
-- 5. GRANT PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────
-- Grant read on materialized views to authenticated
GRANT SELECT ON mv_national_workforce_stats TO authenticated;
GRANT SELECT ON mv_entity_compliance_score TO authenticated;
GRANT SELECT ON mv_governorate_stats TO authenticated;
GRANT SELECT ON mv_monthly_activity TO authenticated;
GRANT SELECT ON mv_inspector_performance TO authenticated;
-- Grant execute on refresh functions to service role
GRANT EXECUTE ON FUNCTION fn_refresh_all_materialized_views() TO service_role;
GRANT EXECUTE ON FUNCTION fn_refresh_materialized_view(TEXT) TO service_role;
-- ─────────────────────────────────────────────────────────────────────
-- 6. POST-MIGRATION VALIDATION
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_index_count INTEGER;
v_mv_count INTEGER;
v_function_count INTEGER;
v_trigger_count INTEGER;
BEGIN -- Count new indexes
SELECT COUNT(*) INTO v_index_count
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname IN (
        'idx_workforce_status_gov',
        'idx_contracts_entity_active',
        'idx_inspections_recent',
        'idx_violations_open_severity',
        'idx_documents_expiring',
        'idx_audit_user_date',
        'idx_audit_resource',
        'idx_users_role_active',
        'idx_notifications_user_unread',
        'idx_cases_workflow_sla',
        'idx_payments_entity_status',
        'idx_union_members_active',
        'idx_workers_profession',
        'idx_entities_isic_status',
        'idx_licenses_type_expiry',
        'idx_training_worker_date'
    );
-- Count materialized views
SELECT COUNT(*) INTO v_mv_count
FROM pg_matviews
WHERE schemaname = 'public'
    AND matviewname IN (
        'mv_national_workforce_stats',
        'mv_entity_compliance_score',
        'mv_governorate_stats',
        'mv_monthly_activity',
        'mv_inspector_performance'
    );
-- Count functions
SELECT COUNT(*) INTO v_function_count
FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'fn_refresh_all_materialized_views',
        'fn_refresh_materialized_view',
        'fn_trigger_refresh_workforce_stats',
        'fn_trigger_refresh_compliance'
    );
-- Count triggers
SELECT COUNT(*) INTO v_trigger_count
FROM pg_trigger
WHERE tgname IN (
        'trg_workers_refresh_mv',
        'trg_violations_refresh_mv',
        'trg_payments_refresh_mv'
    );
RAISE NOTICE '═══ Migration Validation ═══';
RAISE NOTICE 'Composite indexes created: % (expected: 16)',
v_index_count;
RAISE NOTICE 'Materialized views created: % (expected: 5)',
v_mv_count;
RAISE NOTICE 'Helper functions created: % (expected: 4)',
v_function_count;
RAISE NOTICE 'Refresh triggers created: % (expected: 3)',
v_trigger_count;
-- Assertions
ASSERT v_index_count >= 16,
'Missing composite indexes';
ASSERT v_mv_count = 5,
'Missing materialized views';
ASSERT v_function_count >= 4,
'Missing helper functions';
ASSERT v_trigger_count >= 3,
'Missing refresh triggers';
RAISE NOTICE '✅ All assertions passed. Migration is complete.';
END $$;
-- Initial population of materialized views
SELECT fn_refresh_all_materialized_views();
COMMIT;
-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT (run manually if needed)
-- ═══════════════════════════════════════════════════════════════════════
-- BEGIN;
--   DROP TRIGGER IF EXISTS trg_workers_refresh_mv ON workers;
--   DROP TRIGGER IF EXISTS trg_violations_refresh_mv ON violations;
--   DROP TRIGGER IF EXISTS trg_payments_refresh_mv ON payments;
--   DROP FUNCTION IF EXISTS fn_trigger_refresh_workforce_stats();
--   DROP FUNCTION IF EXISTS fn_trigger_refresh_compliance();
--   DROP FUNCTION IF EXISTS fn_refresh_all_materialized_views();
--   DROP FUNCTION IF EXISTS fn_refresh_materialized_view(TEXT);
--   DROP MATERIALIZED VIEW IF EXISTS mv_inspector_performance CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS mv_monthly_activity CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS mv_governorate_stats CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS mv_entity_compliance_score CASCADE;
--   DROP MATERIALIZED VIEW IF EXISTS mv_national_workforce_stats CASCADE;
--   DROP INDEX IF EXISTS idx_workforce_status_gov;
--   DROP INDEX IF EXISTS idx_contracts_entity_active;
--   DROP INDEX IF EXISTS idx_inspections_recent;
--   DROP INDEX IF EXISTS idx_violations_open_severity;
--   DROP INDEX IF EXISTS idx_documents_expiring;
--   DROP INDEX IF EXISTS idx_audit_user_date;
--   DROP INDEX IF EXISTS idx_audit_resource;
--   DROP INDEX IF EXISTS idx_users_role_active;
--   DROP INDEX IF EXISTS idx_notifications_user_unread;
--   DROP INDEX IF EXISTS idx_cases_workflow_sla;
--   DROP INDEX IF EXISTS idx_payments_entity_status;
--   DROP INDEX IF EXISTS idx_union_members_active;
--   DROP INDEX IF EXISTS idx_workers_profession;
--   DROP INDEX IF EXISTS idx_entities_isic_status;
--   DROP INDEX IF EXISTS idx_licenses_type_expiry;
--   DROP INDEX IF EXISTS idx_training_worker_date;
-- COMMIT;
-- ═══════════════════════════════════════════════════════════════════════