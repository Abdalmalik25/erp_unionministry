-- ============================================================
-- منظومة الإدارة المؤسسية الشاملة
-- الإعدادات العامة | الصلاحيات المؤسسية | النسخ الاحتياطي والجدولة | الاتصال الإداري
-- ============================================================

-- 1) الإعدادات العامة (مخزن مفتاح-قيمة مؤسسي)
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(120) PRIMARY KEY,
  setting_value TEXT,
  value_type    VARCHAR(20) NOT NULL DEFAULT 'string', -- string|number|boolean|json
  category      VARCHAR(60) NOT NULL DEFAULT 'general',
  description   TEXT,
  updated_by    VARCHAR(120),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value, value_type, category, description) VALUES
  ('org_name_ar', 'وزارة العمل والاتصالات - الجمهورية اليمنية', 'string', 'identity', 'الاسم العربي الرسمي للجهة'),
  ('org_name_en', 'Ministry of Labor - Republic of Yemen', 'string', 'identity', 'Official English name'),
  ('fiscal_year_start', '01-01', 'string', 'general', 'بداية السنة المالية (MM-DD)'),
  ('default_language', 'ar', 'string', 'general', 'اللغة الافتراضية للمنظومة'),
  ('session_timeout_minutes', '30', 'number', 'security', 'مدة انتهاء الجلسة بالدقائق'),
  ('password_min_length', '8', 'number', 'security', 'أدنى طول لكلمة المرور'),
  ('max_login_attempts', '5', 'number', 'security', 'أقصى عدد محاولات دخول فاشلة'),
  ('backup_enabled', 'true', 'boolean', 'backup', 'تفعيل النسخ الاحتياطي التلقائي'),
  ('backup_schedule_cron', '0 2 * * *', 'string', 'backup', 'جدولة النسخ الاحتياطي (cron)'),
  ('backup_retention_days', '30', 'number', 'backup', 'مدة الاحتفاظ بالنسخ بالأيام'),
  ('maintenance_mode', 'false', 'boolean', 'general', 'وضع الصيانة')
ON CONFLICT (setting_key) DO NOTHING;

-- 2) الصلاحيات المؤسسية الحقيقية (مصفوفة دور × مورد × إجراء)
CREATE TABLE IF NOT EXISTS role_permissions (
  id           BIGSERIAL PRIMARY KEY,
  role_key     VARCHAR(60)  NOT NULL,
  resource     VARCHAR(80)  NOT NULL,
  can_view     BOOLEAN NOT NULL DEFAULT FALSE,
  can_create   BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit     BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete   BOOLEAN NOT NULL DEFAULT FALSE,
  can_export   BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_key, resource)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_key);

-- منح افتراضي: مدير المنظومة كامل الصلاحيات على الموارد الأساسية
INSERT INTO role_permissions (role_key, resource, can_view, can_create, can_edit, can_delete, can_export, can_approve) VALUES
  ('system_admin', 'members',        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('system_admin', 'establishments', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('system_admin', 'violations',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('system_admin', 'reports',        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('system_admin', 'directories',    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('system_admin', 'settings',       TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('system_admin', 'users',          TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('sector_manager', 'members',      TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
  ('sector_manager', 'establishments', TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
  ('sector_manager', 'violations',   TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('inspector', 'establishments',    TRUE, TRUE, TRUE, FALSE, TRUE, FALSE),
  ('inspector', 'violations',        TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
  ('viewer', 'members',              TRUE, FALSE, FALSE, FALSE, TRUE, FALSE),
  ('viewer', 'establishments',       TRUE, FALSE, FALSE, FALSE, TRUE, FALSE)
ON CONFLICT (role_key, resource) DO NOTHING;

-- 3) سجل مهام النسخ الاحتياطي والجدولة
CREATE TABLE IF NOT EXISTS backup_jobs (
  id           BIGSERIAL PRIMARY KEY,
  job_type     VARCHAR(30) NOT NULL DEFAULT 'full', -- full|incremental|schema_only
  status       VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|running|completed|failed
  scheduled_at TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  size_bytes   BIGINT,
  file_path    TEXT,
  triggered_by VARCHAR(120),
  error_message TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) الاتصال الإداري (التعاميم والمذكرات الرسمية)
CREATE TABLE IF NOT EXISTS admin_communications (
  id            BIGSERIAL PRIMARY KEY,
  comm_number   VARCHAR(60) UNIQUE,
  comm_type     VARCHAR(30) NOT NULL DEFAULT 'circular', -- circular|memo|directive|announcement
  title         VARCHAR(300) NOT NULL,
  body          TEXT NOT NULL,
  priority      VARCHAR(20) NOT NULL DEFAULT 'normal', -- normal|urgent|confidential
  target_roles  TEXT[] DEFAULT '{}',
  target_sectors TEXT[] DEFAULT '{}',
  effective_date DATE,
  expiry_date   DATE,
  requires_ack  BOOLEAN NOT NULL DEFAULT FALSE,
  issued_by     VARCHAR(120),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_comms_active ON admin_communications(is_active, comm_type);

-- إقرارات الاستلام (للتعاميم التي تتطلب إقراراً)
CREATE TABLE IF NOT EXISTS communication_acknowledgments (
  id                BIGSERIAL PRIMARY KEY,
  communication_id  BIGINT NOT NULL REFERENCES admin_communications(id) ON DELETE CASCADE,
  user_email        VARCHAR(200) NOT NULL,
  acknowledged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (communication_id, user_email)
);