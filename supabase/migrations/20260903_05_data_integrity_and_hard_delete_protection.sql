-- ============================================================================
-- 20260903_05_data_integrity_and_hard_delete_protection.sql
-- تحصين البيانات ضد الحذف النهائي + سدّ الثغرات:
--   A) أعمدة حذف ناعم لجداول بنك المهن (كانت بلا حماية).
--   B) حارس عام يحوّل أي DELETE إلى حذف ناعم (يمنع الحذف الجسدي) على كل
--      جدول يملك deleted_at، مع توثيق append-only في audit_log.
--   C) تفعيل RLS على جداول بنك المهن (SELECT عام، CRUD للمصادَق، بلا DELETE).
-- ============================================================================

-- ============================================================
-- A) إضافة أعمدة الحذف الناعم لجداول بنك المهن
-- ============================================================
ALTER TABLE profession_analysis_cards
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE profession_card_versions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE national_occupations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE career_paths
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE hazardous_occupations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE profession_applicability
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- ============================================================
-- B) الحارس العام لمنع الحذف الجسدي (تحويل DELETE إلى حذف ناعم)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_prevent_hard_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  _actor uuid;
  _tbl text := quote_ident(TG_TABLE_SCHEMA) || '.' || quote_ident(TG_TABLE_NAME);
  _has_soft boolean;
  _recid uuid;
  _oldj jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=TG_TABLE_SCHEMA AND table_name=TG_TABLE_NAME
      AND column_name='deleted_at'
  ) INTO _has_soft;

  IF NOT _has_soft THEN
    RAISE EXCEPTION 'حذف نهائي مرفوض على %: لا يوجد عمود حذف ناعم. استخدم UPDATE للأرشفة.', _tbl;
  END IF;

  BEGIN
    _actor := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'sub';
  EXCEPTION WHEN OTHERS THEN _actor := NULL; END;

  _oldj := to_jsonb(OLD);
  BEGIN
    IF _oldj ? 'id' THEN _recid := (_oldj->>'id')::text::uuid; ELSE _recid := NULL; END IF;
  EXCEPTION WHEN OTHERS THEN _recid := NULL; END;

  -- تحويل الحذف إلى حذف ناعم (كتابة فعليّة عبر ctid)
  EXECUTE format('UPDATE %s SET deleted_at = now(), deleted_by = $1 WHERE ctid = $2', _tbl)
    USING _actor, OLD.ctid;

  -- توثيق في سجل التدقيق append-only (محمي بحاشة هاش + منع التعديل)
  INSERT INTO audit_log (table_name, record_id, action, old_values, entity_id, actor_id)
  VALUES (TG_TABLE_NAME, _recid, 'SOFT_DELETE', _oldj, _recid, _actor);

  -- إلغاء الحذف الجسدي نهائياً
  RETURN NULL;
END $$;

-- إرفاق الحارس بكل جدول يملك عمود deleted_at (يشمل جداول بنك المهن أعلاه)
DO $$
DECLARE
  r record;
  trig text;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    JOIN pg_class cl ON cl.oid = to_regclass(c.table_schema || '.' || c.table_name)
    WHERE c.table_schema='public' AND c.column_name='deleted_at'
      AND cl.relkind = 'r'
    GROUP BY c.table_schema, c.table_name, cl.relkind
    ORDER BY c.table_name
  LOOP
    trig := 'trg_protect_' || r.table_name;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgrelid = (r.table_schema||'.'||r.table_name)::regclass AND tgname=trig
    ) THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete()', trig, r.table_schema, r.table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- C) RLS على جداول بنك المهن (بلا DELETE)
--   SELECT للسجلات غير المحذوفة للجميع، CRUD للمصادَق، لا DELETE.
-- ============================================================
ALTER TABLE profession_analysis_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths               ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazardous_occupations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_occupations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profession_card_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profession_applicability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profession_standard_methodology ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_select_public      ON profession_analysis_cards;
DROP POLICY IF EXISTS bank_write_auth         ON profession_analysis_cards;
DROP POLICY IF EXISTS cp_select_public        ON career_paths;
DROP POLICY IF EXISTS cp_write_auth           ON career_paths;
DROP POLICY IF EXISTS ho_select_public        ON hazardous_occupations;
DROP POLICY IF EXISTS ho_write_auth           ON hazardous_occupations;
DROP POLICY IF EXISTS no_select_public        ON national_occupations;
DROP POLICY IF EXISTS no_write_auth           ON national_occupations;
DROP POLICY IF EXISTS pv_select_public        ON profession_card_versions;
DROP POLICY IF EXISTS pv_write_auth           ON profession_card_versions;
DROP POLICY IF EXISTS pa_select_public        ON profession_applicability;
DROP POLICY IF EXISTS pa_write_auth           ON profession_applicability;
DROP POLICY IF EXISTS pm_select_public        ON profession_standard_methodology;
DROP POLICY IF EXISTS pm_write_auth           ON profession_standard_methodology;

CREATE POLICY bank_select_public ON profession_analysis_cards
  FOR SELECT TO authenticated, anonymous USING (deleted_at IS NULL);
CREATE POLICY bank_write_auth ON profession_analysis_cards
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY bank_update_auth ON profession_analysis_cards
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

CREATE POLICY cp_select_public ON career_paths
  FOR SELECT TO authenticated, anonymous USING (deleted_at IS NULL);
CREATE POLICY cp_write_auth ON career_paths
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY cp_update_auth ON career_paths
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

CREATE POLICY ho_select_public ON hazardous_occupations
  FOR SELECT TO authenticated, anonymous USING (deleted_at IS NULL);
CREATE POLICY ho_write_auth ON hazardous_occupations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ho_update_auth ON hazardous_occupations
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

CREATE POLICY no_select_public ON national_occupations
  FOR SELECT TO authenticated, anonymous USING (deleted_at IS NULL);
CREATE POLICY no_write_auth ON national_occupations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY no_update_auth ON national_occupations
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

CREATE POLICY pv_select_public ON profession_card_versions
  FOR SELECT TO authenticated, anonymous USING (deleted_at IS NULL);
CREATE POLICY pv_write_auth ON profession_card_versions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pv_update_auth ON profession_card_versions
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

CREATE POLICY pa_select_public ON profession_applicability
  FOR SELECT TO authenticated, anonymous USING (deleted_at IS NULL);
CREATE POLICY pa_write_auth ON profession_applicability
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pa_update_auth ON profession_applicability
  FOR UPDATE TO authenticated USING (deleted_at IS NULL);

CREATE POLICY pm_select_public ON profession_standard_methodology
  FOR SELECT TO authenticated, anonymous USING (true);
CREATE POLICY pm_write_auth ON profession_standard_methodology
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pm_update_auth ON profession_standard_methodology
  FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- ضبط الصلاحيات على جداول بنك المهن (سداد دين: كانت بلا GRANTs)
--   authenticated: SELECT/INSERT/UPDATE (بلا DELETE دائم)
--   anonymous:     SELECT فقط
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON profession_analysis_cards        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON career_paths                     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON hazardous_occupations            TO authenticated;
GRANT SELECT, INSERT, UPDATE ON national_occupations             TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profession_card_versions         TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profession_applicability         TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profession_standard_methodology  TO authenticated;

GRANT SELECT ON profession_analysis_cards       TO anonymous;
GRANT SELECT ON career_paths                    TO anonymous;
GRANT SELECT ON hazardous_occupations           TO anonymous;
GRANT SELECT ON national_occupations            TO anonymous;
GRANT SELECT ON profession_card_versions        TO anonymous;
GRANT SELECT ON profession_applicability        TO anonymous;
GRANT SELECT ON profession_standard_methodology TO anonymous;

-- إزالة حق DELETE الدائم عن أدوار التطبيق (يتم بالحذف الناعم حصراً)
REVOKE DELETE ON profession_analysis_cards   FROM authenticated;
REVOKE DELETE ON national_occupations        FROM authenticated;
REVOKE DELETE ON profession_card_versions    FROM authenticated;

-- تسلسلات الجداول المزروعة
GRANT USAGE, SELECT ON SEQUENCE profession_standard_methodology_id_seq TO authenticated;

-- الصلاحيات الافتراضية للجداول المستقبلية
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anonymous;
