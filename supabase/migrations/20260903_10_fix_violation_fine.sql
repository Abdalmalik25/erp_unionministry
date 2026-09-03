-- ============================================================================
-- 20260903_10_fix_violation_fine.sql
-- تصحيح دالة احتساب الغرامة: فصل نص الالتقاط عن التحويل الرقمي (إزالة الفواصل)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_compute_violation_fine(p_violation_code text,
                                                     p_severity text DEFAULT 'minor',
                                                     p_repeat int DEFAULT 1)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
  v_pen text;
  v_raw text;
  v_min numeric := 0;
  v_sev numeric;
BEGIN
  SELECT penalty_description INTO v_pen FROM violation_types WHERE code = p_violation_code;
  IF v_pen IS NULL THEN RETURN NULL; END IF;
  BEGIN
    v_raw := (regexp_match(v_pen, '([0-9][0-9,]{2,})'))[1];
    IF v_raw IS NULL THEN v_raw := '0'; END IF;
    v_min := REPLACE(v_raw, ',', '')::numeric;
  EXCEPTION WHEN OTHERS THEN v_min := 0; END;
  v_sev := CASE p_severity WHEN 'minor' THEN 1 WHEN 'major' THEN 1.5 WHEN 'critical' THEN 2 ELSE 1 END;
  RETURN ROUND(v_min * v_sev * GREATEST(p_repeat,1), 0);
END $$;

GRANT EXECUTE ON FUNCTION fn_compute_violation_fine(text,text,int) TO authenticated, anonymous;
