-- ============================================================================
-- add_missing_records.sql — استكمال السجلات الناقصة وفق "المتطلبات الإضافية للنظام"
-- برنامج قطاع شؤون العمل | وزارة الشؤون الاجتماعية والعمل
--
-- يغطي:
--   1) directorates                  — المديريات (المستوى الثاني في التسلسل محافظة/مديرية/عزلة)
--   2) ministry_offices              — سجل مكاتب الوزارة (ثلاثة مستويات + الاختصاص)
--   3) inspectors                    — سجل المفتشين (يرتبط بالمكاتب والتفتيش)
--   4) ministry_employees            — سجل الموظفين
--   5) inspection_criteria           — سجل معايير التفتيش (يرتبط بالقطاع ونوع المنشأة)
--   6) work_injuries                 — سجل الإصابات العملية والأمراض المهنية
--   7) insurance_records             — سجل التأمين
--   8) irregular_workers             — سجل العمالة غير المنتظمة
--   9) health_fitness_certificates   — سجل شهادات اللياقة الصحية
--  10) experience_certificates       — سجل شهادات الخبرة
-- ============================================================================

-- ---------- أدوات مساعدة ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 1) المديريات ----------
CREATE TABLE IF NOT EXISTS directorates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE,
  name_ar      TEXT NOT NULL,
  governorate  TEXT NOT NULL,
  notes        TEXT,
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  deleted_by   UUID
);
CREATE INDEX IF NOT EXISTS idx_directorates_gov ON directorates(governorate) WHERE deleted_at IS NULL;

-- ---------- 2) مكاتب الوزارة ----------
CREATE TABLE IF NOT EXISTS ministry_offices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code    TEXT UNIQUE,
  office_name    TEXT NOT NULL,
  -- ثلاثة مستويات: وزارة / مكتب محافظة / مكتب مديرية
  office_level   TEXT NOT NULL DEFAULT 'مكتب محافظة'
                 CHECK (office_level IN ('وزارة', 'مكتب محافظة', 'مكتب مديرية')),
  parent_office_id UUID REFERENCES ministry_offices(id),
  governorate    TEXT,
  directorate_id UUID REFERENCES directorates(id),
  jurisdiction   TEXT,               -- الاختصاص (نطاق العمل القانوني)
  address        TEXT,
  phone          TEXT,
  email          TEXT,
  manager_name   TEXT,
  manager_phone  TEXT,
  employees_count INTEGER DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'نشط',
  notes          TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  deleted_by     UUID
);
CREATE INDEX IF NOT EXISTS idx_ministry_offices_gov ON ministry_offices(governorate) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ministry_offices_dir ON ministry_offices(directorate_id) WHERE deleted_at IS NULL;

-- ---------- 3) المفتشون ----------
CREATE TABLE IF NOT EXISTS inspectors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_code    TEXT UNIQUE,
  full_name         TEXT NOT NULL,
  national_id       TEXT,
  gender            TEXT CHECK (gender IN ('ذكر', 'أنثى')),
  job_title         TEXT,
  specialization    TEXT,             -- الاختصاص (سلامة مهنية، شؤون عمل، ...)
  inspector_level   TEXT DEFAULT 'مفتش'
                    CHECK (inspector_level IN ('مفتش متدرب', 'مبتدئ', 'متوسط', 'مفتش', 'متخصص', 'متقدم')),
  office_id         UUID REFERENCES ministry_offices(id),
  employment_source TEXT DEFAULT 'من الوزارة' CHECK (employment_source IN ('من الوزارة', 'من المكتب')),
  phone             TEXT,
  email             TEXT,
  appointment_date  DATE,
  is_osh_certified  BOOLEAN DEFAULT FALSE,
  osh_cert_date     DATE,
  last_evaluation_score NUMERIC(5,2),
  status            TEXT NOT NULL DEFAULT 'نشط',
  notes             TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID
);
CREATE INDEX IF NOT EXISTS idx_inspectors_office ON inspectors(office_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspectors_name ON inspectors(full_name) WHERE deleted_at IS NULL;

-- ---------- 4) الموظفون ----------
CREATE TABLE IF NOT EXISTS ministry_employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code   TEXT UNIQUE,
  full_name       TEXT NOT NULL,
  national_id     TEXT,
  gender          TEXT CHECK (gender IN ('ذكر', 'أنثى')),
  job_title       TEXT,
  department      TEXT,
  office_id       UUID REFERENCES ministry_offices(id),
  employment_type TEXT DEFAULT 'دائم' CHECK (employment_type IN ('دائم', 'تعاقدي', 'موقت', 'متدرب')),
  job_description_ref TEXT,          -- مرجع بطاقة الوصف الوظيفي (لبرنامج التدريب)
  qualification   TEXT,
  hire_date       DATE,
  phone           TEXT,
  email           TEXT,
  status          TEXT NOT NULL DEFAULT 'نشط',
  notes           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID
);
CREATE INDEX IF NOT EXISTS idx_ministry_employees_office ON ministry_employees(office_id) WHERE deleted_at IS NULL;

-- ---------- 5) معايير التفتيش ----------
CREATE TABLE IF NOT EXISTS inspection_criteria (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_code      TEXT UNIQUE,
  title_ar           TEXT NOT NULL,
  description        TEXT,
  -- يرتبط بالنوع والقطاع ونوع المنشأة والنشاط
  sector             TEXT,            -- حكومي / تجاري / صناعي / سياحي / مصرفي / تعليمي / صحي / تعدين / مختلط / خاص
  establishment_type TEXT,            -- شركة / مؤسسة / محل / مركز / مكتب / ورشة ...
  activity_isic4     TEXT,            -- رمز النشاط الاقتصادي إن كان المعيار خاصاً بنشاط
  inspection_kind    TEXT DEFAULT 'دوري' CHECK (inspection_kind IN ('دوري', 'حسب الطلب', 'متخصص', 'استثنائي', 'إعادة تفتيش')),
  applies_to         TEXT DEFAULT 'جميع المنشآت' CHECK (applies_to IN ('جميع المنشآت', 'حسب القطاع', 'حسب النوع', 'حسب النشاط', 'حسب الحجم')),
  frequency_months   INTEGER,         -- الدورية بالأشهر للتفتيش الدوري
  weight             NUMERIC(5,2) DEFAULT 1,
  is_mandatory       BOOLEAN DEFAULT TRUE,
  legal_reference    TEXT,            -- المادة/النظام المرجعي
  status             TEXT NOT NULL DEFAULT 'ساري',
  notes              TEXT,
  metadata           JSONB DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  deleted_by         UUID
);
CREATE INDEX IF NOT EXISTS idx_inspection_criteria_sector ON inspection_criteria(sector) WHERE deleted_at IS NULL;

-- ---------- 6) الإصابات العملية والأمراض المهنية ----------
CREATE TABLE IF NOT EXISTS work_injuries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_number        TEXT UNIQUE,
  case_type            TEXT NOT NULL DEFAULT 'إصابة عمل'
                       CHECK (case_type IN ('إصابة عمل', 'مرض مهني', 'وفاة عمل', 'إعاقة عمل')),
  worker_name          TEXT NOT NULL,
  worker_national_id   TEXT,
  enterprise_name      TEXT,
  commercial_register  TEXT,
  governorate          TEXT,
  injury_date          DATE NOT NULL,
  report_date          DATE,
  severity             TEXT DEFAULT 'متوسطة' CHECK (severity IN ('بسيطة', 'متوسطة', 'خطيرة', 'وفاة')),
  body_part            TEXT,
  cause_description    TEXT,
  location             TEXT,
  lost_work_days       INTEGER DEFAULT 0,
  medical_facility     TEXT,
  medical_status       TEXT,
  insurance_claimed    BOOLEAN DEFAULT FALSE,
  claim_number         TEXT,
  compensation_amount  NUMERIC(14,2),
  committee_decision   TEXT,           -- قرار لجنة التحقيق/الصحة والسلامة
  status               TEXT NOT NULL DEFAULT 'مبلغة'
                       CHECK (status IN ('مبلغة', 'قيد التحقيق', 'قيد المعالجة', 'مغلقة', 'معوَّضة')),
  notes                TEXT,
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  deleted_by           UUID
);
CREATE INDEX IF NOT EXISTS idx_work_injuries_enterprise ON work_injuries(enterprise_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_injuries_date ON work_injuries(injury_date) WHERE deleted_at IS NULL;

-- ---------- 7) التأمين ----------
CREATE TABLE IF NOT EXISTS insurance_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number     TEXT UNIQUE,
  insurance_type    TEXT NOT NULL DEFAULT 'تأمين إصابات عمل'
                    CHECK (insurance_type IN ('تأمين إصابات عمل', 'تأمين تقاعد', 'تأمين صحي', 'تأمين شامل', 'تأمين بطالة')),
  insured_name      TEXT NOT NULL,
  insured_national_id TEXT,
  enterprise_name   TEXT,
  provider_name     TEXT,
  coverage_start    DATE,
  coverage_end      DATE,
  premium_amount    NUMERIC(14,2),
  coverage_amount   NUMERIC(14,2),
  beneficiaries_count INTEGER DEFAULT 0,
  linked_injury_id  UUID REFERENCES work_injuries(id),
  status            TEXT NOT NULL DEFAULT 'نشط' CHECK (status IN ('نشط', 'منتهي', 'معلق', 'ملغي')),
  notes             TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID
);
CREATE INDEX IF NOT EXISTS idx_insurance_insured ON insurance_records(insured_name) WHERE deleted_at IS NULL;

-- ---------- 8) العمالة غير المنتظمة ----------
CREATE TABLE IF NOT EXISTS irregular_workers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE,
  full_name           TEXT NOT NULL,
  national_id         TEXT,
  gender              TEXT CHECK (gender IN ('ذكر', 'أنثى')),
  birth_date          DATE,
  nationality         TEXT DEFAULT 'يمني',
  governorate         TEXT,
  directorate_id      UUID REFERENCES directorates(id),
  district            TEXT,             -- العزلة/الحي
  phone               TEXT,
  activity_type       TEXT,             -- بيع متجول، نقل، ورشة منزلية، زراعة موسمية...
  workplace_description TEXT,
  daily_income        NUMERIC(12,2),
  monthly_income      NUMERIC(12,2),
  has_insurance       BOOLEAN DEFAULT FALSE,
  has_fitness_certificate BOOLEAN DEFAULT FALSE,
  registered_via      TEXT DEFAULT 'مكتب تسجيل' CHECK (registered_via IN ('مكتب تسجيل', 'المنصة الإلكترونية', 'حملة ميدانية')),
  registered_at       DATE,
  regularization_path TEXT,             -- مسار التوطين/التأهيل المقترح
  status              TEXT NOT NULL DEFAULT 'مسجل'
                      CHECK (status IN ('مسجل', 'قيد التحقق', 'تم توطينه', 'غير نشط')),
  notes               TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID
);
CREATE INDEX IF NOT EXISTS idx_irregular_gov ON irregular_workers(governorate) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_irregular_name ON irregular_workers(full_name) WHERE deleted_at IS NULL;

-- ---------- 9) شهادات اللياقة الصحية ----------
CREATE TABLE IF NOT EXISTS health_fitness_certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number  TEXT UNIQUE,
  worker_name         TEXT NOT NULL,
  worker_national_id  TEXT,
  enterprise_name     TEXT,
  occupation          TEXT,
  exam_date           DATE,
  exam_center         TEXT,
  fitness_result      TEXT NOT NULL DEFAULT 'لياق كامل'
                      CHECK (fitness_result IN ('لياق كامل', 'لياق مشروط', 'غير لائق', 'يحتاج فحوصات إضافية')),
  restrictions        TEXT,             -- قيود العمل الطبية
  initial_screening   BOOLEAN DEFAULT FALSE,  -- فحوصات طبية أولية
  expiry_date         DATE,
  doctor_name         TEXT,
  status              TEXT NOT NULL DEFAULT 'سارية' CHECK (status IN ('سارية', 'منتهية', 'ملغاة')),
  notes               TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID
);
CREATE INDEX IF NOT EXISTS idx_fitness_expiry ON health_fitness_certificates(expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fitness_worker ON health_fitness_certificates(worker_name) WHERE deleted_at IS NULL;

-- ---------- 10) شهادات الخبرة ----------
CREATE TABLE IF NOT EXISTS experience_certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number  TEXT UNIQUE,
  worker_name         TEXT NOT NULL,
  worker_national_id  TEXT,
  occupation          TEXT,
  occupation_code     TEXT,             -- ربط بدليل تصنيف المهن الوطني/ISCO
  enterprise_name     TEXT,
  experience_years    NUMERIC(4,1),
  experience_level    TEXT DEFAULT 'مهرة' CHECK (experience_level IN ('مبتدئ', 'متوسط', 'مهرة', 'خبير', 'متقدم')),
  issued_by           TEXT,
  issue_date          DATE,
  verified_by         TEXT,
  verification_date   DATE,
  is_verified         BOOLEAN DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'صادرة' CHECK (status IN ('صادرة', 'موثقة', 'ملغاة')),
  notes               TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID
);
CREATE INDEX IF NOT EXISTS idx_experience_worker ON experience_certificates(worker_name) WHERE deleted_at IS NULL;

-- ---------- 11) إجراءات العمل (التعيين/الإنهاء/النقل) ----------
CREATE TABLE IF NOT EXISTS worker_procedures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code    TEXT UNIQUE,
  procedure_name    TEXT NOT NULL,
  procedure_type    TEXT NOT NULL DEFAULT 'تعيين'
                    CHECK (procedure_type IN ('تعيين', 'إنهاء عقد', 'نقل خدمة', 'استقالة', 'إعارة', 'تسوية')),
  worker_name       TEXT NOT NULL,
  worker_national_id TEXT,
  enterprise_name   TEXT,
  occupation        TEXT,
  start_date        DATE,
  end_date          DATE,
  reference_number  TEXT,
  approved_by       TEXT,
  approval_date     DATE,
  legal_basis       TEXT,          -- المادة / مرجع النظام
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'مسودة'
                    CHECK (status IN ('مسودة', 'قيد المراجعة', 'معتمد', 'مرفوض', 'ملغي')),
  notes             TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID
);
CREATE INDEX IF NOT EXISTS idx_worker_procedures_worker ON worker_procedures(worker_name) WHERE deleted_at IS NULL;
