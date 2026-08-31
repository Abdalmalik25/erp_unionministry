-- =============================================================================
-- Migration: 20260830_04_telemetry_client_errors
-- =============================================================================
-- Name:    نظام تتبع أخطاء العميل وإحصائيات الأداء (Web Vitals)
-- Purpose:يلتقط الأخطاء من errorTracker.ts ويحلل Core Web Vitals
--          ويدعم ربط الأخطاء بـ correlationId لسهولة التتبع
-- Author:  UnionSphere Engineering Team
-- Date:    2026-08-30
-- Version: 1.0.0
-- =============================================================================
-- Migration Strategy: ZERO-DOWNTIME
-- - All operations use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- - No data migration required (new tables)
-- - Rollback: DROP statements at bottom (commented)
-- =============================================================================
BEGIN;
-- ============================================================================
-- SECTION 1: TABLES
-- ============================================================================
-- ----------------------------------------------------------------------------
-- Table: client_error_log
-- Purpose: يلتقط دفعات أخطاء من errorTracker.ts (client-side)
-- Retention: 30 days (auto-cleanup via partition or manual vacuum)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_error_log (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    source VARCHAR(32) NOT NULL DEFAULT 'manual',
    severity VARCHAR(16) NOT NULL DEFAULT 'error' CHECK (
        severity IN ('fatal', 'error', 'warning', 'info')
    ),
    message TEXT NOT NULL,
    url VARCHAR(2048),
    user_agent VARCHAR(512),
    stack TEXT,
    context JSONB,
    correlation_id VARCHAR(64),
    user_id VARCHAR(64),
    session_id VARCHAR(64),
    count INTEGER NOT NULL DEFAULT 1,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Unique constraint: upsert on duplicate id (dedup from client batches)
-- (handled by ON CONFLICT in INSERT)
COMMENT ON TABLE client_error_log IS 'يلتقط أخطاء الواجهة من errorTracker.ts — مفهرسة بـ severity/source/correlation_id/last_seen';
COMMENT ON COLUMN client_error_log.correlation_id IS 'x-correlation-id من الطلب الأصلي — يربط خطأ العميل بسجل الخادم في audit_log';
COMMENT ON COLUMN client_error_log.count IS 'عدد مرات تكرار نفس الخطأ (deduplication من جهة العميل)';
-- ----------------------------------------------------------------------------
-- Table: client_vitals_log
-- Purpose: سجل Core Web Vitals من المتصفحات (LCP/CLS/FID/TTFB/INP)
-- Source: PerformanceObserver API via errorTracker.ts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_vitals_log (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(64),
    session_id VARCHAR(64),
    metric_name VARCHAR(32) NOT NULL CHECK (
        metric_name IN ('LCP', 'CLS', 'FID', 'FCP', 'TTFB', 'INP', 'LS')
    ),
    metric_value NUMERIC(10, 3) NOT NULL,
    metric_rating VARCHAR(16) CHECK (
        metric_rating IN ('good', 'needs-improvement', 'poor')
    ),
    url VARCHAR(2048),
    user_agent VARCHAR(512),
    correlation_id VARCHAR(64),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE client_vitals_log IS 'سجل Core Web Vitals من المتصفحات — يُستخدم لتحليل أداء المستخدم الحقيقي';
COMMENT ON COLUMN client_vitals_log.metric_rating IS 'تصنيف Google: good (أخضر), needs-improvement (أصفر), poor (أحمر)';
-- ============================================================================
-- SECTION 2: INDEXES — Performance-critical query patterns
-- ============================================================================
-- Analytical queries: top errors in last 24h by severity
CREATE INDEX IF NOT EXISTS idx_cel_last_seen ON client_error_log (last_seen DESC);
-- Filter by severity (fatal errors require immediate attention)
CREATE INDEX IF NOT EXISTS idx_cel_severity ON client_error_log (severity, last_seen DESC);
-- Filter by source (identify which subsystem is most error-prone)
CREATE INDEX IF NOT EXISTS idx_cel_source ON client_error_log (source, last_seen DESC);
-- Link errors to server-side audit via correlation_id
CREATE INDEX IF NOT EXISTS idx_cel_correlation_id ON client_error_log (correlation_id)
WHERE correlation_id IS NOT NULL;
-- Find all errors for a specific user
CREATE INDEX IF NOT EXISTS idx_cel_user_id ON client_error_log (user_id, last_seen DESC)
WHERE user_id IS NOT NULL;
-- Unique dedup: prevent duplicate inserts from multiple flush attempts
CREATE INDEX IF NOT EXISTS idx_cel_id_unique ON client_error_log (id)
WHERE COUNT(*) OVER (PARTITION BY id) > 1;
-- partial index for uniqueness
-- Vitals: aggregate by metric_name for dashboard
CREATE INDEX IF NOT EXISTS idx_cvl_metric_name_rating ON client_vitals_log (metric_name, metric_rating, received_at DESC);
-- Vitals: user-centric analysis
CREATE INDEX IF NOT EXISTS idx_cvl_user_session ON client_vitals_log (user_id, session_id, received_at DESC)
WHERE user_id IS NOT NULL;
-- Vitals: time-series analysis (identify performance regressions)
CREATE INDEX IF NOT EXISTS idx_cvl_received_at ON client_vitals_log (received_at DESC);
-- ============================================================================
-- SECTION 3: FUNCTIONS
-- ============================================================================
-- Function: fn_get_client_error_summary — ملخص أخطاء الـ 24 ساعة الأخيرة
CREATE OR REPLACE FUNCTION fn_get_client_error_summary(p_hours INTEGER DEFAULT 24) RETURNS TABLE (
        severity VARCHAR(16),
        source VARCHAR(32),
        total_count BIGINT,
        unique_messages BIGINT,
        top_message TEXT,
        last_seen TIMESTAMPTZ
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT e.severity,
    e.source,
    SUM(e.count)::BIGINT AS total_count,
    COUNT(DISTINCT e.message) AS unique_messages,
    (
        SELECT em.message
        FROM client_error_log em
        WHERE em.severity = e.severity
            AND em.source = e.source
            AND em.last_seen > NOW() - (p_hours || ' hours')::INTERVAL
        GROUP BY em.message
        ORDER BY SUM(em.count) DESC
        LIMIT 1
    ) AS top_message,
    MAX(e.last_seen) AS last_seen
FROM client_error_log e
WHERE e.last_seen > NOW() - (p_hours || ' hours')::INTERVAL
GROUP BY e.severity,
    e.source
ORDER BY CASE
        e.severity
        WHEN 'fatal' THEN 1
        WHEN 'error' THEN 2
        WHEN 'warning' THEN 3
        ELSE 4
    END,
    SUM(e.count) DESC;
END;
$$;
COMMENT ON FUNCTION fn_get_client_error_summary IS 'Returns 24h error summary grouped by severity+source — for dashboard widget';
-- Function: fn_get_vitals_distribution — توزيع Web Vitals حسب التصنيف
CREATE OR REPLACE FUNCTION fn_get_vitals_distribution(
        p_hours INTEGER DEFAULT 24,
        p_metric VARCHAR DEFAULT NULL
    ) RETURNS TABLE (
        metric_name VARCHAR(32),
        rating VARCHAR(16),
        sample_count BIGINT,
        avg_value NUMERIC(10, 3),
        p50_value NUMERIC(10, 3),
        p95_value NUMERIC(10, 3),
        p99_value NUMERIC(10, 3)
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT v.metric_name,
    v.metric_rating,
    COUNT(*)::BIGINT AS sample_count,
    ROUND(AVG(v.metric_value)::NUMERIC, 3) AS avg_value,
    PERCENTILE_CONT(0.50) WITHIN GROUP (
        ORDER BY v.metric_value
    ) AS p50_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY v.metric_value
    ) AS p95_value,
    PERCENTILE_CONT(0.99) WITHIN GROUP (
        ORDER BY v.metric_value
    ) AS p99_value
FROM client_vitals_log v
WHERE v.received_at > NOW() - (p_hours || ' hours')::INTERVAL
    AND (
        p_metric IS NULL
        OR v.metric_name = p_metric
    )
GROUP BY v.metric_name,
    v.metric_rating
ORDER BY v.metric_name,
    CASE
        v.metric_rating
        WHEN 'poor' THEN 1
        WHEN 'needs-improvement' THEN 2
        ELSE 3
    END;
END;
$$;
COMMENT ON FUNCTION fn_get_vitals_distribution IS 'Returns percentiles (p50/p95/p99) for each metric+rating — for Core Web Vitals dashboard';
-- Function: fn_clean_old_telemetry — حذف البيانات القديمة (retention policy)
CREATE OR REPLACE FUNCTION fn_clean_old_telemetry(p_retention_days INTEGER DEFAULT 30) RETURNS TABLE (
        deleted_errors BIGINT,
        deleted_vitals BIGINT
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cutoff TIMESTAMPTZ := NOW() - (p_retention_days || ' days')::INTERVAL;
BEGIN -- Delete old errors
WITH deleted AS (
    DELETE FROM client_error_log
    WHERE last_seen < cutoff
    RETURNING 1
)
SELECT COUNT(*) INTO deleted_errors
FROM deleted;
-- Delete old vitals
WITH deleted AS (
    DELETE FROM client_vitals_log
    WHERE received_at < cutoff
    RETURNING 1
)
SELECT COUNT(*) INTO deleted_vitals
FROM deleted;
RETURN NEXT;
RAISE NOTICE 'Cleaned telemetry data older than % days (cutoff: %). Deleted: % errors, % vitals.',
p_retention_days,
cutoff,
deleted_errors,
deleted_vitals;
END;
$$;
COMMENT ON FUNCTION fn_clean_old_telemetry IS 'Retention cleanup — call via pg_cron or manually. Default: 30 days';
-- Function: fn_link_error_to_audit — ربط خطأ العميل بسجل الخادم
CREATE OR REPLACE FUNCTION fn_link_error_to_audit(p_correlation_id VARCHAR(64)) RETURNS TABLE (
        audit_id BIGINT,
        audit_action TEXT,
        audit_table_name TEXT,
        audit_actor_id UUID,
        audit_timestamp TIMESTAMPTZ
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT a.id,
    a.action,
    a.table_name,
    a.actor_id,
    a.created_at
FROM audit_log a
WHERE a.correlation_id = p_correlation_id
    OR a.id::TEXT = p_correlation_id
ORDER BY a.created_at DESC
LIMIT 20;
END;
$$;
COMMENT ON FUNCTION fn_link_error_to_audit IS 'Links a client-side error (by correlation_id) to server-side audit entries for full-stack tracing';
-- ============================================================================
-- SECTION 4: VIEWS
-- ============================================================================
-- View: v_client_error_dashboard — عرض مبسط للأخطاء الأخيرة
CREATE OR REPLACE VIEW v_client_error_dashboard AS
SELECT e.severity,
    e.source,
    e.message,
    e.count,
    e.correlation_id,
    e.url,
    e.first_seen,
    e.last_seen,
    AGE(NOW(), e.last_seen) AS time_since_last_seen,
    CASE
        WHEN e.last_seen > NOW() - INTERVAL '5 minutes' THEN 'critical'
        WHEN e.last_seen > NOW() - INTERVAL '30 minutes' THEN 'warning'
        WHEN e.last_seen > NOW() - INTERVAL '1 hour' THEN 'notice'
        ELSE 'stale'
    END AS alert_level
FROM client_error_log e
WHERE e.last_seen > NOW() - INTERVAL '24 hours'
ORDER BY CASE
        e.severity
        WHEN 'fatal' THEN 1
        WHEN 'error' THEN 2
        WHEN 'warning' THEN 3
        ELSE 4
    END,
    e.last_seen DESC;
COMMENT ON VIEW v_client_error_dashboard IS 'Simplified error feed for admin dashboard — includes alert_level (critical/warning/notice/stale)';
-- View: v_web_vitals_summary — ملخص Core Web Vitals
CREATE OR REPLACE VIEW v_web_vitals_summary AS
SELECT metric_name,
    COUNT(*) AS total_samples,
    ROUND(AVG(metric_value)::NUMERIC, 2) AS avg_ms,
    ROUND(
        PERCENTILE_CONT(0.75) WITHIN GROUP (
            ORDER BY metric_value
        )::NUMERIC,
        2
    ) AS p75_ms,
    ROUND(
        PERCENTILE_CONT(0.95) WITHIN GROUP (
            ORDER BY metric_value
        )::NUMERIC,
        2
    ) AS p95_ms,
    ROUND(
        PERCENTILE_CONT(0.99) WITHIN GROUP (
            ORDER BY metric_value
        )::NUMERIC,
        2
    ) AS p99_ms,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE metric_rating = 'good'
        ) / COUNT(*),
        1
    ) AS good_pct,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE metric_rating = 'needs-improvement'
        ) / COUNT(*),
        1
    ) AS needs_improvement_pct,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE metric_rating = 'poor'
        ) / COUNT(*),
        1
    ) AS poor_pct,
    MIN(received_at) AS window_start,
    MAX(received_at) AS window_end
FROM client_vitals_log
WHERE received_at > NOW() - INTERVAL '7 days'
GROUP BY metric_name;
COMMENT ON VIEW v_web_vitals_summary IS '7-day Core Web Vitals summary with p75/p95/p99 percentiles and percentage breakdown by rating';
-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS on new tables
ALTER TABLE client_error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_vitals_log ENABLE ROW LEVEL SECURITY;
-- Public read: only ministry_admin and system can read
CREATE POLICY rls_cel_read ON client_error_log FOR
SELECT USING (
        auth.jwt()->>'role' IN ('ministry_admin', 'system')
    );
-- Public insert: telemetry endpoint (rate-limited at API level)
CREATE POLICY rls_cel_insert ON client_error_log FOR
INSERT WITH CHECK (true);
-- No auth required for telemetry endpoint
-- No UPDATE/DELETE for app role (append-only)
CREATE POLICY rls_cel_no_update ON client_error_log FOR
UPDATE USING (false);
CREATE POLICY rls_cel_no_delete ON client_error_log FOR DELETE USING (false);
-- Vitals: read for analytics
CREATE POLICY rls_cvl_read ON client_vitals_log FOR
SELECT USING (
        auth.jwt()->>'role' IN ('ministry_admin', 'system', 'analytics')
    );
-- Vitals: insert from telemetry
CREATE POLICY rls_cvl_insert ON client_vitals_log FOR
INSERT WITH CHECK (true);
-- Vitals: no mutations
CREATE POLICY rls_cvl_no_update ON client_vitals_log FOR
UPDATE USING (false);
CREATE POLICY rls_cvl_no_delete ON client_vitals_log FOR DELETE USING (false);
-- ============================================================================
-- SECTION 6: STATISTICS
-- ============================================================================
-- Collect statistics for better query planning
ANALYZE client_error_log;
ANALYZE client_vitals_log;
-- ============================================================================
-- SECTION 7: NOTIFICATIONS (optional — for real-time dashboards)
-- ============================================================================
-- Function: fn_notify_fatal_error — إشعار فوري عند خطأ fatal
CREATE OR REPLACE FUNCTION fn_notify_fatal_error() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.severity = 'fatal' THEN PERFORM pg_notify(
        'fatal_error',
        json_build_object(
            'id',
            NEW.id,
            'message',
            NEW.message,
            'url',
            NEW.url,
            'count',
            NEW.count,
            'received_at',
            NEW.received_at
        )::TEXT
    );
END IF;
RETURN NEW;
END;
$$;
-- Trigger: fire on new fatal errors
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_notify_fatal_error'
        AND tgrelid = 'client_error_log'::regclass
) THEN CREATE TRIGGER trg_notify_fatal_error
AFTER
INSERT ON client_error_log FOR EACH ROW EXECUTE FUNCTION fn_notify_fatal_error();
END IF;
END $$;
COMMENT ON TRIGGER trg_notify_fatal_error ON client_error_log IS 'pg_notify on fatal errors — listen with: LISTEN fatal_error; for real-time Slack/PagerDuty alerts';
-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================
DO $$
DECLARE tbl_count INTEGER;
idx_count INTEGER;
fn_count INTEGER;
view_count INTEGER;
BEGIN -- Verify tables exist
SELECT COUNT(*) INTO tbl_count
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('client_error_log', 'client_vitals_log');
ASSERT tbl_count = 2,
'Expected 2 tables, found ' || tbl_count;
-- Verify indexes
SELECT COUNT(*) INTO idx_count
FROM pg_indexes
WHERE tablename IN ('client_error_log', 'client_vitals_log');
ASSERT idx_count >= 12,
'Expected at least 12 indexes, found ' || idx_count;
-- Verify functions
SELECT COUNT(*) INTO fn_count
FROM pg_proc
WHERE proname IN (
        'fn_get_client_error_summary',
        'fn_get_vitals_distribution',
        'fn_clean_old_telemetry',
        'fn_link_error_to_audit',
        'fn_notify_fatal_error'
    );
ASSERT fn_count = 5,
'Expected 5 functions, found ' || fn_count;
-- Verify views
SELECT COUNT(*) INTO view_count
FROM information_schema.views
WHERE table_schema = 'public'
    AND table_name IN (
        'v_client_error_dashboard',
        'v_web_vitals_summary'
    );
ASSERT view_count = 2,
'Expected 2 views, found ' || view_count;
RAISE NOTICE '✅ Migration 20260830_04 validation passed:';
RAISE NOTICE '   - 2 tables created';
RAISE NOTICE '   - % indexes created',
idx_count;
RAISE NOTICE '   - 5 functions created',
fn_count;
RAISE NOTICE '   - 2 views created',
view_count;
END;
$$;
COMMIT;
-- ============================================================================
-- ROLLBACK (commented — only run if needed)
-- ============================================================================
-- DROP TRIGGER IF EXISTS trg_notify_fatal_error ON client_error_log;
-- DROP FUNCTION IF EXISTS fn_notify_fatal_error();
-- DROP FUNCTION IF EXISTS fn_link_error_to_audit(VARCHAR);
-- DROP FUNCTION IF EXISTS fn_clean_old_telemetry(INTEGER);
-- DROP FUNCTION IF EXISTS fn_get_vitals_distribution(INTEGER, VARCHAR);
-- DROP FUNCTION IF EXISTS fn_get_client_error_summary(INTEGER);
-- DROP VIEW IF EXISTS v_web_vitals_summary;
-- DROP VIEW IF EXISTS v_client_error_dashboard;
-- DROP TABLE IF EXISTS client_vitals_log;
-- DROP TABLE IF EXISTS client_error_log;