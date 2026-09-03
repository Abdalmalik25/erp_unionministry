-- ============================================================
-- Migration 20260903_01_business_intelligence_decision_support.sql
-- Yemen National Labor Platform / UnionSphere Enterprise
--
-- الطبقة التحليلية: ذكاء الأعمال ودعم القرار
-- Views تلخيصية + دوال تقارير تجميعية/إحصائية/تقييمية/تحليلية
--
-- بُني حصرياً وفق المخطط الفعلي الحي المُتحقق منه (introspection
-- عبر information_schema): أسماء أعمدة وأنواع enum دقيقة — بلا افتراضات
-- ============================================================

-- ============================================================
-- SECTION 1: دالة مساعدة — تطبيع المحافظة
-- ============================================================
CREATE OR REPLACE FUNCTION fn_normalize_governorate(p_gov TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT COALESCE(NULLIF(TRIM(p_gov), ''), 'غير محدد');
$$;

-- ============================================================
-- SECTION 2: VIEW — نبض القرار التنفيذي الوطني الموحد
-- يجمع مؤشرات الموارد والقرار في صف واحد (بناءً على الجداول
-- الملخصة الجاهزة + حساب مباشر عند الحاجة)
-- ============================================================
CREATE OR REPLACE VIEW v_national_executive_pulse AS
WITH dash AS (
  SELECT * FROM ministry_dashboard_stats
),
sys AS (
  SELECT * FROM system_statistics
),
work AS (
  SELECT
    COUNT(*)::BIGINT AS total_active_members,
    COUNT(*) FILTER (WHERE gender = 'male')::BIGINT AS male_members,
    COUNT(*) FILTER (WHERE gender = 'female')::BIGINT AS female_members
  FROM members WHERE deleted_at IS NULL
),
insp AS (
  SELECT
    COUNT(*)::BIGINT AS total_inspections,
    COUNT(*) FILTER (WHERE compliance_status = 'متوافق بالكامل')::BIGINT AS fully_compliant,
    ROUND(AVG(overall_score), 2) AS avg_score
  FROM inspections WHERE deleted_at IS NULL
),
fin AS (
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS collected,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending
  FROM fee_payments WHERE deleted_at IS NULL
)
SELECT
  dash.total_entities,
  dash.active_entities,
  dash.suspended_entities,
  dash.inactive_entities,
  dash.compliant_entities,
  dash.non_compliant_entities,
  dash.high_risk_entities,
  dash.overdue_renewals,
  dash.due_soon_renewals,
  dash.total_members AS ministry_members,
  dash.compliance_rate,
  sys.total_professions,
  sys.total_inspections AS sys_total_inspections,
  sys.valid_certificates,
  sys.completed_trainings,
  sys.pending_disputes,
  sys.active_expatriate_licenses,
  sys.active_dispatches,
  sys.pending_reduction_requests,
  sys.active_isic4_codes,
  work.total_active_members,
  work.male_members,
  work.female_members,
  insp.total_inspections,
  insp.fully_compliant,
  insp.avg_score AS avg_inspection_score,
  fin.collected AS revenue_collected,
  fin.pending AS revenue_pending,
  NOW() AS pulse_at
FROM dash
CROSS JOIN sys
CROSS JOIN work
CROSS JOIN insp
CROSS JOIN fin;

-- ============================================================
-- SECTION 3: مادة تخزينية — لوحة القرار التنفيذية
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_executive_decision_cockpit CASCADE;
CREATE MATERIALIZED VIEW mv_executive_decision_cockpit AS
SELECT * FROM v_national_executive_pulse;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_exec_cockpit ON mv_executive_decision_cockpit (pulse_at);

-- ============================================================
-- SECTION 4: دالة — مصفوفة المخاطر المركبة لكل كيان
-- تدمج المخالفات + الإنذارات + الوثائق + التراخيص + التقييم في درجة موحدة
-- ============================================================
CREATE OR REPLACE FUNCTION fn_composite_risk_matrix()
RETURNS TABLE(
  entity_id UUID, entity_name TEXT, governorate TEXT, sector TEXT, status TEXT,
  compliance_status TEXT, risk_level TEXT,
  open_violations BIGINT, critical_violations BIGINT, pending_alerts BIGINT,
  expiring_documents BIGINT, expired_documents BIGINT, expiring_licenses BIGINT,
  low_assessments BIGINT, composite_risk_score NUMERIC, risk_band TEXT
) LANGUAGE plpgsql STABLE AS $$
DECLARE v_score NUMERIC;
BEGIN
  FOR entity_id, entity_name, governorate, sector, status, compliance_status, risk_level,
      open_violations, critical_violations, pending_alerts,
      expiring_documents, expired_documents, expiring_licenses, low_assessments
  IN
    SELECT
      e.entity_id, e.name_ar, fn_normalize_governorate(e.governorate),
      e.sector::TEXT, e.status::TEXT, e.compliance_status::TEXT, e.risk_level::TEXT,
      (SELECT COUNT(*) FROM violations v WHERE v.entity_id = e.entity_id AND v.deleted_at IS NULL AND v.status IN ('open','under_review')),
      (SELECT COUNT(*) FROM violations v WHERE v.entity_id = e.entity_id AND v.deleted_at IS NULL AND v.severity = 'critical' AND v.status IN ('open','under_review')),
      (SELECT COUNT(*) FROM compliance_alerts a WHERE a.enterprise_id = e.entity_id AND a.is_resolved = false),
      (SELECT COUNT(*) FROM documents d WHERE d.entity_id = e.entity_id AND d.deleted_at IS NULL AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
      (SELECT COUNT(*) FROM documents d WHERE d.entity_id = e.entity_id AND d.deleted_at IS NULL AND d.expiry_date < CURRENT_DATE),
      (SELECT COUNT(*) FROM licenses l WHERE l.entity_id = e.entity_id AND l.deleted_at IS NULL AND l.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
      (SELECT COUNT(*) FROM maturity_assessments m WHERE m.entity_id = e.entity_id AND m.deleted_at IS NULL AND m.overall_score < 40)
    FROM organizational_entities e
    WHERE e.deleted_at IS NULL
  LOOP
    v_score := LEAST(100.0,
        COALESCE(critical_violations,0) * 12
      + COALESCE(open_violations,0) * 5
      + COALESCE(pending_alerts,0) * 4
      + COALESCE(expired_documents,0) * 8
      + COALESCE(expiring_documents,0) * 2
      + COALESCE(expiring_licenses,0) * 3
      + COALESCE(low_assessments,0) * 6);
    IF v_score >= 70 THEN risk_band := 'حرج';
    ELSIF v_score >= 35 THEN risk_band := 'مرتفع';
    ELSIF v_score >= 12 THEN risk_band := 'متوسط';
    ELSE risk_band := 'منخفض';
    END IF;
    composite_risk_score := ROUND(v_score, 2);
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

-- ============================================================
-- SECTION 5: دالة — الاتجاهات الزمنية (Time-Series)
-- شهرياً: أعضاء/مخالفات/تفتيش/دفعات/طلبات خدمة/شهادات
-- ============================================================
CREATE OR REPLACE FUNCTION fn_time_series_trends(p_months INTEGER DEFAULT 12)
RETURNS TABLE(
  period TEXT,
  new_members BIGINT, new_violations BIGINT, completed_inspections BIGINT,
  revenue_collected NUMERIC, new_service_requests BIGINT, new_certificates BIGINT
) LANGUAGE plpgsql STABLE AS $$
DECLARE v_months INTEGER := GREATEST(1, LEAST(COALESCE(p_months, 12), 36));
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(CURRENT_DATE - (v_months - 1) * INTERVAL '1 month', CURRENT_DATE, INTERVAL '1 month')::DATE AS m
  ),
  mem AS (
    SELECT date_trunc('month', COALESCE(join_date::timestamptz, created_at)) AS m, COUNT(*)::BIGINT AS n
    FROM members WHERE deleted_at IS NULL GROUP BY 1
  ),
  vio AS (
    SELECT date_trunc('month', COALESCE(detected_date::timestamptz, created_at)) AS m, COUNT(*)::BIGINT AS n
    FROM violations WHERE deleted_at IS NULL GROUP BY 1
  ),
  ins AS (
    SELECT date_trunc('month', inspection_date::timestamptz) AS m, COUNT(*)::BIGINT AS n
    FROM inspections WHERE deleted_at IS NULL AND compliance_status = 'متوافق بالكامل' GROUP BY 1
  ),
  fin AS (
    SELECT date_trunc('month', payment_date::timestamptz) AS m, SUM(amount)::NUMERIC AS n
    FROM fee_payments WHERE deleted_at IS NULL AND status = 'paid' GROUP BY 1
  ),
  srv AS (
    SELECT date_trunc('month', submission_date::timestamptz) AS m, COUNT(*)::BIGINT AS n
    FROM service_requests WHERE deleted_at IS NULL GROUP BY 1
  ),
  cer AS (
    SELECT date_trunc('month', issue_date::timestamptz) AS m, COUNT(*)::BIGINT AS n
    FROM evaluation_certificates WHERE deleted_at IS NULL GROUP BY 1
  )
  SELECT
    to_char(DATE_TRUNC('month', months.m), 'YYYY-MM') AS period,
    COALESCE(MAX(mem.n),0), COALESCE(MAX(vio.n),0), COALESCE(MAX(ins.n),0),
    COALESCE(MAX(fin.n),0), COALESCE(MAX(srv.n),0), COALESCE(MAX(cer.n),0)
  FROM months
  LEFT JOIN mem ON mem.m = date_trunc('month', months.m)
  LEFT JOIN vio ON vio.m = date_trunc('month', months.m)
  LEFT JOIN ins ON ins.m = date_trunc('month', months.m)
  LEFT JOIN fin ON fin.m = date_trunc('month', months.m)
  LEFT JOIN srv ON srv.m = date_trunc('month', months.m)
  LEFT JOIN cer ON cer.m = date_trunc('month', months.m)
  GROUP BY DATE_TRUNC('month', months.m)
  ORDER BY DATE_TRUNC('month', months.m);
END;
$$;

-- ============================================================
-- SECTION 6: دالة — مصفوفة القطاع × المحافظة
-- عرض القطاع (سِياق انجليزي enum) عبر المحافظة مع مؤشرات الامتثال
-- ============================================================
CREATE OR REPLACE FUNCTION fn_sector_governorate_matrix()
RETURNS TABLE(
  sector TEXT, governorate TEXT,
  entities BIGINT, active_entities BIGINT, compliant_entities BIGINT,
  members BIGINT, compliance_rate NUMERIC, high_risk_entities BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(e.sector::TEXT, 'غير محدد') AS sector,
    fn_normalize_governorate(e.governorate) AS governorate,
    COUNT(*)::BIGINT AS entities,
    COUNT(*) FILTER (WHERE e.status = 'active')::BIGINT AS active_entities,
    COUNT(*) FILTER (WHERE e.compliance_status = 'compliant')::BIGINT AS compliant_entities,
    COALESCE(SUM(e.member_count), 0)::BIGINT AS members,
    ROUND(100.0 * COUNT(*) FILTER (WHERE e.compliance_status = 'compliant') / NULLIF(COUNT(*), 0), 2) AS compliance_rate,
    COUNT(*) FILTER (WHERE e.risk_level IN ('high','critical'))::BIGINT AS high_risk_entities
  FROM organizational_entities e
  WHERE e.deleted_at IS NULL
  GROUP BY COALESCE(e.sector::TEXT, 'غير محدد'), fn_normalize_governorate(e.governorate)
  ORDER BY entities DESC;
END;
$$;

-- ============================================================
-- SECTION 7: دالة — الأداء المالي (تقادم الدفعات)
-- يعتمد على fee_payments (ربط مباشر بالكيان) لا payments (لا entity_id)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_financial_aging_summary()
RETURNS TABLE(
  total_pending NUMERIC, total_collected NUMERIC,
  collected_count BIGINT, pending_count BIGINT, paid_receipts BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_collected,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT AS collected_count,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_count,
    COUNT(*) FILTER (WHERE receipt_number IS NOT NULL)::BIGINT AS paid_receipts
  FROM fee_payments WHERE deleted_at IS NULL;
END;
$$;

-- ============================================================
-- SECTION 8: دالة — أداء الخدمات والالتزام بمواعيد الإنجاز
-- ============================================================
CREATE OR REPLACE FUNCTION fn_service_performance_report()
RETURNS TABLE(
  total_requests BIGINT, pending BIGINT, processing BIGINT, approved BIGINT,
  rejected BIGINT, completed BIGINT, avg_completion_days NUMERIC
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending,
    COUNT(*) FILTER (WHERE status = 'processing')::BIGINT AS processing,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT AS approved,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT AS rejected,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed,
    ROUND(AVG(CASE WHEN status = 'completed' AND submission_date IS NOT NULL
             THEN (completion_date - submission_date) END), 2) AS avg_completion_days
  FROM service_requests WHERE deleted_at IS NULL;
END;
$$;

-- ============================================================
-- SECTION 9: دالة — تحليلات القوى العاملة
-- (members: نصوص/أجناس/أنشطة) + (worker_profiles: حالة التشغيل)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_workforce_analytics()
RETURNS TABLE(
  total_members BIGINT, active_members BIGINT, male_members BIGINT, female_members BIGINT,
  profiled_workers BIGINT, actively_employed BIGINT,
  yemeni_members BIGINT, foreign_members BIGINT,
  profession_top1 TEXT, profession_top1_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
DECLARE v_top_prof TEXT; v_top_count BIGINT;
BEGIN
  SELECT p.profession, p.cnt INTO v_top_prof, v_top_count
  FROM (
    SELECT profession, COUNT(*)::BIGINT AS cnt FROM members
    WHERE deleted_at IS NULL AND profession IS NOT NULL AND profession <> ''
    GROUP BY profession ORDER BY cnt DESC LIMIT 1
  ) p;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM members WHERE deleted_at IS NULL) AS total_members,
    (SELECT COUNT(*)::BIGINT FROM members WHERE deleted_at IS NULL AND status = 'active') AS active_members,
    (SELECT COUNT(*)::BIGINT FROM members WHERE deleted_at IS NULL AND gender = 'male') AS male_members,
    (SELECT COUNT(*)::BIGINT FROM members WHERE deleted_at IS NULL AND gender = 'female') AS female_members,
    (SELECT COUNT(*)::BIGINT FROM worker_profiles WHERE deleted_at IS NULL) AS profiled_workers,
    (SELECT COUNT(*)::BIGINT FROM worker_profiles WHERE deleted_at IS NULL AND employment_status IS NOT NULL AND employment_status <> '' AND employment_status <> 'غير موظف') AS actively_employed,
    (SELECT COUNT(*)::BIGINT FROM members WHERE deleted_at IS NULL AND nationality = 'YE') AS yemeni_members,
    (SELECT COUNT(*)::BIGINT FROM members WHERE deleted_at IS NULL AND nationality IS NOT NULL AND nationality <> 'YE') AS foreign_members,
    v_top_prof AS profession_top1,
    COALESCE(v_top_count, 0) AS profession_top1_count;
END;
$$;

-- ============================================================
-- SECTION 10: دالة — أداء التفتيش حسب المحافظة
-- ============================================================
CREATE OR REPLACE FUNCTION fn_inspection_performance_by_governorate()
RETURNS TABLE(
  governorate TEXT, total_inspections BIGINT, fully_compliant BIGINT,
  partially_compliant BIGINT, non_compliant BIGINT, avg_score NUMERIC
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    fn_normalize_governorate(e.governorate) AS governorate,
    COUNT(i.id)::BIGINT AS total_inspections,
    COUNT(i.id) FILTER (WHERE i.compliance_status = 'متوافق بالكامل')::BIGINT AS fully_compliant,
    COUNT(i.id) FILTER (WHERE i.compliance_status = 'متوافق جزئياً')::BIGINT AS partially_compliant,
    COUNT(i.id) FILTER (WHERE i.compliance_status = 'غير متوافق')::BIGINT AS non_compliant,
    ROUND(AVG(i.overall_score), 2) AS avg_score
  FROM inspections i
  LEFT JOIN organizational_entities e ON e.entity_id = i.enterprise_id
  WHERE i.deleted_at IS NULL
  GROUP BY fn_normalize_governorate(e.governorate)
  ORDER BY total_inspections DESC;
END;
$$;

-- ============================================================
-- SECTION 11: دالة — دليل التفتيش حسب نوع الفحص
-- ============================================================
CREATE OR REPLACE FUNCTION fn_inspection_analytics_by_type()
RETURNS TABLE(
  inspection_type TEXT, total BIGINT, fully_compliant BIGINT, avg_score NUMERIC
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.inspection_type::TEXT AS inspection_type,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE i.compliance_status = 'متوافق بالكامل')::BIGINT AS fully_compliant,
    ROUND(AVG(i.overall_score), 2) AS avg_score
  FROM inspections i
  WHERE i.deleted_at IS NULL
  GROUP BY i.inspection_type::TEXT
  ORDER BY total DESC;
END;
$$;

-- ============================================================
-- SECTION 12: دالة — ملخص التراخيص ووثائق المنشآت (قوارب الانتهاء)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_license_document_summary()
RETURNS TABLE(
  valid_licenses BIGINT, expired_licenses BIGINT, expiring_licenses_30d BIGINT,
  valid_documents BIGINT, expired_documents BIGINT, expiring_documents_30d BIGINT,
  valid_certificates BIGINT, expiring_certificates_30d BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM licenses WHERE deleted_at IS NULL AND status = 'valid')::BIGINT,
    (SELECT COUNT(*) FROM licenses WHERE deleted_at IS NULL AND status = 'expired')::BIGINT,
    (SELECT COUNT(*) FROM licenses WHERE deleted_at IS NULL AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::BIGINT,
    (SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL AND status = 'approved')::BIGINT,
    (SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL AND expiry_date < CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::BIGINT,
    (SELECT COUNT(*) FROM evaluation_certificates WHERE deleted_at IS NULL AND status = 'صالحة')::BIGINT,
    (SELECT COUNT(*) FROM evaluation_certificates WHERE deleted_at IS NULL AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::BIGINT;
END;
$$;

-- ============================================================
-- SECTION 13: دالة — تحديث المواد التخزينية التحليلية
-- ============================================================
CREATE OR REPLACE FUNCTION fn_refresh_business_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY mv_executive_decision_cockpit; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skip mv_exec: %', SQLERRM; END;
  RAISE NOTICE 'Business views refreshed at %', NOW();
END;
$$;

-- اسم توافقي مع مجدول الخادم الحالي (السيرفر يستدعي fn_refresh_analytics_views)
CREATE OR REPLACE FUNCTION fn_refresh_analytics_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM fn_refresh_business_views();
END;
$$;

-- ============================================================
-- SECTION 14: GRANTs (آمنة — تتحقق من وجود الدور قبل المنح)
-- أدوار المنصة الفعلية: authenticated / anonymous
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION fn_normalize_governorate(TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_composite_risk_matrix() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_time_series_trends(INTEGER) TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_sector_governorate_matrix() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_financial_aging_summary() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_service_performance_report() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_workforce_analytics() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_inspection_performance_by_governorate() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_inspection_analytics_by_type() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_license_document_summary() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_refresh_business_views() TO authenticated;
    GRANT EXECUTE ON FUNCTION fn_refresh_analytics_views() TO authenticated;
    GRANT SELECT ON v_national_executive_pulse TO authenticated;
    GRANT SELECT ON mv_executive_decision_cockpit TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    GRANT EXECUTE ON FUNCTION fn_normalize_governorate(TEXT) TO anonymous;
    GRANT SELECT ON v_national_executive_pulse TO anonymous;
  END IF;
END;
$$;

-- ============================================================
-- SECTION 15: تهيئة أولية
-- ============================================================
SELECT fn_refresh_business_views();
