-- ============================================================
-- 20260826_01_missing_schema_tables.sql
-- إصلاح دين تقني: جداول معرّفة في schema_comprehensive.sql لكنها
-- لم تُرحَّل أبداً للإنتاج، بينما ترحيلات لاحقة (20260825_17)
-- تضيف قيوداً عليها — اعتمادية مكسورة.
-- Idempotent بالكامل: آمن للتشغيل المتكرر.
-- ============================================================

-- حراسة أنواع ENUM المطلوبة — تُنفّذ في مرحلة AUTOCOMMIT
-- (ALTER TYPE ADD VALUE لا يُسمح به داخل كتلة معاملة عند الاستخدام اللاحق بالقيم)
-- === AUTOCOMMIT BOUNDARY MARKER : كل ما قبله يُنفَّذ تلقائياً سطراً سطراً ===

-- مرحلة 1 (autocommit): استكمال قيم connection_status الناقصة
ALTER TYPE connection_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE connection_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE connection_status ADD VALUE IF NOT EXISTS 'conflict';

-- ============================================================
-- مرحلة 2 (معاملة واحدة): إنشاء الجداول المفقودة
-- ============================================================

-- DYNAMIC_FIELDS — الحقول الديناميكية المرنة للكيانات التنظيمية
-- ============================================================
CREATE TABLE IF NOT EXISTS dynamic_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, field_name)
);

-- قيود التحقّق التي توقعها الترحيل 17 (تُطبّق فقط إن غابت)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'dynamic_fields'
  ) THEN
    ALTER TABLE dynamic_fields DROP CONSTRAINT IF EXISTS dynamic_fields_field_type_check;
    ALTER TABLE dynamic_fields ADD CONSTRAINT dynamic_fields_field_type_check
      CHECK (field_type IN ('text','number','date','boolean','json','array'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dynamic_fields_entity ON dynamic_fields(entity_id);

-- ============================================================
-- SYNC_LOG — سجل عمليات المزامنة المحلية ↔ السحابية
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  direction TEXT NOT NULL CHECK (direction IN ('push','pull','bidirectional')),
  status connection_status NOT NULL DEFAULT 'pending',
  tables_synced TEXT[],
  records_synced INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
