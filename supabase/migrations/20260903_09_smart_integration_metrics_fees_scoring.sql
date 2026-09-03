-- ============================================================================
-- 20260903_09_smart_integration_metrics_fees_scoring.sql
-- الربط الذكي للمعايير والقيم المخزنة مع جداولها المخصصة وشاشات العمل والإجراءات
--   (1) رسوم خدمية فعلية لكتالوج الخدمات (خدمة ← رسوم، بدل القيم الصفرية)
--   (2) دالة مؤشر درجة التفتيش: تستخلص أوزان معايير التفتيش وتحتسب درجات KPI
--   (3) دالة احتساب غرامة المخالفة من نطاق العقوبة المقرر (مشتقة لا مرتجلة)
--   (4) دالة تحقق الالتزام بالأجر الأدنى من نطاقات الأجور
-- ============================================================================

-- ============================================================
-- (1) رسوم خدمية قياسية لكتالوج الخدمات (قيم فعلية بالريال اليمني)
-- ============================================================
UPDATE service_catalog sc
SET fees =
  CASE sc.category
    WHEN 'establishment' THEN jsonb_build_object('note','تسجيل وتأسيس منشأة','amount',50000,'currency','YER')
    WHEN 'worker'        THEN jsonb_build_object('note','خدمات عامل (تصنيف/شهادة)','amount',5000,'currency','YER')
    WHEN 'union'         THEN jsonb_build_object('note','خدمات نقابية','amount',20000,'currency','YER')
    WHEN 'inspection'    THEN jsonb_build_object('note','فحص/تفتيش ميداني','amount',30000,'currency','YER')
    WHEN 'dispute'       THEN jsonb_build_object('note','تسوية نزاع عمالي','amount',10000,'currency','YER')
    WHEN 'osh'           THEN jsonb_build_object('note','سلامة وصحة مهنية','amount',15000,'currency','YER')
    ELSE                 jsonb_build_object('note','خدمة عامة','amount',5000,'currency','YER')
  END,
  updated_at = now()
WHERE sc.fees IS NULL OR COALESCE((sc.fees->>'amount')::numeric,0) = 0;

-- مزامنة جدول الخدمات القديم مع قيم الرسوم حسب الفئة
UPDATE services s
SET fee_amount = CASE s.category
    WHEN 'تسجيل'    THEN 50000
    WHEN 'تجديد'    THEN 20000
    WHEN 'تفتيش'    THEN 30000
    WHEN 'شكوى'     THEN 10000
    ELSE 5000 END
WHERE s.fee_amount IS NULL OR s.fee_amount IN (0, 0.00, 500.00, 200.00);

-- ============================================================
-- (2) دالة مؤشر درجة التفتيش — تربط أوزان معايير التفتيش بالدرجات
--     > تحل قطاع المنشأة، تجمع المعايير المطبّقة، تحسب امتثال كل معيار
--     من قائمة الفحص، وتُخرج الأوزان في درجات فرعية + درجة كلية (0-100)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_inspection_score(p_inspection_id uuid)
RETURNS TABLE(overall_score numeric, labor_law numeric, safety numeric,
              training numeric, yemenization numeric, criteria_used int)
LANGUAGE plpgsql AS $$
DECLARE
  v_sector text;
  v_total_weight numeric := 0;
  v_earned numeric := 0;
  v_labor numeric := 0; v_safety numeric := 0;
  v_rec record;
  v_crit_count int := 0;
  v_compliant boolean;
  v_has_items boolean;
BEGIN
  SELECT COALESCE(
    (SELECT o.sector::text FROM organizational_entities o WHERE o.entity_id = ins.enterprise_id),
    (SELECT c.sector::text FROM commercial_establishments c WHERE c.id = ins.enterprise_id),
    'other')
  INTO v_sector FROM inspections ins WHERE ins.id = p_inspection_id;
  IF v_sector IS NULL THEN v_sector := 'other'; END IF;

  FOR v_rec IN
    SELECT cr.criteria_code, cr.title_ar, cr.weight
    FROM inspection_criteria cr
    WHERE (cr.sector IS NULL OR cr.sector = v_sector) AND cr.is_mandatory
  LOOP
    -- بنود فحص لهذا المعيار (بالمطابقة على عنوان المعيار)
    SELECT EXISTS(
             SELECT 1 FROM inspection_checklists cl
             WHERE cl.inspection_id = p_inspection_id AND cl.category = v_rec.title_ar),
           COALESCE(bool_and(cl.is_compliant), true)
    INTO v_has_items, v_compliant
    FROM inspection_checklists cl
    WHERE cl.inspection_id = p_inspection_id AND cl.category = v_rec.title_ar;

    -- لا بنود فحص مسجّلة بعد: يُعتبر المعيار غير مُقيَّم (امتثال مبدئي)
    IF NOT v_has_items THEN v_compliant := true; END IF;

    IF v_rec.weight IS NOT NULL THEN
      v_total_weight := v_total_weight + v_rec.weight;
      v_earned := v_earned + (CASE WHEN v_compliant THEN v_rec.weight ELSE 0 END);
      IF v_rec.criteria_code ILIKE 'INS-OSH%' THEN
        v_safety := v_safety + (CASE WHEN v_compliant THEN v_rec.weight ELSE 0 END);
      ELSIF v_rec.criteria_code IN ('INS-WAGE-01','INS-CONTRACT-01','INS-EMPLOY-01','INS-HOURS-01') THEN
        v_labor := v_labor + (CASE WHEN v_compliant THEN v_rec.weight ELSE 0 END);
      END IF;
      v_crit_count := v_crit_count + 1;
    END IF;
  END LOOP;

  overall_score := CASE WHEN v_total_weight > 0 THEN ROUND((v_earned / v_total_weight) * 100, 1) ELSE 0 END;
  labor_law    := CASE WHEN v_total_weight > 0 THEN ROUND((v_labor / v_total_weight) * 100, 1) ELSE 0 END;
  safety       := CASE WHEN v_total_weight > 0 THEN ROUND((v_safety / v_total_weight) * 100, 1) ELSE 0 END;
  training     := NULL; yemenization := NULL;
  criteria_used := v_crit_count;
  RETURN NEXT;
END $$;

-- دالة تطبيق درجة التفتيش وتخزينها في جدول التفتيش (شاشة العمل)
CREATE OR REPLACE FUNCTION fn_apply_inspection_score(p_inspection_id uuid)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE v numeric;
BEGIN
  SELECT overall_score INTO v FROM fn_inspection_score(p_inspection_id);
  UPDATE inspections
     SET overall_score = v,
         labor_law_score = v,
         safety_score = v,
         compliance_status = CASE WHEN v >= 80 THEN 'compliant'
                                  WHEN v >= 50 THEN 'partial'
                                  ELSE 'noncompliant' END
   WHERE id = p_inspection_id;
  RETURN v;
END $$;

-- ============================================================
-- (3) دالة احتساب غرامة المخالفة من نطاق العقوبة المقرر في violation_types
--     تُحل رقمين من "غرامة من X إلى Y" وتُخرج قيمة حتمية (الحد الأدنى × مضاعف)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_compute_violation_fine(p_violation_code text,
                                                     p_severity text DEFAULT 'minor',
                                                     p_repeat int DEFAULT 1)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
  v_pen text;
  v_min numeric := 0;
  v_max numeric;
  v_sev numeric;
BEGIN
  SELECT penalty_description INTO v_pen FROM violation_types WHERE code = p_violation_code;
  IF v_pen IS NULL THEN RETURN NULL; END IF;
  BEGIN
    v_min := COALESCE(
      (regexp_match(v_pen, '([0-9][0-9,]{2,})'))[1]::text, '0');
    v_min := REPLACE(v_min, ',', '')::numeric;
  EXCEPTION WHEN OTHERS THEN v_min := 0; END;
  v_sev := CASE p_severity WHEN 'minor' THEN 1 WHEN 'major' THEN 1.5 WHEN 'critical' THEN 2 ELSE 1 END;
  RETURN ROUND(COALESCE(v_min,0) * v_sev * GREATEST(p_repeat,1), 0);
END $$;

-- ============================================================
-- (4) دالة تحقق الالتزام بالأجر الأدنى من نطاقات الأجور (KPI أجور)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_min_wage_compliance(p_occupation_id uuid, p_wage numeric)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE v_min numeric;
BEGIN
  SELECT min_salary INTO v_min FROM salary_ranges WHERE occupation_id = p_occupation_id LIMIT 1;
  IF v_min IS NULL THEN RETURN true; END IF; -- لا معيار محدد
  RETURN p_wage >= v_min;
END $$;

-- ============================================================
-- منح صلاحيات التنفيذ لأدوار التطبيق
-- ============================================================
GRANT EXECUTE ON FUNCTION fn_inspection_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_apply_inspection_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_compute_violation_fine(text,text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_min_wage_compliance(uuid,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_inspection_score(uuid) TO anonymous;
GRANT EXECUTE ON FUNCTION fn_compute_violation_fine(text,text,int) TO anonymous;
