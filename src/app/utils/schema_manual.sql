-- Manual execution required
-- EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- EXTENSION
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- TYPE
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

-- TYPE
CREATE TYPE classification AS ENUM (
  'labor',        -- عمالية
  'professional', -- مهنية
  'employers',    -- أصحاب أعمال
  'charity',      -- خيرية
  'social',       -- اجتماعية
  'cultural',     -- ثقافية
  'sports'        -- رياضية
);

-- TYPE
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

-- TYPE
CREATE TYPE governance_level AS ENUM (
  'national',     -- وطني
  'regional',     -- إقليمي
  'governorate',  -- محافظة
  'directorate',  -- مديرية
  'district'      -- حي
);

-- TYPE
CREATE TYPE geographic_scope AS ENUM (
  'nationwide',         -- على مستوى الجمهورية
  'multi_governorate',  -- عدة محافظات
  'single_governorate', -- محافظة واحدة
  'directorate',        -- مديرية
  'local'               -- محلي
);

-- TYPE
CREATE TYPE legal_form AS ENUM (
  'syndicate',    -- نقابة
  'association',  -- جمعية
  'federation',   -- اتحاد
  'cooperative',  -- تعاونية
  'foundation'    -- مؤسسة
);

-- TYPE
CREATE TYPE entity_status AS ENUM (
  'active',       -- نشط
  'suspended',    -- معلق
  'inactive',     -- متوقف
  'dissolved',    -- منحل
  'under_review'  -- تحت المراجعة
);

-- TYPE
CREATE TYPE compliance_status AS ENUM (
  'compliant',     -- ملتزم
  'non_compliant', -- مخالف
  'under_review',  -- تحت المراجعة
  'warned',        -- محذر
  'sanctioned'     -- معاقب
);

-- TYPE
CREATE TYPE risk_level AS ENUM (
  'low',      -- منخفض
  'medium',   -- متوسط
  'high',     -- عالي
  'critical'  -- حرج
);

-- TYPE
CREATE TYPE license_status AS ENUM (
  'valid',           -- ساري
  'expired',         -- منتهي
  'suspended',       -- معلق
  'revoked',         -- ملغى
  'pending_renewal'  -- قيد التجديد
);

-- TYPE
CREATE TYPE renewal_status AS ENUM (
  'current',     -- محدّث
  'due_soon',    -- قريب الانتهاء
  'overdue',     -- متأخر
  'in_process'   -- قيد التجديد
);

-- TYPE
CREATE TYPE member_status AS ENUM (
  'active',    -- نشط
  'inactive',  -- غير نشط
  'suspended', -- معلق
  'withdrawn', -- منسحب
  'deceased'   -- متوفى
);

-- TYPE
CREATE TYPE gender AS ENUM ('male', 'female');

-- TYPE
CREATE TYPE election_status AS ENUM (
  'planned',    -- مخطط
  'ongoing',    -- جارية
  'completed',  -- منتهية
  'cancelled',  -- ملغاة
  'postponed'   -- مؤجلة
);

-- TYPE
CREATE TYPE document_status AS ENUM (
  'draft',     -- مسودة
  'submitted', -- مقدم
  'under_review', -- قيد المراجعة
  'approved',  -- موافق عليه
  'rejected',  -- مرفوض
  'archived'   -- مؤرشف
);

-- TYPE
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

-- TYPE
CREATE TYPE activity_status AS ENUM (
  'planned',    -- مخطط
  'ongoing',    -- جارٍ
  'completed',  -- منتهٍ
  'cancelled',  -- ملغى
  'postponed'   -- مؤجل
);

-- TYPE
CREATE TYPE service_request_status AS ENUM (
  'pending',     -- قيد الانتظار
  'processing',  -- قيد المعالجة
  'approved',    -- موافق عليه
  'rejected',    -- مرفوض
  'completed'    -- مكتمل
);

-- TYPE
CREATE TYPE violation_severity AS ENUM (
  'minor',    -- بسيطة
  'moderate', -- متوسطة
  'major',    -- كبيرة
  'critical'  -- حرجة
);

-- TYPE
CREATE TYPE violation_status AS ENUM (
  'open',       -- مفتوحة
  'under_review', -- قيد المراجعة
  'resolved',   -- محلولة
  'closed',     -- مغلقة
  'appealed'    -- مستأنفة
);

-- TYPE
CREATE TYPE user_role AS ENUM ('ministry', 'organization', 'auditor', 'viewer');

-- TABLE
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

-- TABLE
CREATE TABLE organizational_entities (
  entity_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unified_code        TEXT UNIQUE NOT NULL,       -- الرمز الموحد
  registration_number TEXT UNIQUE NOT NULL,       -- رقم التسجيل
  parent_entity_id    UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,

  entity_type         entity_type NOT NULL,
  classification      classification NOT NULL,
  sector              sector,
  activity_types      TEXT[],

  governance_level    governance_level,
  geographic_scope    geographic_scope,
  organizational_level INTEGER NOT NULL DEFAULT 1,
  hierarchy_path      TEXT[],

  legal_form          legal_form NOT NULL,
  license_number      TEXT,
  license_status      license_status DEFAULT 'valid',
  establishment_date  DATE NOT NULL,
  registration_date   DATE NOT NULL,

  status              entity_status NOT NULL DEFAULT 'active',
  compliance_status   compliance_status NOT NULL DEFAULT 'compliant',
  risk_level          risk_level NOT NULL DEFAULT 'low',

  name_ar             TEXT NOT NULL,
  name_en             TEXT,
  description         TEXT,
  mission             TEXT,
  vision              TEXT,

  phone               TEXT,
  mobile              TEXT,
  fax                 TEXT,
  email               TEXT,
  website             TEXT,
  social_facebook     TEXT,
  social_twitter      TEXT,
  social_linkedin     TEXT,
  social_instagram    TEXT,

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

  president_name      TEXT,
  president_national_id TEXT,
  president_position  TEXT DEFAULT 'رئيس',
  president_appointment_date DATE,
  president_end_date  DATE,
  president_phone     TEXT,
  president_email     TEXT,

  vp_name             TEXT,
  vp_national_id      TEXT,
  vp_appointment_date DATE,
  vp_phone            TEXT,
  vp_email            TEXT,

  secretary_name      TEXT,
  secretary_national_id TEXT,
  secretary_appointment_date DATE,
  secretary_phone     TEXT,
  secretary_email     TEXT,

  treasurer_name      TEXT,
  treasurer_national_id TEXT,
  treasurer_appointment_date DATE,
  treasurer_phone     TEXT,
  treasurer_email     TEXT,

  member_count        INTEGER NOT NULL DEFAULT 0,
  branch_count        INTEGER NOT NULL DEFAULT 0,
  committee_count     INTEGER NOT NULL DEFAULT 0,
  active_members      INTEGER DEFAULT 0,
  male_members        INTEGER DEFAULT 0,
  female_members      INTEGER DEFAULT 0,
  employee_count      INTEGER DEFAULT 0,
  volunteer_count     INTEGER DEFAULT 0,

  annual_budget       NUMERIC(15, 2),
  revenue             NUMERIC(15, 2),
  expenses            NUMERIC(15, 2),
  assets              NUMERIC(15, 2),
  liabilities         NUMERIC(15, 2),
  last_financial_year INTEGER,

  last_inspection_date  DATE,
  next_inspection_date  DATE,
  last_audit_date       DATE,
  inspection_score      NUMERIC(5, 2),

  next_renewal_date   DATE,
  renewal_status      renewal_status NOT NULL DEFAULT 'current',

  entity_code         TEXT UNIQUE,
  qr_code             TEXT,
  digital_certificate TEXT,

  tax_reference          TEXT,
  social_insurance_ref   TEXT,
  commercial_register_ref TEXT,

  ai_classification_score NUMERIC(5, 2),
  ai_risk_score          NUMERIC(5, 2),
  ai_recommendations     TEXT[],
  ai_assessment_date     DATE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES profiles(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES profiles(id),
  version             INTEGER NOT NULL DEFAULT 1,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES profiles(id),
  metadata            JSONB DEFAULT '{}'
);

-- INDEX
CREATE INDEX idx_entities_type ON organizational_entities(entity_type);

-- INDEX
CREATE INDEX idx_entities_status ON organizational_entities(status);

-- INDEX
CREATE INDEX idx_entities_governorate ON organizational_entities(governorate);

-- INDEX
CREATE INDEX idx_entities_compliance ON organizational_entities(compliance_status);

-- INDEX
CREATE INDEX idx_entities_risk ON organizational_entities(risk_level);

-- INDEX
CREATE INDEX idx_entities_parent ON organizational_entities(parent_entity_id);

-- INDEX
CREATE INDEX idx_entities_renewal ON organizational_entities(next_renewal_date);

-- INDEX
CREATE INDEX idx_entities_deleted ON organizational_entities(deleted_at) WHERE deleted_at IS NULL;

-- INDEX
CREATE INDEX idx_entities_name_ar ON organizational_entities USING gin(to_tsvector('arabic', name_ar));

-- TABLE
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

-- INDEX
CREATE INDEX idx_board_entity ON board_members(entity_id);

-- TABLE
CREATE TABLE members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,

  national_id       TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  gender            gender NOT NULL,
  birth_date        DATE,
  nationality       TEXT DEFAULT 'يمني',

  profession        TEXT,
  specialization    TEXT,
  qualification     TEXT,
  experience_years  INTEGER,
  job_title         TEXT,
  workplace         TEXT,

  phone             TEXT,
  mobile            TEXT,
  email             TEXT,

  governorate       TEXT,
  city              TEXT,
  directorate       TEXT,
  district          TEXT,
  street            TEXT,

  member_number     TEXT,
  join_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_expiry DATE,
  status            member_status NOT NULL DEFAULT 'active',
  membership_type   TEXT DEFAULT 'عضو عادي',

  subscription_amount NUMERIC(10, 2),
  last_payment_date   DATE,
  payment_status      TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id),
  metadata          JSONB DEFAULT '{}',

  UNIQUE(entity_id, national_id)
);

-- INDEX
CREATE INDEX idx_members_entity ON members(entity_id);

-- INDEX
CREATE INDEX idx_members_national_id ON members(national_id);

-- INDEX
CREATE INDEX idx_members_status ON members(status);

-- INDEX
CREATE INDEX idx_members_governorate ON members(governorate);

-- INDEX
CREATE INDEX idx_members_name ON members USING gin(to_tsvector('arabic', full_name));

-- TABLE
CREATE TABLE elections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  election_number   TEXT NOT NULL,
  title             TEXT NOT NULL,
  election_type     TEXT NOT NULL DEFAULT 'general',
  status            election_status NOT NULL DEFAULT 'planned',

  planned_date      DATE NOT NULL,
  start_date        DATE,
  end_date          DATE,
  result_date       DATE,
  next_election_date DATE,

  eligible_voters   INTEGER DEFAULT 0,
  actual_voters     INTEGER DEFAULT 0,
  voter_turnout     NUMERIC(5, 2),
  candidates_count  INTEGER DEFAULT 0,
  positions_count   INTEGER DEFAULT 0,

  supervised_by     TEXT,
  supervision_entity TEXT,
  venue             TEXT,
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id)
);

-- INDEX
CREATE INDEX idx_elections_entity ON elections(entity_id);

-- INDEX
CREATE INDEX idx_elections_status ON elections(status);

-- INDEX
CREATE INDEX idx_elections_date ON elections(planned_date);

-- TABLE
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

-- INDEX
CREATE INDEX idx_election_results_election ON election_results(election_id);

-- TABLE
CREATE TABLE activities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  activity_number   TEXT NOT NULL,
  activity_name     TEXT NOT NULL,
  activity_type     activity_type NOT NULL,
  status            activity_status NOT NULL DEFAULT 'planned',

  start_date        DATE NOT NULL,
  end_date          DATE,
  actual_start_date DATE,
  actual_end_date   DATE,

  location          TEXT,
  description       TEXT,
  objectives        TEXT,
  outcomes          TEXT,
  responsible       TEXT,
  notes             TEXT,

  planned_participants INTEGER DEFAULT 0,
  actual_participants  INTEGER DEFAULT 0,
  beneficiaries_count  INTEGER DEFAULT 0,
  male_participants    INTEGER DEFAULT 0,
  female_participants  INTEGER DEFAULT 0,

  budget            NUMERIC(12, 2),
  actual_cost       NUMERIC(12, 2),
  funding_source    TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id),
  metadata          JSONB DEFAULT '{}'
);

-- INDEX
CREATE INDEX idx_activities_entity ON activities(entity_id);

-- INDEX
CREATE INDEX idx_activities_status ON activities(status);

-- INDEX
CREATE INDEX idx_activities_type ON activities(activity_type);

-- INDEX
CREATE INDEX idx_activities_date ON activities(start_date);

-- TABLE
CREATE TABLE documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  document_number   TEXT,
  document_name     TEXT NOT NULL,
  document_type     TEXT NOT NULL,  -- ترخيص، قرار، محضر، تقرير، إلخ
  status            document_status NOT NULL DEFAULT 'draft',

  issue_date        DATE,
  expiry_date       DATE,
  submission_date   DATE,
  approval_date     DATE,

  issuing_authority TEXT,
  issuing_officer   TEXT,
  approving_officer TEXT,

  description       TEXT,
  notes             TEXT,
  rejection_reason  TEXT,
  tags              TEXT[],

  file_url          TEXT,
  file_name         TEXT,
  file_size         BIGINT,
  file_type         TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id)
);

-- INDEX
CREATE INDEX idx_documents_entity ON documents(entity_id);

-- INDEX
CREATE INDEX idx_documents_type ON documents(document_type);

-- INDEX
CREATE INDEX idx_documents_status ON documents(status);

-- INDEX
CREATE INDEX idx_documents_expiry ON documents(expiry_date);

-- TABLE
CREATE TABLE licenses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  license_number    TEXT NOT NULL UNIQUE,
  license_type      TEXT NOT NULL,
  status            license_status NOT NULL DEFAULT 'valid',

  issue_date        DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  renewal_date      DATE,

  issuing_authority TEXT NOT NULL,
  issuing_decision  TEXT,
  conditions        TEXT,
  notes             TEXT,
  file_url          TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEX
CREATE INDEX idx_licenses_entity ON licenses(entity_id);

-- INDEX
CREATE INDEX idx_licenses_status ON licenses(status);

-- INDEX
CREATE INDEX idx_licenses_expiry ON licenses(expiry_date);

-- TABLE
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

-- TABLE
CREATE TABLE service_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id       UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES services(id),
  request_number  TEXT UNIQUE NOT NULL,
  status          service_request_status NOT NULL DEFAULT 'pending',

  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE,
  completion_date DATE,

  notes           TEXT,
  rejection_reason TEXT,
  processed_by    UUID REFERENCES profiles(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEX
CREATE INDEX idx_service_requests_entity ON service_requests(entity_id);

-- INDEX
CREATE INDEX idx_service_requests_status ON service_requests(status);

-- INDEX
CREATE INDEX idx_service_requests_date ON service_requests(submission_date);

-- TABLE
CREATE TABLE violations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id         UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  violation_number  TEXT UNIQUE NOT NULL,
  violation_type    TEXT NOT NULL,
  severity          violation_severity NOT NULL DEFAULT 'minor',
  status            violation_status NOT NULL DEFAULT 'open',

  description       TEXT NOT NULL,
  legal_basis       TEXT,  -- الأساس القانوني
  detected_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  detected_by       UUID REFERENCES profiles(id),

  decision_date     DATE,
  decision          TEXT,
  penalty           TEXT,
  penalty_amount    NUMERIC(10, 2),

  resolved_date     DATE,
  resolved_by       UUID REFERENCES profiles(id),
  resolution_notes  TEXT,

  appeal_date       DATE,
  appeal_status     TEXT,
  appeal_decision   TEXT,

  evidence_urls     TEXT[],

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEX
CREATE INDEX idx_violations_entity ON violations(entity_id);

-- INDEX
CREATE INDEX idx_violations_status ON violations(status);

-- INDEX
CREATE INDEX idx_violations_severity ON violations(severity);

-- INDEX
CREATE INDEX idx_violations_date ON violations(detected_date);

-- TABLE
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

-- INDEX
CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);

-- INDEX
CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);

-- TABLE
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

-- INDEX
CREATE INDEX idx_dynamic_fields_entity ON dynamic_fields(entity_id);

-- TABLE
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

-- INDEX
CREATE INDEX idx_audit_table ON audit_log(table_name);

-- INDEX
CREATE INDEX idx_audit_record ON audit_log(record_id);

-- INDEX
CREATE INDEX idx_audit_actor ON audit_log(actor_id);

-- INDEX
CREATE INDEX idx_audit_action ON audit_log(action);

-- INDEX
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- INDEX
CREATE INDEX idx_audit_entity ON audit_log(entity_id);

-- TABLE
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

-- INDEX
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);

-- INDEX
CREATE INDEX idx_notifications_read ON notifications(is_read) WHERE NOT is_read;

-- TABLE
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

-- FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TRIGGER
CREATE TRIGGER trg_entities_updated_at
  BEFORE UPDATE ON organizational_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TRIGGER
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TRIGGER
CREATE TRIGGER trg_elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TRIGGER
CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TRIGGER
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TRIGGER
CREATE TRIGGER trg_violations_updated_at
  BEFORE UPDATE ON violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- FUNCTION
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

-- TRIGGER
CREATE TRIGGER trg_sync_member_count
  AFTER INSERT OR DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION sync_member_count();

-- FUNCTION
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

-- TRIGGER
CREATE TRIGGER trg_audit_entities
  AFTER INSERT OR UPDATE OR DELETE ON organizational_entities
  FOR EACH ROW EXECUTE FUNCTION audit_entity_changes();

-- FUNCTION
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

-- TRIGGER
CREATE TRIGGER trg_compute_renewal_status
  BEFORE INSERT OR UPDATE OF next_renewal_date ON organizational_entities
  FOR EACH ROW EXECUTE FUNCTION compute_renewal_status();

-- ALTER
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE organizational_entities ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- ALTER
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- POLICY
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- POLICY
CREATE POLICY "Ministry can read all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

-- POLICY
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- POLICY
CREATE POLICY "Ministry sees all entities"
  ON organizational_entities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

-- POLICY
CREATE POLICY "Organization sees own entity"
  ON organizational_entities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'organization' AND p.entity_id = entity_id
  ));

-- POLICY
CREATE POLICY "Ministry can insert entities"
  ON organizational_entities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

-- POLICY
CREATE POLICY "Ministry can update entities"
  ON organizational_entities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

-- POLICY
CREATE POLICY "Ministry sees all members"
  ON members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

-- POLICY
CREATE POLICY "Organization sees own members"
  ON members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'organization' AND p.entity_id = members.entity_id
  ));

-- POLICY
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- VIEW
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

-- VIEW
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

-- SEED
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
