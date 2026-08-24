-- ============================================================
-- National Labor Platform — Enhanced Schema Migration
-- ترقية مخطط قاعدة البيانات الشاملة
-- وفق أفضل الممارسات العالمية
-- وزارة الشؤون الاجتماعية والعمل - الجمهورية اليمنية
-- ============================================================

-- ============================================================
-- 1. PROFESSIONS — المهن (من NOAS - ISCO-08)
-- ============================================================

CREATE TABLE IF NOT EXISTS professions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT UNIQUE NOT NULL,           -- رمز المهنة (مثل OCC-001)
  name_ar           TEXT NOT NULL,                  -- الاسم بالعربية
  name_en           TEXT,                           -- الاسم بالإنجليزية
  name_fr           TEXT,                           -- الاسم بالفرنسية
  
  -- تصنيف ISCO-08
  isco_code         TEXT NOT NULL,                  -- رمز ISCO-08
  major_group_code  TEXT NOT NULL,                  -- المجموعة الرئيسية
  major_group_name  TEXT NOT NULL,                  -- اسم المجموعة الرئيسية
  sub_major_group   TEXT,                           -- المجموعة الفرعية الرئيسية
  minor_group       TEXT,                           -- المجموعة الفرعية
  unit_group        TEXT,                           -- مجموعة الوحدة
  
  -- التصنيف
  sector            TEXT NOT NULL,                  -- القطاع الاقتصادي
  family            TEXT NOT NULL,                  -- العائلة المهنية
  level             INTEGER NOT NULL DEFAULT 1,     -- المستوى (1-6)
  status            TEXT NOT NULL DEFAULT 'مسودة' CHECK (status IN ('معتمدة', 'قيد المراجعة', 'مسودة')),
  
  -- الأوصاف
  description_ar    TEXT,                           -- الوصف بالعربية
  description_en    TEXT,                           -- الوصف بالإنجليزية
  scope             TEXT,                           -- النطاق
  
  -- بيئة العمل
  activity_category TEXT,
  syndicate         TEXT,
  indoor_site       TEXT,
  outdoor_site      TEXT,
  climate_condition TEXT,
  shift_pattern     TEXT,
  work_access       TEXT,
  max_service_years TEXT,
  work_hours_per_day TEXT,
  rest_break        TEXT,
  leaves_schedule   TEXT,
  
  -- الفحوصات الطبية
  medical_exams     JSONB DEFAULT '{}',            -- {preEmployment, onTransfer, periodic, postService, emergency}
  
  -- المخاطر والسلامة
  hazard_level      TEXT CHECK (hazard_level IN ('شديدة', 'متوسطة', 'منخفضة')),
  possible_hazards  TEXT[],
  potential_injuries TEXT[],
  occupational_diseases TEXT[],
  prevention_methods TEXT[],
  protective_equipment TEXT[],
  
  -- بطاقة الوصف الوظيفي
  qualifications    TEXT[],
  training_requirements TEXT[],
  pre_work_conditions TEXT[],
  onboarding        TEXT[],
  trial_period      TEXT,
  performance_evaluation TEXT[],
  incentives_and_penalties TEXT[],
  
  -- المهام
  tasks             JSONB DEFAULT '[]',
  
  -- الكفايات
  competencies      JSONB DEFAULT '[]',
  
  -- درجات التقييم
  skill_score       INTEGER DEFAULT 0,
  responsibility_score INTEGER DEFAULT 0,
  autonomy_score    INTEGER DEFAULT 0,
  complexity_score  INTEGER DEFAULT 0,
  hazard_score      INTEGER DEFAULT 0,
  total_score       NUMERIC(5,2) DEFAULT 0,
  grade             TEXT CHECK (grade IN ('ممتاز', 'متقدم', 'متوسط', 'مبتدئ')),
  
  -- الرواتب
  min_salary        NUMERIC(12, 2),
  max_salary        NUMERIC(12, 2),
  currency          TEXT DEFAULT 'YER',
  pay_frequency     TEXT CHECK (pay_frequency IN ('شهري', 'أسبوعي', 'يومي', 'بالساعة')),
  salary_grade      TEXT,
  
  -- المسار المهني
  career_path       JSONB DEFAULT '{}',
  
  -- المراجع القانونية
  legal_references  JSONB DEFAULT '[]',
  institutional_standards JSONB DEFAULT '[]',
  decree_number     TEXT,
  decree_year       TEXT,
  
  -- السياسات
  yemenization_policy TEXT,
  
  -- كلمات مفتاحية
  keywords          TEXT[],
  alternative_titles TEXT[],
  related_occupations TEXT[],
  
  -- مستويات العمل
  supervision_level TEXT,
  decision_making_level TEXT,
  physical_demands  TEXT[],
  tools_and_equipment TEXT[],
  technology_used   TEXT[],
  
  -- الحوكمة
  governance_metadata JSONB DEFAULT '{}',
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id),
  version           INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_professions_code ON professions(code);
CREATE INDEX idx_professions_isco ON professions(isco_code);
CREATE INDEX idx_professions_sector ON professions(sector);
CREATE INDEX idx_professions_family ON professions(family);
CREATE INDEX idx_professions_level ON professions(level);
CREATE INDEX idx_professions_status ON professions(status);
CREATE INDEX idx_professions_major_group ON professions(major_group_code);
CREATE INDEX idx_professions_name_ar ON professions USING gin(to_tsvector('arabic', name_ar));

-- ============================================================
-- 2. ENTERPRISE_OCCUPATION_LINKS — ربط المهن بالمنشآت
-- ============================================================

CREATE TABLE IF NOT EXISTS enterprise_occupation_links (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id     UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  occupation_id     UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  
  -- معلومات الكيان
  enterprise_name   TEXT NOT NULL,
  cr_number         TEXT,
  
  -- معلومات المهنة
  occupation_code   TEXT NOT NULL,
  occupation_name_ar TEXT NOT NULL,
  isco_code         TEXT,
  
  -- التنظيم
  department        TEXT,
  
  -- التوظيف
  allocated_headcount INTEGER NOT NULL DEFAULT 0,
  yemeni_headcount  INTEGER NOT NULL DEFAULT 0,
  expatriate_headcount INTEGER NOT NULL DEFAULT 0,
  
  -- الرواتب
  salary_scale      TEXT,
  contract_types    TEXT[],
  
  -- سياسة اليمننة
  yemenization_policy TEXT,
  
  -- الحالة
  link_status       TEXT NOT NULL DEFAULT 'نشط' CHECK (link_status IN ('نشط', 'معلق', 'منتهي')),
  
  -- الامتثال
  compliance_score  NUMERIC(5, 2) DEFAULT 0,
  labor_law_compliant BOOLEAN DEFAULT FALSE,
  salary_compliant  BOOLEAN DEFAULT FALSE,
  osh_compliant     BOOLEAN DEFAULT FALSE,
  medical_checks_done BOOLEAN DEFAULT FALSE,
  yemenization_compliant BOOLEAN DEFAULT FALSE,
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(enterprise_id, occupation_id)
);

CREATE INDEX idx_eol_enterprise ON enterprise_occupation_links(enterprise_id);
CREATE INDEX idx_eol_occupation ON enterprise_occupation_links(occupation_id);
CREATE INDEX idx_eol_status ON enterprise_occupation_links(link_status);

-- ============================================================
-- 3. INSPECTIONS — التفتيش
-- ============================================================

CREATE TYPE inspection_type AS ENUM ('روتينية', 'طارئة', 'سنوية', 'متابعة');
CREATE TYPE inspection_compliance AS ENUM ('متوافق بالكامل', 'متوافق جزئياً', 'غير متوافق');
CREATE TYPE evaluation_level AS ENUM ('basic', 'advanced', 'expert');

CREATE TABLE IF NOT EXISTS inspections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id     UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  
  -- معلومات التفتيش
  inspection_number TEXT UNIQUE NOT NULL,
  inspection_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_name    TEXT NOT NULL,
  inspector_title   TEXT,
  inspection_type   inspection_type NOT NULL DEFAULT 'روتينية',
  
  -- النتائج
  compliance_status inspection_compliance NOT NULL DEFAULT 'متوافق جزئياً',
  overall_score     NUMERIC(5, 2) NOT NULL DEFAULT 0,
  
  -- تقييم الامتثال
  labor_law_score   NUMERIC(5, 2) DEFAULT 0,
  safety_score      NUMERIC(5, 2) DEFAULT 0,
  training_score    NUMERIC(5, 2) DEFAULT 0,
  yemenization_score NUMERIC(5, 2) DEFAULT 0,
  quality_score     NUMERIC(5, 2) DEFAULT 0,
  
  -- المراجع القانونية
  labor_law_articles TEXT[],
  yemeni_decrees    TEXT[],
  international_standards TEXT[],
  
  -- الإحصائيات
  training_compliance_rate NUMERIC(5, 2) DEFAULT 0,
  occupational_safety_score NUMERIC(5, 2) DEFAULT 0,
  yemenization_rate NUMERIC(5, 2) DEFAULT 0,
  
  -- التوصيات
  recommendations   TEXT[],
  strengths         TEXT[],
  weaknesses        TEXT[],
  
  -- الجدول القادم
  next_inspection_date DATE,
  
  -- مستوى التقييم
  evaluation_model  TEXT DEFAULT 'standard',
  evaluation_level  evaluation_level DEFAULT 'basic',
  
  -- الملفات
  report_url        TEXT,
  attachments       JSONB DEFAULT '[]',
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inspections_enterprise ON inspections(enterprise_id);
CREATE INDEX idx_inspections_date ON inspections(inspection_date);
CREATE INDEX idx_inspections_type ON inspections(inspection_type);
CREATE INDEX idx_inspections_status ON inspections(compliance_status);

-- ============================================================
-- 4. EVALUATION_CERTIFICATES — شهادات التقييم
-- ============================================================

CREATE TYPE certificate_status AS ENUM ('صالحة', 'شرطية', 'ملغاة');

CREATE TABLE IF NOT EXISTS evaluation_certificates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id     UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  inspection_id     UUID REFERENCES inspections(id) ON DELETE SET NULL,
  
  -- معلومات الشهادة
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_period   INTEGER NOT NULL DEFAULT 365,  -- أيام
  expiry_date       DATE NOT NULL,
  
  -- النتيجة
  overall_score     NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status            certificate_status NOT NULL DEFAULT 'صالحة',
  
  -- فروع الامتثال
  labor_law_compliance BOOLEAN DEFAULT FALSE,
  safety_compliance    BOOLEAN DEFAULT FALSE,
  training_compliance  BOOLEAN DEFAULT FALSE,
  yemenization_compliance BOOLEAN DEFAULT FALSE,
  
  -- المهن المعتمدة
  certified_occupations TEXT[],
  
  -- ملخص التقييم
  evaluation_summary TEXT,
  
  -- التوقيعات
  issued_by         TEXT,
  approved_by       TEXT,
  signature_url     TEXT,
  
  -- الرمز QR
  qr_code_data      TEXT,
  
  -- الملفات المرفقة
  attachments       JSONB DEFAULT '[]',
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certificates_enterprise ON evaluation_certificates(enterprise_id);
CREATE INDEX idx_certificates_status ON evaluation_certificates(status);
CREATE INDEX idx_certificates_expiry ON evaluation_certificates(expiry_date);

-- ============================================================
-- 5. TRAINING_RECORDS — سجلات التدريب
-- ============================================================

CREATE TYPE training_status AS ENUM ('قيد التنفيذ', 'مكتمل', 'معلق', 'ملغي');

CREATE TABLE IF NOT EXISTS training_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id     UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  occupation_id     UUID REFERENCES professions(id) ON DELETE SET NULL,
  member_id         UUID REFERENCES members(id) ON DELETE SET NULL,
  
  -- معلومات التدريب
  training_name     TEXT NOT NULL,
  training_code     TEXT,
  training_provider TEXT,
  training_type     TEXT,
  
  -- التواريخ
  start_date        DATE NOT NULL,
  end_date          DATE,
  duration_hours    INTEGER DEFAULT 0,
  
  -- المشاركين
  employee_name     TEXT,
  employee_id       TEXT,
  
  -- النتيجة
  status            training_status NOT NULL DEFAULT 'قيد التنفيذ',
  assessment_score  NUMERIC(5, 2),
  certification_issued BOOLEAN DEFAULT FALSE,
  certification_number TEXT,
  
  -- الأساس التنظيمي
  regulatory_basis  TEXT,
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_enterprise ON training_records(enterprise_id);
CREATE INDEX idx_training_occupation ON training_records(occupation_id);
CREATE INDEX idx_training_status ON training_records(status);
CREATE INDEX idx_training_date ON training_records(start_date);

-- ============================================================
-- 6. HAZARDOUS_OCCUPATIONS — المهن الخطرة
-- ============================================================

CREATE TABLE IF NOT EXISTS hazardous_occupations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id     UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  occupation_code   TEXT NOT NULL,
  occupation_name_ar TEXT NOT NULL,
  occupation_name_en TEXT,
  
  -- معلومات المخاطر
  risk_level        INTEGER NOT NULL CHECK (risk_level BETWEEN 1 AND 6),
  hazard_category   TEXT NOT NULL,
  critical_tasks    TEXT[],
  
  -- المتطلبات
  safety_requirements TEXT[],
  medical_examinations TEXT[],
  protective_equipment TEXT[],
  training_requirements TEXT[],
  
  -- المعايير
  compliance_standards TEXT[],
  inspection_checklist JSONB DEFAULT '[]',
  
  -- المالية
  min_salary        NUMERIC(12, 2),
  
  -- السياسات
  yemenization_policy TEXT,
  isco_code         TEXT,
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hazardous_occupation ON hazardous_occupations(occupation_id);
CREATE INDEX idx_hazardous_risk ON hazardous_occupations(risk_level);

-- ============================================================
-- 7. LEGAL_REFERENCES — المراجع القانونية
-- ============================================================

CREATE TABLE IF NOT EXISTS legal_references (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  law_name_ar       TEXT NOT NULL,
  law_name_en       TEXT,
  law_number        TEXT,
  law_year          INTEGER,
  effective_date    DATE,
  status            TEXT DEFAULT 'نافذ' CHECK (status IN ('نافذ', 'ملغى', ' معدل')),
  summary           TEXT,
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS law_articles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_reference_id UUID NOT NULL REFERENCES legal_references(id) ON DELETE CASCADE,
  article_number    TEXT NOT NULL,
  title             TEXT NOT NULL,
  content           TEXT,
  scope             TEXT,
  penalties         TEXT,
  related_articles  TEXT[],
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_law_articles_reference ON law_articles(legal_reference_id);
CREATE INDEX idx_law_articles_number ON law_articles(article_number);

-- ============================================================
-- 8. INSTITUTIONAL_STANDARDS — المعايير المؤسسية
-- ============================================================

CREATE TABLE IF NOT EXISTS institutional_standards (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  standard_name     TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  standard_code     TEXT UNIQUE NOT NULL,
  description       TEXT,
  compliance_level  TEXT CHECK (compliance_level IN ('إلزامي', 'موصى به', 'استرشادي')),
  reference_url     TEXT,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. CAREER_PATHS — المسارات المهنية
-- ============================================================

CREATE TABLE IF NOT EXISTS career_paths (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id     UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  entry_level       TEXT NOT NULL,
  progression_levels TEXT[],
  promotion_criteria TEXT,
  training_path     TEXT[],
  certification_requirements TEXT[],
  lateral_moves     TEXT[],
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_paths_occupation ON career_paths(occupation_id);

-- ============================================================
-- 10. SALARY_RANGES — نطاقات الرواتب
-- ============================================================

CREATE TABLE IF NOT EXISTS salary_ranges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id     UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  min_salary        NUMERIC(12, 2) NOT NULL,
  max_salary        NUMERIC(12, 2) NOT NULL,
  currency          TEXT DEFAULT 'YER',
  pay_frequency     TEXT CHECK (pay_frequency IN ('شهري', 'أسبوعي', 'يومي', 'بالساعة')),
  allowances        TEXT[],
  overtime_policy   TEXT,
  salary_grade      TEXT,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salary_ranges_occupation ON salary_ranges(occupation_id);

-- ============================================================
-- 11. CONTRACT_TYPES — أنواع العقود
-- ============================================================

CREATE TABLE IF NOT EXISTS contract_types (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_name         TEXT NOT NULL,
  duration          TEXT,
  renewal_policy    TEXT,
  termination_notice TEXT,
  legal_basis       TEXT,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. WORKER_PROCEDURES — إجراءات العمال
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_procedures (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_code    TEXT UNIQUE NOT NULL,
  name_ar           TEXT NOT NULL,
  name_en           TEXT,
  step_number       INTEGER NOT NULL,
  description       TEXT,
  required_compliance TEXT[],
  estimated_duration TEXT,
  safety_requirements TEXT[],
  checklist         TEXT[],
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. EXPERT_OPINIONS — الآراء الخبرائية
-- ============================================================

CREATE TABLE IF NOT EXISTS expert_opinions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id     UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  expert_name       TEXT NOT NULL,
  expert_role       TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT,
  
  -- تقييم 5 محاور
  skill_rating      INTEGER CHECK (skill_rating BETWEEN 1 AND 10),
  responsibility_rating INTEGER CHECK (responsibility_rating BETWEEN 1 AND 10),
  autonomy_rating   INTEGER CHECK (autonomy_rating BETWEEN 1 AND 10),
  complexity_rating INTEGER CHECK (complexity_rating BETWEEN 1 AND 10),
  hazard_rating     INTEGER CHECK (hazard_rating BETWEEN 1 AND 10),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expert_opinions_occupation ON expert_opinions(occupation_id);

-- ============================================================
-- 14. LABOR_DISPUTES — النزاعات العمالية
-- ============================================================

CREATE TYPE dispute_status AS ENUM ('قيد النظر', 'تم التسوية ودياً', 'محال للقضاء العمالي');

CREATE TABLE IF NOT EXISTS labor_disputes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id     UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  enterprise_name   TEXT NOT NULL,
  worker_name       TEXT NOT NULL,
  occupation_id     UUID REFERENCES professions(id) ON DELETE SET NULL,
  
  -- تفاصيل النزاع
  dispute_type      TEXT NOT NULL,
  dispute_description TEXT NOT NULL,
  dispute_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- التسوية
  settlement_proposal TEXT,
  status            dispute_status NOT NULL DEFAULT 'قيد النظر',
  resolution_date   DATE,
  resolution_notes  TEXT,
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_enterprise ON labor_disputes(enterprise_id);
CREATE INDEX idx_disputes_status ON labor_disputes(status);

-- ============================================================
-- 15. EXPATRIATE_LICENSES — تراخيص العمالة الوافدة
-- ============================================================

CREATE TYPE expatriate_license_status AS ENUM ('نشط', 'منتهي', 'ملغي');

CREATE TABLE IF NOT EXISTS expatriate_licenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id     UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  link_id           UUID REFERENCES enterprise_occupation_links(id) ON DELETE SET NULL,
  
  -- معلومات العامل
  expatriate_name   TEXT NOT NULL,
  expatriate_nationality TEXT NOT NULL,
  passport_number   TEXT,
  
  -- التراخيص
  license_number    TEXT UNIQUE NOT NULL,
  issue_date        DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  
  -- خطة الاستبدال
  linked_replacement_plan TEXT,
  
  -- الحالة
  status            expatriate_license_status NOT NULL DEFAULT 'نشط',
  
  -- التدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expatriate_enterprise ON expatriate_licenses(enterprise_id);
CREATE INDEX idx_expatriate_status ON expatriate_licenses(status);
CREATE INDEX idx_expatriate_expiry ON expatriate_licenses(expiry_date);

-- ============================================================
-- 16. MATURITY_ASSESSMENTS — تقييمات النضج
-- ============================================================

CREATE TABLE IF NOT EXISTS maturity_assessments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  
  -- النتيجة
  overall_score     NUMERIC(5, 2) NOT NULL DEFAULT 0,
  grade             TEXT CHECK (grade IN ('نموذجية', 'متقدمة', 'متكاملة', 'أساسية', 'مبدئية')),
  
  -- الأقسام (7 أقسام مرجحة)
  identity_score    NUMERIC(5, 2) DEFAULT 0,     -- 12%
  description_score NUMERIC(5, 2) DEFAULT 0,     -- 18%
  tasks_score       NUMERIC(5, 2) DEFAULT 0,     -- 16%
  competencies_score NUMERIC(5, 2) DEFAULT 0,    -- 14%
  safety_score      NUMERIC(5, 2) DEFAULT 0,     -- 14%
  career_score      NUMERIC(5, 2) DEFAULT 0,     -- 10%
  governance_score  NUMERIC(5, 2) DEFAULT 0,     -- 16%
  
  -- التقارير
  missing_count     INTEGER DEFAULT 0,
  red_flags         TEXT[],
  recommendations   TEXT[],
  
  -- التدقيق
  assessment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  assessed_by       UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maturity_entity ON maturity_assessments(entity_id);
CREATE INDEX idx_maturity_date ON maturity_assessments(assessment_date);

-- ============================================================
-- 17. INSPECTION_CHECKLISTS — قوائم التفتيش
-- ============================================================

CREATE TABLE IF NOT EXISTS inspection_checklists (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id     UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  
  -- البند
  checklist_item    TEXT NOT NULL,
  category          TEXT NOT NULL,
  is_compliant      BOOLEAN DEFAULT FALSE,
  notes             TEXT,
  evidence_url      TEXT,
  severity          TEXT CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_inspection ON inspection_checklists(inspection_id);

-- ============================================================
-- 18. COMMERCIAL_ESTABLISHMENTS — المنشآت التجارية (تحسين)
-- ============================================================

-- إضافة أعمدة غنية للمنشآت التجارية الحالية
ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  legal_form TEXT;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  economic_sector TEXT;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  establishment_date DATE;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  total_employees INTEGER DEFAULT 0;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  yemenization_rate NUMERIC(5, 2) DEFAULT 0;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  compliance_score NUMERIC(5, 2) DEFAULT 0;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  last_inspection_date DATE;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  next_inspection_date DATE;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  license_expiry_date DATE;

ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS
  metadata JSONB DEFAULT '{}';

-- ============================================================
-- 19. FUNCTIONS & TRIGGERS — دوال إضافية
-- ============================================================

-- تحديث updated_at للمحافظات الجديدة
CREATE OR REPLACE TRIGGER trg_professions_updated_at
  BEFORE UPDATE ON professions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_eol_updated_at
  BEFORE UPDATE ON enterprise_occupation_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_certificates_updated_at
  BEFORE UPDATE ON evaluation_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_training_updated_at
  BEFORE UPDATE ON training_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON labor_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_expatriate_updated_at
  BEFORE UPDATE ON expatriate_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- حساب معدل اليمننة تلقائياً
CREATE OR REPLACE FUNCTION compute_yemenization_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.allocated_headcount > 0 THEN
    NEW.compliance_score := ROUND(
      (NEW.yemeni_headcount::NUMERIC / NEW.allocated_headcount * 100), 2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_yemenization
  BEFORE INSERT OR UPDATE OF yemeni_headcount, allocated_headcount
  ON enterprise_occupation_links
  FOR EACH ROW EXECUTE FUNCTION compute_yemenization_rate();

-- حساب تاريخ انتهاء الصلاحية تلقائياً
CREATE OR REPLACE FUNCTION compute_certificate_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.issue_date IS NOT NULL AND NEW.validity_period IS NOT NULL THEN
    NEW.expiry_date := NEW.issue_date + (NEW.validity_period || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_certificate_expiry
  BEFORE INSERT OR UPDATE OF issue_date, validity_period
  ON evaluation_certificates
  FOR EACH ROW EXECUTE FUNCTION compute_certificate_expiry();

-- ============================================================
-- 20. VIEWS — مشاهدات إضافية
-- ============================================================

-- عرض المهن مع الإحصائيات
CREATE OR REPLACE VIEW professions_summary AS
SELECT
  p.id,
  p.code,
  p.name_ar,
  p.isco_code,
  p.sector,
  p.family,
  p.level,
  p.status,
  p.hazard_level,
  p.total_score,
  p.grade,
  COUNT(DISTINCT eol.id) AS linked_enterprises,
  SUM(eol.allocated_headcount) AS total_headcount,
  SUM(eol.yemeni_headcount) AS total_yemeni
FROM professions p
LEFT JOIN enterprise_occupation_links eol ON eol.occupation_id = p.id
GROUP BY p.id;

-- عرض المنشآت مع معدلات الامتثال
CREATE OR REPLACE VIEW enterprise_compliance_summary AS
SELECT
  e.entity_id,
  e.name_ar,
  e.governorate,
  COUNT(DISTINCT i.id) AS total_inspections,
  MAX(i.inspection_date) AS last_inspection,
  AVG(i.overall_score) AS avg_inspection_score,
  COUNT(DISTINCT ec.id) AS total_certificates,
  COUNT(DISTINCT ec.id) FILTER (WHERE ec.status = 'صالحة') AS valid_certificates,
  COUNT(DISTINCT eol.id) AS linked_occupations,
  AVG(eol.compliance_score) AS avg_compliance_score
FROM organizational_entities e
LEFT JOIN inspections i ON i.enterprise_id = e.entity_id
LEFT JOIN evaluation_certificates ec ON ec.enterprise_id = e.entity_id
LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.entity_id
WHERE e.deleted_at IS NULL
GROUP BY e.entity_id;

-- عرض الإحصائيات العامة
CREATE OR REPLACE VIEW system_statistics AS
SELECT
  (SELECT COUNT(*) FROM professions WHERE status = 'معتمدة') AS total_professions,
  (SELECT COUNT(*) FROM organizational_entities WHERE deleted_at IS NULL) AS total_entities,
  (SELECT COUNT(*) FROM members) AS total_members,
  (SELECT COUNT(*) FROM inspections) AS total_inspections,
  (SELECT COUNT(*) FROM evaluation_certificates WHERE status = 'صالحة') AS valid_certificates,
  (SELECT COUNT(*) FROM training_records WHERE status = 'مكتمل') AS completed_trainings,
  (SELECT COUNT(*) FROM labor_disputes WHERE status = 'قيد النظر') AS pending_disputes,
  (SELECT COUNT(*) FROM expatriate_licenses WHERE status = 'نشط') AS active_expatriate_licenses;

-- ============================================================
-- 21. SEED DATA — بيانات أولية
-- ============================================================

-- إدراج المراجع القانونية الأساسية
INSERT INTO legal_references (law_name_ar, law_name_en, law_number, law_year, status, summary) VALUES
  ('قانون العمل اليمني', 'Yemeni Labor Law', '1', 1995, 'نافذ', 'القانون الأساسي لتنظيم العلاقات العمالية في اليمن'),
  ('قرار وزاري 42/2020', 'Ministerial Decree 42/2020', '42', 2020, 'نافذ', 'التفتيش الميداني الموحد على المنشآت'),
  ('قرار وزاري 15/2018', 'Ministerial Decree 15/2018', '15', 2018, 'نافذ', 'نسبة اليمننة في المنشآت الخاصة'),
  ('اتفاقية ILO 87', 'ILO Convention 87', '87', 1948, 'نافذ', 'حرية تأسيس النقابات العمالية'),
  ('اتفاقية ILO 98', 'ILO Convention 98', '98', 1949, 'نافذ', 'حق التنظيم والمفاوضة الجماعية');

-- إدراج إجراءات العمال الأساسية
INSERT INTO worker_procedures (procedure_code, name_ar, name_en, step_number, description, estimated_duration) VALUES
  ('PRC-001', 'دخول العامل', 'Worker Entry', 1, 'إجراءات تسجيل دخول العامل للمؤسسة', '15 دقيقة'),
  ('PRC-002', 'السلامة اليومية', 'Daily Safety', 2, 'إجراءات السلامة اليومية قبل البدء بالعمل', '10 دقائق'),
  ('PRC-003', 'الفحص الطبي الدوري', 'Periodic Medical', 3, 'الفحوصات الطبية الدورية للعمال', 'ساعة واحدة'),
  ('PRC-004', 'الإخلاء والطوارئ', 'Evacuation/Emergency', 4, 'إجراءات الإخلاء في حالات الطوارئ', '5 دقائق'),
  ('PRC-005', 'الإبلاغ عن الحوادث', 'Incident Reporting', 5, 'إجراءات الإبلاغ عن الحوادث_WORKPLACE', '15 دقيقة');

-- إدراج أنواع العقود الأساسية
INSERT INTO contract_types (type_name, duration, renewal_policy, termination_notice, legal_basis) VALUES
  ('دائم', 'غير محدد', 'تلقائي', '30 يوماً', 'قانون العمل المادة 25'),
  ('عقد مشروع', 'محدد حسب المشروع', 'قابل للتجديد', '14 يوماً', 'قانون العمل المادة 26'),
  ('مؤقت', '6 أشهر', 'قابل للتجديد مرتين', '7 أيام', 'قانون العمل المادة 27'),
  ('تدريبي', '3-6 أشهر', 'غير قابل للتجديد', '7 أيام', 'قرار وزاري 15/2018');

-- ============================================================
-- END OF MIGRATION
-- ============================================================
