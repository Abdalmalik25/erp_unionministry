-- ============================================================
-- UnionSphere Enterprise Platform — Supabase Schema
-- منصة UnionSphere - مخطط قاعدة البيانات الكاملة
-- وزارة الشؤون الاجتماعية والعمل - اليمن
-- ============================================================

-- تمكين UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- 1. ENUMS — الأنواع الثابتة
-- ============================================================

CREATE TYPE entity_type AS ENUM (
  'union',         -- نقابة
  'organization',  -- منظمة
  'federation',    -- اتحاد
  'branch',        -- فرع
  'committee',     -- لجنة
  'department',    -- إدارة
  'unit',          -- وحدة
  'office'         -- مكتب
);

CREATE TYPE classification AS ENUM (
  'labor',        -- عمالية
  'professional', -- مهنية
  'employers',    -- أصحاب أعمال
  'charity',      -- خيرية
  'social',       -- اجتماعية
  'cultural',     -- ثقافية
  'sports'        -- رياضية
);

CREATE TYPE sector AS ENUM (
  'industry',      -- صناعة
  'services',      -- خدمات
  'agriculture',   -- زراعة
  'construction',  -- إنشاءات
  'healthcare',    -- صحة
  'education',     -- تعليم
  'transportation',-- نقل
  'trade',         -- تجارة
  'technology',    -- تكنولوجيا
  'finance',       -- مالية
  'tourism',       -- سياحة
  'other'          -- أخرى
);

CREATE TYPE governance_level AS ENUM (
  'national',     -- وطني
  'regional',     -- إقليمي
  'governorate',  -- محافظة
  'directorate',  -- مديرية
  'district'      -- حي
);

CREATE TYPE geographic_scope AS ENUM (
  'nationwide',         -- على مستوى الجمهورية
  'multi_governorate',  -- عدة محافظات
  'single_governorate', -- محافظة واحدة
  'directorate',        -- مديرية
  'local'               -- محلي
);

CREATE TYPE legal_form AS ENUM (
  'syndicate',    -- نقابة
  'association',  -- جمعية
  'federation',   -- اتحاد
  'cooperative',  -- تعاونية
  'foundation'    -- مؤسسة
);

CREATE TYPE entity_status AS ENUM (
  'active',       -- نشط
  'suspended',    -- معلق
  'inactive',     -- متوقف
  'dissolved',    -- منحل
  'under_review'  -- تحت المراجعة
);

CREATE TYPE compliance_status AS ENUM (
  'compliant',     -- ملتزم
  'non_compliant', -- مخالف
  'under_review',  -- تحت المراجعة
  'warned',        -- محذر
  'sanctioned'     -- معاقب
);

CREATE TYPE risk_level AS ENUM (
  'low',      -- منخفض
  'medium',   -- متوسط
  'high',     -- عالي
  'critical'  -- حرج
);

CREATE TYPE license_status AS ENUM (
  'valid',           -- ساري
  'expired',         -- منتهي
  'suspended',       -- معلق
  'revoked',         -- ملغى
  'pending_renewal'  -- قيد التجديد
);

CREATE TYPE renewal_status AS ENUM (
  'current',     -- محدّث
  'due_soon',    -- قريب الانتهاء
  'overdue',     -- متأخر
  'in_process'   -- قيد التجديد
);

CREATE TYPE member_status AS ENUM (
  'active',    -- نشط
  'inactive',  -- غير نشط
  'suspended', -- معلق
  'withdrawn', -- منسحب
  'deceased'   -- متوفى
);

CREATE TYPE gender AS ENUM ('male', 'female');

CREATE TYPE election_status AS ENUM (
  'planned',    -- مخطط
  'ongoing',    -- جارية
  'completed',  -- منتهية
  'cancelled',  -- ملغاة
  'postponed'   -- مؤجلة
);

CREATE TYPE document_status AS ENUM (
  'draft',     -- مسودة
  'submitted', -- مقدم
  'under_review', -- قيد المراجعة
  'approved',  -- موافق عليه
  'rejected',  -- مرفوض
  'archived'   -- مؤرشف
);

CREATE TYPE activity_type AS ENUM (
  'training',     -- تدريب
  'conference',   -- مؤتمر
  'seminar',      -- ندوة
  'workshop',     -- ورشة عمل
  'election',     -- انتخابات
  'meeting',      -- اجتماع
  'cultural',     -- ثقافي
  'sports',       -- رياضي
  'charity',      -- خيري
  'awareness',    -- توعوي
  'other'         -- أخرى
);

CREATE TYPE activity_status AS ENUM (
  'planned',    -- مخطط
  'ongoing',    -- جارٍ
  'completed',  -- منتهٍ
  'cancelled',  -- ملغى
  'postponed'   -- مؤجل
);

CREATE TYPE service_request_status AS ENUM (
  'pending',     -- قيد الانتظار
  'processing',  -- قيد المعالجة
  'approved',    -- موافق عليه
  'rejected',    -- مرفوض
  'completed'    -- مكتمل
);

CREATE TYPE violation_severity AS ENUM (
  'minor',    -- بسيطة
  'moderate', -- متوسطة
  'major',    -- كبيرة
  'critical'  -- حرجة
);

CREATE TYPE violation_status AS ENUM (
  'open',       -- مفتوحة
  'under_review', -- قيد المراجعة
  'resolved',   -- محلولة
  'closed',     -- مغلقة
  'appealed'    -- مستأنفة
);

CREATE TYPE user_role AS ENUM ('ministry', 'organization', 'auditor', 'viewer');

-- ============================================================
-- 2. PROFILES — ملفات المستخدمين (يربط بـ auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'viewer',
  entity_id     UUID,  -- الكيان المرتبط بالمستخدم (للمنظمات)
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  login_count   INTEGER NOT NULL DEFAULT 0,
  phone         TEXT,
  avatar_url    TEXT,
  department    TEXT,
  job_title     TEXT,
  permissions   JSONB DEFAULT '{}',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ORGANIZATIONAL_ENTITIES — الكيانات المؤسسية (النقابات)
-- 47 حقل + حقول البيانات الوصفية
-- ============================================================

CREATE TABLE organizational_entities (
  -- المعرفات الأساسية
  entity_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unified_code        TEXT UNIQUE NOT NULL,       -- الرمز الموحد
  registration_number TEXT UNIQUE NOT NULL,       -- رقم التسجيل
  parent_entity_id    UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,

  -- التصنيف
  entity_type         entity_type NOT NULL,
  classification      classification NOT NULL,
  sector              sector,
  activity_types      TEXT[],

  -- المستوى التنظيمي
  governance_level    governance_level,
  geographic_scope    geographic_scope,
  organizational_level INTEGER NOT NULL DEFAULT 1,
  hierarchy_path      TEXT[],

  -- المعلومات القانونية
  legal_form          legal_form NOT NULL,
  license_number      TEXT,
  license_status      license_status DEFAULT 'valid',
  establishment_date  DATE NOT NULL,
  registration_date   DATE NOT NULL,

  -- الحالة والامتثال
  status              entity_status NOT NULL DEFAULT 'active',
  compliance_status   compliance_status NOT NULL DEFAULT 'compliant',
  risk_level          risk_level NOT NULL DEFAULT 'low',

  -- المعلومات المؤسسية
  name_ar             TEXT NOT NULL,
  name_en             TEXT,
  description         TEXT,
  mission             TEXT,
  vision              TEXT,

  -- معلومات الاتصال
  phone               TEXT,
  mobile              TEXT,
  fax                 TEXT,
  email               TEXT,
  website             TEXT,
  social_facebook     TEXT,
  social_twitter      TEXT,
  social_linkedin     TEXT,
  social_instagram    TEXT,

  -- العنوان
  governorate         TEXT NOT NULL,
  city                TEXT NOT NULL,
  directorate         TEXT,
  district            TEXT,
  street              TEXT,
  building            TEXT,
  floor               TEXT,
  office              TEXT,
  postal_code         TEXT,
  po_box              TEXT,
  latitude            NUMERIC(10, 7),
  longitude           NUMERIC(10, 7),

  -- القيادة - الرئيس
  president_name      TEXT,
  president_national_id TEXT,
  president_position  TEXT DEFAULT 'رئيس',
  president_appointment_date DATE,
  president_end_date  DATE,
  president_phone     TEXT,
  president_email     TEXT,

  -- القيادة - نائب الرئيس
  vp_name             TEXT,
  vp_national_id      TEXT,
  vp_appointment_date DATE,
  vp_phone            TEXT,
  vp_email            TEXT,

  -- القيادة - الأمين العام
  secretary_name      TEXT,
  secretary_national_id TEXT,
  secretary_appointment_date DATE,
  secretary_phone     TEXT,
  secretary_email     TEXT,

  -- القيادة - أمين الصندوق
  treasurer_name      TEXT,
  treasurer_national_id TEXT,
  treasurer_appointment_date DATE,
  treasurer_phone     TEXT,
  treasurer_email     TEXT,

  -- الإحصائيات
  member_count        INTEGER NOT NULL DEFAULT 0,
  branch_count        INTEGER NOT NULL DEFAULT 0,
  committee_count     INTEGER NOT NULL DEFAULT 0,
  active_members      INTEGER DEFAULT 0,
  male_members        INTEGER DEFAULT 0,
  female_members      INTEGER DEFAULT 0,
  employee_count      INTEGER DEFAULT 0,
  volunteer_count     INTEGER DEFAULT 0,

  -- المؤشرات المالية
  annual_budget       NUMERIC(15, 2),
  revenue             NUMERIC(15, 2),
  expenses            NUMERIC(15, 2),
  assets              NUMERIC(15, 2),
  liabilities         NUMERIC(15, 2),
  last_financial_year INTEGER,

  -- التفتيش والمراجعة
  last_inspection_date  DATE,
  next_inspection_date  DATE,
  last_audit_date       DATE,
  inspection_score      NUMERIC(5, 2),

  -- التجديد والترخيص
  next_renewal_date   DATE,
  renewal_status      renewal_status NOT NULL DEFAULT 'current',

  -- الهوية الرقمية
  entity_code         TEXT UNIQUE,
  qr_code             TEXT,
  digital_certificate TEXT,

  -- التكاملات الخارجية
  tax_reference          TEXT,
  social_insurance_ref   TEXT,
  commercial_register_ref TEXT,

  -- الذكاء الاصطناعي
  ai_classification_score NUMERIC(5, 2),
  ai_risk_score          NUMERIC(5, 2),
  ai_recommendations     TEXT[],
  ai_assessment_date     DATE,

  -- التدقيق
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES profiles(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES profiles(id),
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES profiles(id),
  metadata            JSONB DEFAULT '{}'
);

-- فهارس الكيانات
CREATE INDEX idx_entities_type ON organizational_entities(entity_type);
CREATE INDEX idx_entities_status ON organizational_entities(status);
CREATE INDEX idx_entities_governorate ON organizational_entities(governorate);
CREATE INDEX idx_entities_compliance ON organizational_entities(compliance_status);
CREATE INDEX idx_entities_risk ON organizational_entities(risk_level);
CREATE INDEX idx_entities_parent ON organizational_entities(parent_entity_id);
CREATE INDEX idx_entities_renewal ON organizational_entities(next_renewal_date);
CREATE INDEX idx_entities_deleted ON organizational_entities(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_entities_name_ar ON organizational_entities USING gin(to_tsvector('arabic', name_ar));

-- ============================================================
-- 4. BOARD_MEMBERS — أعضاء مجلس الإدارة
-- ============================================================

CREATE TABLE board_members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  national_id       TEXT,
  position          TEXT NOT NULL,
  appointment_date  DATE NOT NULL,
  end_date          DATE,
  term              TEXT,
  phone             TEXT,
  email             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_board_entity ON board_members(entity_id);

-- ============================================================
-- 5. MEMBERS — الأعضاء
-- ============================================================

CREATE TABLE members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,

  -- المعلومات الشخصية
  national_id       TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  gender            gender NOT NULL,
  birth_date        DATE,
  nationality       TEXT DEFAULT 'يمني',

  -- التخصص والمهنة
  profession        TEXT,
  specialization    TEXT,
  qualification     TEXT,
  experience_years  INTEGER,
  job_title         TEXT,
  workplace         TEXT,

  -- معلومات الاتصال
  phone             TEXT,
  mobile            TEXT,
  email             TEXT,

  -- العنوان
  governorate       TEXT,
  city              TEXT,
  directorate       TEXT,
  district          TEXT,
  street            TEXT,

  -- عضوية
  member_number     TEXT,
  join_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_expiry DATE,
  status            member_status NOT NULL DEFAULT 'active',
  membership_type   TEXT DEFAULT 'عضو عادي',

  -- مالية
  subscription_amount NUMERIC(10, 2),
  last_payment_date   DATE,
  payment_status      TEXT,

  -- تدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id),
  metadata          JSONB DEFAULT '{}',

  UNIQUE(entity_id, national_id)
);

CREATE INDEX idx_members_entity ON members(entity_id);
CREATE INDEX idx_members_national_id ON members(national_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_governorate ON members(governorate);
CREATE INDEX idx_members_name ON members USING gin(to_tsvector('arabic', full_name));

-- ============================================================
-- 6. ELECTIONS — الانتخابات
-- ============================================================

CREATE TABLE elections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  election_number   TEXT NOT NULL,
  title             TEXT NOT NULL,
  election_type     TEXT NOT NULL DEFAULT 'general',
  status            election_status NOT NULL DEFAULT 'planned',

  -- التواريخ
  planned_date      DATE NOT NULL,
  start_date        DATE,
  end_date          DATE,
  result_date       DATE,
  next_election_date DATE,

  -- الإحصائيات
  eligible_voters   INTEGER DEFAULT 0,
  actual_voters     INTEGER DEFAULT 0,
  voter_turnout     NUMERIC(5, 2),
  candidates_count  INTEGER DEFAULT 0,
  positions_count   INTEGER DEFAULT 0,

  -- الإجراءات
  supervised_by     TEXT,
  supervision_entity TEXT,
  venue             TEXT,
  notes             TEXT,

  -- تدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id)
);

CREATE INDEX idx_elections_entity ON elections(entity_id);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_date ON elections(planned_date);

-- ============================================================
-- 7. ELECTION_RESULTS — نتائج الانتخابات
-- ============================================================

CREATE TABLE election_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id     UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  member_id       UUID REFERENCES members(id),
  candidate_name  TEXT NOT NULL,
  position        TEXT NOT NULL,
  votes_received  INTEGER NOT NULL DEFAULT 0,
  rank            INTEGER,
  is_winner       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_election_results_election ON election_results(election_id);

-- ============================================================
-- 8. ACTIVITIES — الأنشطة والفعاليات
-- ============================================================

CREATE TABLE activities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  activity_number   TEXT NOT NULL,
  activity_name     TEXT NOT NULL,
  activity_type     activity_type NOT NULL,
  status            activity_status NOT NULL DEFAULT 'planned',

  -- التواريخ
  start_date        DATE NOT NULL,
  end_date          DATE,
  actual_start_date DATE,
  actual_end_date   DATE,

  -- التفاصيل
  location          TEXT,
  description       TEXT,
  objectives        TEXT,
  outcomes          TEXT,
  responsible       TEXT,
  notes             TEXT,

  -- الإحصائيات
  planned_participants INTEGER DEFAULT 0,
  actual_participants  INTEGER DEFAULT 0,
  beneficiaries_count  INTEGER DEFAULT 0,
  male_participants    INTEGER DEFAULT 0,
  female_participants  INTEGER DEFAULT 0,

  -- المالية
  budget            NUMERIC(12, 2),
  actual_cost       NUMERIC(12, 2),
  funding_source    TEXT,

  -- تدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id),
  metadata          JSONB DEFAULT '{}'
);

CREATE INDEX idx_activities_entity ON activities(entity_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_date ON activities(start_date);

-- ============================================================
-- 9. DOCUMENTS — المستندات والوثائق
-- ============================================================

CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  document_number   TEXT,
  document_name     TEXT NOT NULL,
  document_type     TEXT NOT NULL,  -- ترخيص، قرار، محضر، تقرير، إلخ
  status            document_status NOT NULL DEFAULT 'draft',

  -- التواريخ
  issue_date        DATE,
  expiry_date       DATE,
  submission_date   DATE,
  approval_date     DATE,

  -- الجهة المصدرة
  issuing_authority TEXT,
  issuing_officer   TEXT,
  approving_officer TEXT,

  -- التفاصيل
  description       TEXT,
  notes             TEXT,
  rejection_reason  TEXT,
  tags              TEXT[],

  -- الملفات
  file_url          TEXT,
  file_name         TEXT,
  file_size         BIGINT,
  file_type         TEXT,

  -- تدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id)
);

CREATE INDEX idx_documents_entity ON documents(entity_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);

-- ============================================================
-- 10. LICENSES — التراخيص
-- ============================================================

CREATE TABLE licenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  license_number    TEXT NOT NULL UNIQUE,
  license_type      TEXT NOT NULL,
  status            license_status NOT NULL DEFAULT 'valid',

  -- التواريخ
  issue_date        DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  renewal_date      DATE,

  -- التفاصيل
  issuing_authority TEXT NOT NULL,
  issuing_decision  TEXT,
  conditions        TEXT,
  notes             TEXT,
  file_url          TEXT,

  -- تدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_licenses_entity ON licenses(entity_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expiry ON licenses(expiry_date);

-- ============================================================
-- 11. SERVICES — الخدمات
-- ============================================================

CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_code    TEXT UNIQUE NOT NULL,
  service_name    TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  requires_documents BOOLEAN NOT NULL DEFAULT FALSE,
  processing_days  INTEGER DEFAULT 7,
  fee_amount       NUMERIC(10, 2) DEFAULT 0,
  fee_description  TEXT,
  requirements     TEXT[],
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. SERVICE_REQUESTS — طلبات الخدمات
-- ============================================================

CREATE TABLE service_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id       UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES services(id),
  request_number  TEXT UNIQUE NOT NULL,
  status          service_request_status NOT NULL DEFAULT 'pending',

  -- التواريخ
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  completion_date DATE,

  -- التفاصيل
  notes           TEXT,
  rejection_reason TEXT,
  processed_by    UUID REFERENCES profiles(id),

  -- تدقيق
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_requests_entity ON service_requests(entity_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_date ON service_requests(submission_date);

-- ============================================================
-- 13. VIOLATIONS — المخالفات
-- ============================================================

CREATE TABLE violations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  violation_number  TEXT UNIQUE NOT NULL,
  violation_type    TEXT NOT NULL,
  severity          violation_severity NOT NULL DEFAULT 'minor',
  status            violation_status NOT NULL DEFAULT 'open',

  -- التفاصيل
  description       TEXT NOT NULL,
  legal_basis       TEXT,  -- الأساس القانوني
  detected_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  detected_by       UUID REFERENCES profiles(id),

  -- القرار
  decision_date     DATE,
  decision          TEXT,
  penalty           TEXT,
  penalty_amount    NUMERIC(10, 2),

  -- الحل
  resolved_date     DATE,
  resolved_by       UUID REFERENCES profiles(id),
  resolution_notes  TEXT,

  -- الاستئناف
  appeal_date       DATE,
  appeal_status     TEXT,
  appeal_decision   TEXT,

  -- الملفات
  evidence_urls     TEXT[],

  -- تدقيق
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_violations_entity ON violations(entity_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_severity ON violations(severity);
CREATE INDEX idx_violations_date ON violations(detected_date);

-- ============================================================
-- 14. ENTITY_RELATIONSHIPS — علاقات الكيانات
-- ============================================================

CREATE TABLE entity_relationships (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_entity_id  UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  target_entity_id  UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('parent','branch','partner','affiliated','subsidiary')),
  relationship_level INTEGER,
  start_date        DATE,
  end_date          DATE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);

-- ============================================================
-- 15. DYNAMIC_FIELDS — الحقول الديناميكية
-- ============================================================

CREATE TABLE dynamic_fields (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id   UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  field_name  TEXT NOT NULL,
  field_value TEXT,
  field_type  TEXT NOT NULL CHECK (field_type IN ('text','number','date','boolean','json','array')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, field_name)
);

CREATE INDEX idx_dynamic_fields_entity ON dynamic_fields(entity_id);

-- ============================================================
-- 16. AUDIT_LOG — سجل التدقيق
-- ============================================================

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','VIEW','EXPORT','IMPORT','LOGIN','LOGOUT')),
  actor_id      UUID REFERENCES profiles(id),
  actor_email   TEXT,
  actor_role    TEXT,
  old_values    JSONB,
  new_values    JSONB,
  changed_fields TEXT[],
  ip_address    INET,
  user_agent    TEXT,
  session_id    TEXT,
  entity_id     UUID,  -- للإشارة السريعة للكيان المرتبط
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_id);

-- ============================================================
-- 17. NOTIFICATIONS — الإشعارات
-- ============================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  entity_id     UUID REFERENCES organizational_entities(entity_id),
  action_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read ON notifications(is_read) WHERE NOT is_read;

-- ============================================================
-- 18. REPORTS — التقارير المحفوظة
-- ============================================================

CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_name   TEXT NOT NULL,
  report_type   TEXT NOT NULL,
  description   TEXT,
  filters       JSONB DEFAULT '{}',
  columns       JSONB DEFAULT '[]',
  is_scheduled  BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_cron TEXT,
  created_by    UUID REFERENCES profiles(id),
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS — الدوال والمشغلات
-- ============================================================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_entities_updated_at
  BEFORE UPDATE ON organizational_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_violations_updated_at
  BEFORE UPDATE ON violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- تحديث عداد الأعضاء تلقائياً
CREATE OR REPLACE FUNCTION sync_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizational_entities
    SET member_count = member_count + 1
    WHERE entity_id = NEW.entity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organizational_entities
    SET member_count = GREATEST(0, member_count - 1)
    WHERE entity_id = OLD.entity_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_member_count
  AFTER INSERT OR DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION sync_member_count();

-- تسجيل تدقيق الكيانات تلقائياً
CREATE OR REPLACE FUNCTION audit_entity_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, entity_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.entity_id, OLD.entity_id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
    COALESCE(NEW.entity_id, OLD.entity_id)
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_entities
  AFTER INSERT OR UPDATE OR DELETE ON organizational_entities
  FOR EACH ROW EXECUTE FUNCTION audit_entity_changes();

-- حساب حالة التجديد تلقائياً
CREATE OR REPLACE FUNCTION compute_renewal_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.next_renewal_date IS NOT NULL THEN
    IF NEW.next_renewal_date < CURRENT_DATE THEN
      NEW.renewal_status = 'overdue';
    ELSIF NEW.next_renewal_date <= CURRENT_DATE + INTERVAL '30 days' THEN
      NEW.renewal_status = 'due_soon';
    ELSE
      NEW.renewal_status = 'current';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_renewal_status
  BEFORE INSERT OR UPDATE OF next_renewal_date ON organizational_entities
  FOR EACH ROW EXECUTE FUNCTION compute_renewal_status();

-- ============================================================
-- ROW LEVEL SECURITY — أمان على مستوى الصف
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizational_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- سياسات ملفات المستخدمين
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Ministry can read all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- سياسات الكيانات: الوزارة ترى الكل، المنظمة ترى كيانها فقط
CREATE POLICY "Ministry sees all entities"
  ON organizational_entities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

CREATE POLICY "Organization sees own entity"
  ON organizational_entities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'organization' AND p.entity_id = entity_id
  ));

CREATE POLICY "Ministry can insert entities"
  ON organizational_entities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

CREATE POLICY "Ministry can update entities"
  ON organizational_entities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

-- سياسات الأعضاء
CREATE POLICY "Ministry sees all members"
  ON members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

CREATE POLICY "Organization sees own members"
  ON members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'organization' AND p.entity_id = members.entity_id
  ));

-- سياسات الإشعارات
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- ============================================================
-- VIEWS — المشاهدات المعرّفة مسبقاً
-- ============================================================

-- ملخص إحصائي للوحة التحكم الوزارية
CREATE OR REPLACE VIEW ministry_dashboard_stats AS
SELECT
  COUNT(*)                                                          AS total_entities,
  COUNT(*) FILTER (WHERE status = 'active')                        AS active_entities,
  COUNT(*) FILTER (WHERE status = 'suspended')                     AS suspended_entities,
  COUNT(*) FILTER (WHERE status = 'inactive')                      AS inactive_entities,
  COUNT(*) FILTER (WHERE compliance_status = 'compliant')          AS compliant_entities,
  COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')      AS non_compliant_entities,
  COUNT(*) FILTER (WHERE risk_level IN ('high','critical'))        AS high_risk_entities,
  COUNT(*) FILTER (WHERE renewal_status = 'overdue')               AS overdue_renewals,
  COUNT(*) FILTER (WHERE renewal_status = 'due_soon')              AS due_soon_renewals,
  SUM(member_count)                                                 AS total_members,
  ROUND(
    COUNT(*) FILTER (WHERE compliance_status = 'compliant')::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                                                 AS compliance_rate
FROM organizational_entities
WHERE deleted_at IS NULL;

-- قائمة الكيانات مع بيانات مجمّعة للعرض
CREATE OR REPLACE VIEW entities_summary AS
SELECT
  e.entity_id,
  e.unified_code,
  e.registration_number,
  e.name_ar,
  e.name_en,
  e.entity_type,
  e.classification,
  e.sector,
  e.legal_form,
  e.status,
  e.compliance_status,
  e.risk_level,
  e.license_status,
  e.governorate,
  e.city,
  e.member_count,
  e.branch_count,
  e.annual_budget,
  e.next_renewal_date,
  e.renewal_status,
  e.last_inspection_date,
  e.inspection_score,
  e.establishment_date,
  e.registration_date,
  e.president_name,
  e.president_phone,
  e.phone,
  e.email,
  pe.name_ar AS parent_name,
  e.created_at,
  e.updated_at
FROM organizational_entities e
LEFT JOIN organizational_entities pe ON pe.entity_id = e.parent_entity_id
WHERE e.deleted_at IS NULL;

-- ============================================================
-- SEED DATA — بيانات أولية للخدمات
-- ============================================================

INSERT INTO services (service_code, service_name, description, category, processing_days, fee_amount) VALUES
  ('SRV-001', 'تسجيل كيان جديد',           'تسجيل نقابة أو منظمة جديدة',              'تسجيل',   30,  500),
  ('SRV-002', 'تجديد الترخيص',             'تجديد ترخيص الكيان المنتهي',               'تجديد',   14,  200),
  ('SRV-003', 'تغيير البيانات الأساسية',    'تعديل بيانات الكيان المسجلة',              'تعديل',    7,    0),
  ('SRV-004', 'شهادة قيد',                  'استخراج شهادة إثبات التسجيل',             'شهادات',   3,   50),
  ('SRV-005', 'اعتماد القيادة الجديدة',     'اعتماد مجلس الإدارة المنتخب',             'اعتماد',   10,    0),
  ('SRV-006', 'اعتماد النظام الداخلي',      'مراجعة وإقرار النظام الأساسي',            'اعتماد',   21,    0),
  ('SRV-007', 'إخطار بالانتخابات',          'إشعار الوزارة بموعد الانتخابات',           'إشعار',    1,    0),
  ('SRV-008', 'اعتماد الميزانية السنوية',   'مراجعة وإقرار الميزانية',                 'مالي',     14,    0),
  ('SRV-009', 'طلب إذن تظاهرة',            'الحصول على إذن لتنظيم تظاهرة',             'أذونات',   7,    0),
  ('SRV-010', 'تسوية نزاع عمالي',           'طلب تسوية نزاع بين الكيان والأعضاء',      'نزاعات',  14,    0),
  ('SRV-011', 'استخراج صحيفة الحالة الجنائية', 'للأعضاء المرشحين للقيادة',            'شهادات',   3,   30),
  ('SRV-012', 'طلب إعفاء من الرسوم',       'الحصول على إعفاء من رسوم الخدمات',         'مالي',     14,    0);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
