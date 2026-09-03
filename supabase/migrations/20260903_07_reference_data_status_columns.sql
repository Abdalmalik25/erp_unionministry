-- ============================================================================
-- 20260903_07_reference_data_status_columns.sql
-- إضافة عمود حالة/نوع السجل للجداول المرجعية، تمييزاً بين:
--   معياري : بيانات رسمية قياسية (سجلات وطنية معتمدة)
--   تجريبي : بيانات اشتقاقية/تقديرية قيد الإثبات (تُميّز صراحةً)
-- يضاف أيضاً عمود مصدر البيانات للشفافية.
-- ============================================================================

ALTER TABLE profession_applicability
  ADD COLUMN IF NOT EXISTS data_status   text NOT NULL DEFAULT 'معياري',
  ADD COLUMN IF NOT EXISTS data_source   text;

ALTER TABLE enterprise_occupation_links
  ADD COLUMN IF NOT EXISTS data_status   text NOT NULL DEFAULT 'معياري',
  ADD COLUMN IF NOT EXISTS data_source   text;

ALTER TABLE enterprise_isic_links
  ADD COLUMN IF NOT EXISTS data_status   text NOT NULL DEFAULT 'معياري',
  ADD COLUMN IF NOT EXISTS data_source   text;

ALTER TABLE osh_hazards
  ADD COLUMN IF NOT EXISTS data_status   text NOT NULL DEFAULT 'معياري',
  ADD COLUMN IF NOT EXISTS data_source   text;

-- حمايتها من الحذف النهائي أيضاً (ضمن الحماية العامة التي تشمل جداول deleted_at)
