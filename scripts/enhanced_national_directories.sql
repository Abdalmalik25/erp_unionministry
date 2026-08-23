-- ============================================================================
-- enhanced_national_directories.sql — المنظومة الوطنية المتقدمة
-- وفق المتطلبات الإضافية: منصة العمل | الأدلة الوطنية | أدوار المستخدمين
--
-- يكمل الجداول القديمة (professions, isic4_classifications,
-- commercial_establishments, organizational_entities) دون كسرها:
--   1) labor_roles                       — أدوار منظومة العمل
--   2) national_directories              — أبعاد التصنيف الوطنية الموحدة
--   3) national_occupation_details       — تفاصيل المهن (ISCO) + طلب السوق
--   4) sector_property_matrix            — خصائص القطاعات والأنشطة
--   5) establishment_classification_matrix — تصنيف المنشآت الموحد
--   6) national_operational_indicator_log — مؤشرات التشغيل الوطني
--   7) role_dashboard_quick_links        — خلاصات الأدوار
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 1) أدوار منظومة العمل ----------
CREATE TABLE IF NOT EXISTS labor_roles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key         TEXT UNIQUE NOT NULL,
  role_name_ar     TEXT NOT NULL,
  role_name_en     TEXT,
  description      TEXT,
  icon             TEXT,
  focus_areas      TEXT[] DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO labor_roles (role_key, role_name_ar, role_name_en, description, focus_areas)
VALUES
  ('employer', 'صاحب العمل', 'Employer', 'إدارة منشأتي وتسجيل عمالي والالتزام بأنظمة العمل وتقليص العمالة', ARRAY['سجلات المنشأة','طلبات التقليص','مصادقة العقود','الالتزام بقانون العمل','السلامة المهنية']),
  ('worker', 'العامل', 'Worker', 'ملفي المهني، لياقتي الصحية، شهادات خبرتي، نزاعاتي، إجراءاتي', ARRAY['ملف العامل','اللياقة الصحية','شهادات الخبرة','النزاعات','إصابات العمل']),
  ('job_seeker', 'باحث عن عمل', 'Job Seeker', 'مسارات التوظيف، التأهيل، المهن المطلوبة', ARRAY['المهن المطلوبة','التدريب','التوظيف']),
  ('registration_office', 'مكتب تسجيل', 'Registration Office', 'تسجيل المنشآت والعمال والعمالة غير المنتظمة في نطاقي', ARRAY['سجل المنشآت','سجل العمال','العمالة غير المنتظمة','شهادات اللياقة']),
  ('union', 'اتحادات ونقابات عمالية ومهنية', 'Union', 'إدارة الأعضاء والانتخابات والنزاعات والتمدن العمالي والنشاطات', ARRAY['الأعضاء','الانتخابات','النزاعات','التأمين','الثقافة العمالية']),
  ('ministry_staff', 'موظف الوزارة', 'Ministry Staff', 'إدارة الملفات والسجلات والمعاملات وفق مسار العمل', ARRAY['الملفات','المعاملات','الموظفين','السجلات']),
  ('decision_maker', 'متخذ القرار', 'Decision Maker', 'مؤشرات الوطن التشغيلية، التقارير الرقابية، الالتزام والمخاطر', ARRAY['المؤشرات','التقارير','التحليل المقارن','مخاطر قطاعية']),
  ('inspector', 'المفتش', 'Inspector', 'التفتيش الميداني، محاضر التفتيش، المعايير، المخالفات', ARRAY['مهام التفتيش','معايير التفتيش','المخالفات','متابعة الإصلاح']),
  ('trainer', 'المدرب', 'Trainer', 'البرامج التدريبية، مناشئ التأهيل، المستويات والتقييم', ARRAY['البرامج','مجموعات المتدربين','التقييم','شهادات التدريب'])
ON CONFLICT (role_key) DO NOTHING;

-- ---------- 2) أبعاد التصنيف الوطنية الموحدة ----------
CREATE TABLE IF NOT EXISTS national_directories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_type TEXT NOT NULL CHECK (directory_type IN ('occupation','activity','establishment','legal_form','ownership')),
  code           TEXT NOT NULL,
  name_ar        TEXT NOT NULL,
  name_en        TEXT,
  parent_code    TEXT,
  level          INTEGER DEFAULT 1,
  sort_order     INTEGER DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (directory_type, code)
);
CREATE INDEX IF NOT EXISTS idx_ndirectories_type ON national_directories(directory_type) WHERE is_active = TRUE;

-- ---------- 3) تفاصيل المهن الوطنية ----------
CREATE TABLE IF NOT EXISTS national_occupation_details (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occupation_id            UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  occupation_code          TEXT,
  isco_level               INTEGER DEFAULT 4,
  skill_type               INTEGER DEFAULT 1,
  skill_type_name          TEXT,
  roles_expectations       TEXT[],
  industry_isic_codes      TEXT[],
  safety_risks             TEXT[],
  medical_fitness_required BOOLEAN DEFAULT FALSE,
  certification_required   BOOLEAN DEFAULT FALSE,
  typical_salary_min       NUMERIC(12,2),
  typical_salary_max       NUMERIC(12,2),
  in_demand_priority       INTEGER DEFAULT 0,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  metadata                 JSONB DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_nat_occ_occupation ON national_occupation_details(occupation_id) WHERE is_active = TRUE;

-- ---------- 4) خصائص القطاع ----------
CREATE TABLE IF NOT EXISTS sector_property_matrix (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_key          TEXT NOT NULL UNIQUE,
  isic4_codes         TEXT[],
  occupation_codes    TEXT[],
  risk_level          TEXT DEFAULT 'medium',
  legal_references    TEXT[],
  labor_intensity     TEXT DEFAULT 'medium',
  yemenization_default NUMERIC(5,2) DEFAULT 80,
  notes               TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sector_matrix_key ON sector_property_matrix(sector_key);

-- ---------- 5) تصنيف المنشآت الموحد ----------
CREATE TABLE IF NOT EXISTS establishment_classification_matrix (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id         UUID REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  entity_id                UUID REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  sector_class             TEXT,
  isic4_code               TEXT,
  national_activity        TEXT,
  legal_form               TEXT,
  size_band                TEXT CHECK (size_band IN ('متناهية الصغر','صغيرة','متوسطة','كبيرة')),
  ownership_type           TEXT DEFAULT 'خاص',
  prior_classification     TEXT,
  inspection_risk_score    NUMERIC(5,2) DEFAULT 0,
  unemployment_risk         NUMERIC(5,2) DEFAULT 0,
  notes                    TEXT,
  metadata                 JSONB DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_est_class_est ON establishment_classification_matrix(establishment_id) WHERE establishment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_est_class_ent ON establishment_classification_matrix(entity_id) WHERE entity_id IS NOT NULL;

-- ---------- 5) مؤشرات التشغيل الوطني ----------
CREATE TABLE IF NOT EXISTS national_operational_indicator_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code          TEXT NOT NULL,
  indicator_name_ar        TEXT NOT NULL,
  reporting_period_start  DATE,
  reporting_period_end    DATE,
  value_numeric           NUMERIC(14,2),
  value_text              TEXT,
  unit                    TEXT,
  direction_good          TEXT CHECK (direction_good IN ('up','down')),
  related_role_keys       TEXT[],
  related_region          TEXT,
  source_table            TEXT,
  notes                   TEXT,
  metadata                JSONB DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oper_indicator_code ON national_operational_indicator_log(indicator_code, reporting_period_start DESC);

-- ---------- 6) خلاصات الأدوار ----------
CREATE TABLE IF NOT EXISTS role_dashboard_quick_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key      TEXT REFERENCES labor_roles(role_key) ON DELETE CASCADE,
  sort_order    INTEGER DEFAULT 0,
  link_label    TEXT NOT NULL,
  link_path     TEXT NOT NULL,
  description   TEXT NOT NULL,
  icon_name     TEXT,
  target        TEXT DEFAULT '_self',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO role_dashboard_quick_links (role_key, sort_order, link_label, link_path, description, icon_name, target)
VALUES
  ('employer', 1, 'سجل منشأتي', '/ministry/commercial', 'بيانات سجل المنشأة الرسمي', 'building', '_self'),
  ('employer', 2, 'طلبات التقليص العمالي', '/ministry/reduction-requests', 'الاستغناءات الاقتصادية المعتمدة', 'minus-circle', '_self'),
  ('employer', 3, 'تراخيص العمالة الوافدة', '/ministry/expatriate-licenses', 'إدارة المصادقات للعمال الوافدين', 'globe', '_self'),
  ('employer', 4, 'إصابات عملي', '/ministry/labor-records/work-injuries', 'تبليغ ومتابعة إصابات العمل', 'heart-pulse', '_self'),
  ('worker', 1, 'ملفي الرقمي للعمالة', '/ministry/worker-profiles', 'بيانات ملفي المهنية', 'user', '_self'),
  ('worker', 2, 'شهادات اللياقة الصحية', '/ministry/labor-records/health-fitness-certificates', 'مستندات اللياقة الطبية', 'badge-check', '_self'),
  ('worker', 3, 'شهادات الخبرة', '/ministry/labor-records/experience-certificates', 'توثيق خبراتي المهنية', 'file-check-2', '_self'),
  ('worker', 4, 'إصابات عملي', '/ministry/labor-records/work-injuries', 'تبليغ ومتابعة الإصابات', 'heart-pulse', '_self'),
  ('job_seeker', 1, 'استوديو المهن المطلوبة', '/ministry/professions', 'استكشف المهن ودرجة الطلب', 'briefcase', '_self'),
  ('job_seeker', 2, 'برامج التدريب', '/ministry/training-records', 'فرص التأهيل المهني', 'graduation-cap', '_self'),
  ('job_seeker', 3, 'شهادات الخبرة', '/ministry/labor-records/experience-certificates', 'توثيق خبراتي', 'file-check-2', '_self'),
  ('registration_office', 1, 'سجل المنشآت', '/ministry/commercial', 'قيد المنشآت في نطاقي', 'building', '_self'),
  ('registration_office', 2, 'سجل العمال', '/ministry/worker-profiles', 'قيد العمال', 'users', '_self'),
  ('registration_office', 3, 'العمالة غير المنتظمة', '/ministry/labor-records/irregular-workers', 'قيد وتدبير العمالة غير المنتظمة', 'user', '_self'),
  ('union', 1, 'أعضاء المنظمة', '/ministry/members', 'سجل النقابيين', 'users', '_self'),
  ('union', 2, 'الانتخابات النقابية', '/ministry/elections', 'الدورات الانتخابية', 'vote', '_self'),
  ('union', 3, 'الأنشطة النقابية', '/ministry/activities', 'سجل الفعاليات', 'activity', '_self'),
  ('ministry_staff', 1, 'الموسوعة القانونية', '/ministry/legal-references', 'قانون العمل وأنظمته', 'book', '_self'),
  ('ministry_staff', 2, 'التنبيهات الامتثال', '/ministry/compliance-alerts', 'تنبيهات الالتزام المؤسسي', 'bell', '_self'),
  ('ministry_staff', 3, 'الموظفين', '/ministry/labor-records/ministry-employees', 'موظفو الوزارة والمكاتب', 'user-cog', '_self'),
  ('decision_maker', 1, 'التقارير الرقابية', '/ministry/reports', 'الملخصات التشغيلية', 'bar-chart', '_self'),
  ('decision_maker', 2, 'التحليل المقارن', '/ministry/comparative', 'تحليلات استشراف', 'git-compare', '_self'),
  ('decision_maker', 3, 'تقييم المخاطر', '/ministry/risk-assessments', 'مخاطر تنبؤية', 'trending-up', '_self'),
  ('inspector', 1, 'التفتيش الميداني', '/ministry/inspections', 'السلامة المهنية الميدانية', 'clipboard-check', '_self'),
  ('inspector', 2, 'معايير التفتيش', '/ministry/labor-records/inspection-criteria', 'معايير سجل التفتيش', 'list-checks', '_self'),
  ('inspector', 3, 'المخالفات العمالية', '/ministry/violations', 'سجل المخالفات والإجراءات', 'alert-triangle', '_self'),
  ('trainer', 1, 'البرامج التدريبية', '/ministry/training-records', 'جميع جلسات التدريب', 'graduation-cap', '_self'),
  ('trainer', 2, 'شهادات الكفاءة', '/ministry/evaluation-certificates', 'مستويات الكفاءة المهنية', 'award', '_self')
ON CONFLICT (id) DO NOTHING;

-- ---------- 7) عينة أدلة وطنية أولية ----------
INSERT INTO national_directories (directory_type, code, name_ar, name_en, parent_code, level, sort_order)
VALUES
  ('ownership', 'GOV', 'حكومي', 'Government', NULL, 1, 1),
  ('ownership', 'MIX', 'مختلط', 'Mixed', NULL, 1, 2),
  ('ownership', 'PRV', 'خاص', 'Private', NULL, 1, 3),
  ('ownership', 'FGN', 'أجنبي', 'Foreign', NULL, 1, 4),
  ('legal_form', 'COM', 'شركة', 'Company', NULL, 1, 1),
  ('legal_form', 'EST', 'مؤسسة', 'Establishment', NULL, 1, 2),
  ('legal_form', 'SHOP', 'محل تجاري', 'Shop', NULL, 1, 3),
  ('legal_form', 'OFF', 'مكتب', 'Office', NULL, 1, 4),
  ('legal_form', 'CTR', 'مركز', 'Center', NULL, 1, 5),
  ('establishment', 'MICRO', 'متناهية الصغر (1-4 عامل)', 'Micro', NULL, 1, 1),
  ('establishment', 'SML', 'صغيرة (5-49 عامل)', 'Small', NULL, 1, 2),
  ('establishment', 'MED', 'متوسطة (50-249 عامل)', 'Medium', NULL, 1, 3),
  ('establishment', 'LRG', 'كبيرة (250+ عامل)', 'Large', NULL, 1, 4)
ON CONFLICT (directory_type, code) DO NOTHING;

-- ---------- 8) ملخص المنظومة ----------
SELECT 'Enhanced national directories loaded' AS status;