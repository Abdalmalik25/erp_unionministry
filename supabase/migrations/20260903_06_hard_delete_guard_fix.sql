-- ============================================================================
-- 20260903_06_hard_delete_guard_fix.sql
-- تصحيح الحارس: توثيق الأرشفة في audit_log بقيمة action مقبولة (ARCHIVE)
-- بدلاً من SOFT_DELETE (غير مسموح بها في القيد). الوظيفة نفسها تُستبدل مطبّقةً.
-- ============================================================================
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

  EXECUTE format('UPDATE %s SET deleted_at = now(), deleted_by = $1 WHERE ctid = $2', _tbl)
    USING _actor, OLD.ctid;

  INSERT INTO audit_log (table_name, record_id, action, old_values, entity_id, actor_id, notes)
  VALUES (TG_TABLE_NAME, _recid, 'ARCHIVE', _oldj, _recid, _actor, 'soft-deletion guard: DELETE converted to archive');

  RETURN NULL;
END $$;
