-- ============================================================
-- UnionSphere Enterprise — ULTIMATE Comprehensive Schema v4.0
-- المخطط الشامل النهائي - دمج كامل لبيانات NOAS + UnionSphere
-- وزارة الشؤون الاجتماعية والعمل - الجمهورية اليمنية
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- ENUMS — جميع التعريفات من كلا المشروعين
-- ============================================================

-- أنواع الكيانات
CREATE TYPE entity_type AS ENUM ('union','organization','federation','branch','committee','department','unit','office');
CREATE TYPE classification AS ENUM ('labor','professional','employers','charity','social','cultural','sports');
CREATE TYPE sector AS ENUM ('industry','services','agriculture','construction','healthcare','education','transportation','trade','technology','finance','tourism','other');
CREATE TYPE entity_status AS ENUM ('active','suspended','inactive','dissolved','under_review');
CREATE TYPE compliance_status AS ENUM ('compliant','non_compliant','under_review','warned','sanctioned');
CREATE TYPE risk_level AS ENUM ('low','medium','high','critical');
CREATE TYPE governance_level AS ENUM ('national','regional','governorate','directorate','district');
CREATE TYPE geographic_scope AS ENUM ('nationwide','multi_governorate','single_governorate','directorate','local');
CREATE TYPE legal_form_entity AS ENUM ('syndicate','association','federation','cooperative','foundation','company');
CREATE TYPE license_status AS ENUM ('valid','expired','suspended','revoked','pending_renewal');
CREATE TYPE renewal_status AS ENUM ('current','due_soon','overdue','in_process');

-- الأعضاء
CREATE TYPE member_status AS ENUM ('active','inactive','suspended','withdrawn','deceased');
CREATE TYPE gender AS ENUM ('male','female');

-- الانتخابات
CREATE TYPE election_status AS ENUM ('planned','ongoing','completed','cancelled','postponed');

-- الوثائق
CREATE TYPE document_status AS ENUM ('draft','submitted','under_review','approved','rejected','archived');

-- الأنشطة
CREATE TYPE activity_type AS ENUM ('training','conference','seminar','workshop','election','meeting','cultural','sports','charity','awareness','other');
CREATE TYPE activity_status AS ENUM ('planned','ongoing','completed','cancelled','postponed');

-- طلبات الخدمات
CREATE TYPE service_request_status AS ENUM ('pending','processing','approved','rejected','completed');

-- المخالفات
CREATE TYPE violation_severity AS ENUM ('minor','moderate','major','critical');
CREATE TYPE violation_status AS ENUM ('open','under_review','resolved','closed','appealed');

-- التفتيش والتقييم
CREATE TYPE inspection_type AS ENUM ('روتينية','طارئة','سنوية','متابعة');
CREATE TYPE inspection_compliance AS ENUM ('متوافق بالكامل','متوافق جزئياً','غير متوافق');
CREATE TYPE certificate_status AS ENUM ('صالحة','شرطية','ملغاة');
CREATE TYPE evaluation_level AS ENUM ('basic','advanced','expert');
CREATE TYPE evaluation_model AS ENUM ('standard','comprehensive','enterprise-level');
CREATE TYPE attachment_type AS ENUM ('document','image','pdf','record');

-- التدريب
CREATE TYPE training_status AS ENUM ('قيد التنفيذ','مكتمل','معلق','ملغي');
CREATE TYPE payment_frequency AS ENUM ('شهري','أسبوعي','يومي','بالساعة');

-- النزاعات و العمل
CREATE TYPE dispute_status AS ENUM ('قيد النظر','تم التسوية ودياً','محال للقضاء العمالي');
CREATE TYPE expatriate_status AS ENUM ('نشط','منتهي','ملغي');
CREATE TYPE penalty_status_db AS ENUM ('لا يوجد','تنبيه','غرامة','إغلاق مؤقت');

-- المهن
CREATE TYPE profession_status AS ENUM ('معتمدة','قيد المراجعة','مسودة');
CREATE TYPE hazard_level_ar AS ENUM ('شديدة','متوسطة','منخفضة','عالية');
CREATE TYPE competency_category AS ENUM ('فنية','رقمية','سلوكية');
CREATE TYPE competency_level AS ENUM ('مبتدئ','متوسط','متقدم','خبير');
CREATE TYPE profession_grade AS ENUM ('ممتاز','متقدم','متوسط','مبتدئ');
CREATE TYPE supervision_level AS ENUM ('تنفيذي','إشرافي','إداري','قيادي');
CREATE TYPE decision_making_level AS ENUM ('محدود','متوسط','واسع','استراتيجي');
CREATE TYPE data_sensitivity AS ENUM ('عام','مقيد','سري','سري للغاية');
CREATE TYPE institutional_compliance AS ENUM ('إلزامي','موصى به','استرشادي');

-- الشركات التجارية
CREATE TYPE commercial_entity_type AS ENUM ('company','corporation','partnership','llc','cooperative','factory','shop','office','warehouse','restaurant','service','craft','other');
CREATE TYPE enterprise_size AS ENUM ('small','medium','large','mega');
CREATE TYPE contract_status AS ENUM ('active','expired','terminated');
CREATE TYPE permit_status AS ENUM ('active','suspended','revoked','expired');

-- دورة حياة المستندات
CREATE TYPE lifecycle_state AS ENUM ('draft','pending','submitted','under_review','returned','approved','rejected','cancelled','closed','archived','deleted','expired','renewed','suspended','reopened');

-- المستخدمون والأدوار
CREATE TYPE user_role AS ENUM ('ministry','organization','auditor','viewer');
CREATE TYPE user_role_key AS ENUM ('admin','ministry_officer','occupational_analyst','sector_expert','company_rep');

-- النسخ الاحتياطي والمزامنة
CREATE TYPE backup_type AS ENUM ('full','incremental','differential');
CREATE TYPE connection_status AS ENUM ('online','offline','connecting','syncing');
CREATE TYPE error_severity AS ENUM ('info','warning','error','critical','fatal');
CREATE TYPE error_category AS ENUM ('network','database','validation','auth','sync','backup','ui','system','security','storage','performance','external','business');
CREATE TYPE audit_action_type AS ENUM ('create','update','delete','view','export','import','approve','reject','login','logout');

-- النضج والتقييم
CREATE TYPE maturity_grade AS ENUM ('نموذجية','متقدمة','متكاملة','أساسية','مبدئية');
CREATE TYPE suggestion_impact AS ENUM ('عالٍ','متوسط','تحسين');

-- ارساليات العمال
CREATE TYPE dispatch_status AS ENUM ('مسودة','قيد الموافقة','تمت الموافقة','جاري التنفيذ','مكتمل','ملغي','معلق');

-- طلبات تخفيض العمال
CREATE TYPE reduction_request_status AS ENUM ('مسودة','قيد المراجعة','قيد مراجعة القسم','قيد المراجعة القانونية','تمت الموافقة النهائية','مرفوض','قيد التنفيذ','مكتمل');

-- ============================================================
-- 1. PROFILES — حسابات المستخدمين
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  role_key user_role_key DEFAULT 'viewer',
  entity_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,
  phone TEXT,
  avatar_url TEXT,
  department TEXT,
  job_title TEXT,
  permissions JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. ORGANIZATIONAL_ENTITIES — الكيانات التنظيمية (97 حقل)
-- ============================================================

CREATE TABLE organizational_entities (
  entity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unified_code TEXT UNIQUE NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  parent_entity_id UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,
  entity_type entity_type NOT NULL,
  classification classification NOT NULL,
  sector sector,
  activity_types TEXT[],
  governance_level governance_level,
  geographic_scope geographic_scope,
  organizational_level INTEGER NOT NULL DEFAULT 1,
  hierarchy_path TEXT[],
  legal_form legal_form_entity NOT NULL DEFAULT 'syndicate',
  license_number TEXT,
  license_status license_status DEFAULT 'valid',
  establishment_date DATE NOT NULL,
  registration_date DATE NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  compliance_status compliance_status NOT NULL DEFAULT 'compliant',
  risk_level risk_level NOT NULL DEFAULT 'low',
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  mission TEXT,
  vision TEXT,
  phone TEXT, mobile TEXT, fax TEXT, email TEXT, website TEXT,
  social_facebook TEXT, social_twitter TEXT, social_linkedin TEXT, social_instagram TEXT,
  governorate TEXT NOT NULL, city TEXT NOT NULL,
  directorate TEXT, district TEXT, street TEXT, building TEXT, floor TEXT, office TEXT,
  postal_code TEXT, po_box TEXT,
  latitude NUMERIC(10,7), longitude NUMERIC(10,7),
  president_name TEXT, president_national_id TEXT, president_position TEXT DEFAULT 'رئيس',
  president_appointment_date DATE, president_end_date DATE, president_phone TEXT, president_email TEXT,
  vp_name TEXT, vp_national_id TEXT, vp_appointment_date DATE, vp_phone TEXT, vp_email TEXT,
  secretary_name TEXT, secretary_national_id TEXT, secretary_appointment_date DATE, secretary_phone TEXT, secretary_email TEXT,
  treasurer_name TEXT, treasurer_national_id TEXT, treasurer_appointment_date DATE, treasurer_phone TEXT, treasurer_email TEXT,
  member_count INTEGER NOT NULL DEFAULT 0, branch_count INTEGER NOT NULL DEFAULT 0, committee_count INTEGER NOT NULL DEFAULT 0,
  active_members INTEGER DEFAULT 0, male_members INTEGER DEFAULT 0, female_members INTEGER DEFAULT 0,
  employee_count INTEGER DEFAULT 0, volunteer_count INTEGER DEFAULT 0,
  annual_budget NUMERIC(15,2), revenue NUMERIC(15,2), expenses NUMERIC(15,2),
  assets NUMERIC(15,2), liabilities NUMERIC(15,2), last_financial_year INTEGER,
  last_inspection_date DATE, next_inspection_date DATE, last_audit_date DATE, inspection_score NUMERIC(5,2),
  next_renewal_date DATE, renewal_status renewal_status NOT NULL DEFAULT 'current',
  entity_code TEXT UNIQUE, qr_code TEXT, digital_certificate TEXT,
  tax_reference TEXT, social_insurance_ref TEXT, commercial_register_ref TEXT,
  ai_classification_score NUMERIC(5,2), ai_risk_score NUMERIC(5,2),
  ai_recommendations TEXT[], ai_assessment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID REFERENCES profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ, deleted_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_entities_type ON organizational_entities(entity_type);
CREATE INDEX idx_entities_status ON organizational_entities(status);
CREATE INDEX idx_entities_governorate ON organizational_entities(governorate);
CREATE INDEX idx_entities_compliance ON organizational_entities(compliance_status);
CREATE INDEX idx_entities_deleted ON organizational_entities(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. MEMBERS — الأعضاء (45 حقل)
-- ============================================================

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  national_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender gender NOT NULL,
  birth_date DATE,
  nationality TEXT DEFAULT 'يمني',
  profession TEXT, specialization TEXT, qualification TEXT,
  experience_years INTEGER, job_title TEXT, workplace TEXT,
  phone TEXT, mobile TEXT, email TEXT,
  governorate TEXT, city TEXT, directorate TEXT, district TEXT, street TEXT,
  member_number TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_expiry DATE,
  status member_status NOT NULL DEFAULT 'active',
  membership_type TEXT DEFAULT 'عضو عادي',
  subscription_amount NUMERIC(10,2),
  last_payment_date DATE,
  payment_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(entity_id, national_id)
);

CREATE INDEX idx_members_entity ON members(entity_id);
CREATE INDEX idx_members_national_id ON members(national_id);
CREATE INDEX idx_members_status ON members(status);

-- ============================================================
-- 4. BOARD_MEMBERS — أعضاء مجلس الإدارة
-- ============================================================

CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  national_id TEXT,
  position TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  end_date DATE, term TEXT, phone TEXT, email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. ELECTIONS — الانتخابات
-- ============================================================

CREATE TABLE elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  election_number TEXT NOT NULL,
  title TEXT NOT NULL,
  election_type TEXT NOT NULL DEFAULT 'general',
  status election_status NOT NULL DEFAULT 'planned',
  planned_date DATE NOT NULL,
  start_date DATE, end_date DATE, result_date DATE, next_election_date DATE,
  eligible_voters INTEGER DEFAULT 0, actual_voters INTEGER DEFAULT 0,
  voter_turnout NUMERIC(5,2), candidates_count INTEGER DEFAULT 0, positions_count INTEGER DEFAULT 0,
  supervised_by TEXT, supervision_entity TEXT, venue TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. ELECTION_RESULTS — نتائج الانتخابات
-- ============================================================

CREATE TABLE election_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  candidate_name TEXT NOT NULL,
  position TEXT NOT NULL,
  votes_received INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. ACTIVITIES — الأنشطة
-- ============================================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  activity_number TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  activity_type activity_type NOT NULL,
  status activity_status NOT NULL DEFAULT 'planned',
  start_date DATE NOT NULL, end_date DATE,
  actual_start_date DATE, actual_end_date DATE,
  location TEXT, description TEXT, objectives TEXT, outcomes TEXT,
  responsible TEXT, notes TEXT,
  planned_participants INTEGER DEFAULT 0, actual_participants INTEGER DEFAULT 0,
  beneficiaries_count INTEGER DEFAULT 0,
  male_participants INTEGER DEFAULT 0, female_participants INTEGER DEFAULT 0,
  budget NUMERIC(12,2), actual_cost NUMERIC(12,2), funding_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ============================================================
-- 8. DOCUMENTS — الوثائق
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  document_number TEXT,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  status document_status NOT NULL DEFAULT 'draft',
  issue_date DATE, expiry_date DATE, submission_date DATE, approval_date DATE,
  issuing_authority TEXT, issuing_officer TEXT, approving_officer TEXT,
  description TEXT, notes TEXT, rejection_reason TEXT, tags TEXT[],
  file_url TEXT, file_name TEXT, file_size BIGINT, file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. LICENSES — التراخيص
-- ============================================================

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  license_number TEXT NOT NULL UNIQUE,
  license_type TEXT NOT NULL,
  status license_status NOT NULL DEFAULT 'valid',
  issue_date DATE NOT NULL, expiry_date DATE NOT NULL, renewal_date DATE,
  issuing_authority TEXT NOT NULL,
  issuing_decision TEXT, conditions TEXT, notes TEXT, file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. SERVICES + SERVICE_REQUESTS — الخدمات و الطلبات
-- ============================================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_code TEXT UNIQUE NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT, category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  requires_documents BOOLEAN NOT NULL DEFAULT FALSE,
  processing_days INTEGER DEFAULT 7,
  fee_amount NUMERIC(10,2) DEFAULT 0,
  fee_description TEXT,
  requirements TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  request_number TEXT UNIQUE NOT NULL,
  status service_request_status NOT NULL DEFAULT 'pending',
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE, completion_date DATE,
  notes TEXT, rejection_reason TEXT,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. VIOLATIONS — المخالفات
-- ============================================================

CREATE TABLE violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  violation_number TEXT UNIQUE NOT NULL,
  violation_type TEXT NOT NULL,
  severity violation_severity NOT NULL DEFAULT 'minor',
  status violation_status NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,
  legal_basis TEXT,
  detected_date DATE NOT NULL DEFAULT CURRENT_DATE,
  detected_by UUID REFERENCES profiles(id),
  decision_date DATE, decision TEXT, penalty TEXT, penalty_amount NUMERIC(10,2),
  resolved_date DATE, resolved_by UUID REFERENCES profiles(id), resolution_notes TEXT,
  appeal_date DATE, appeal_status TEXT, appeal_decision TEXT,
  evidence_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. PROFESSIONS — المهن (ISCO-08) — 75+ حقل
-- ============================================================

CREATE TABLE professions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT, name_fr TEXT,
  isco_code TEXT NOT NULL,
  major_group_code TEXT NOT NULL,
  major_group_name TEXT NOT NULL,
  sub_major_group TEXT,
  minor_group TEXT,
  unit_group TEXT,
  sector TEXT NOT NULL,
  family TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  status profession_status NOT NULL DEFAULT 'مسودة',
  description_ar TEXT,
  description_en TEXT,
  scope TEXT,
  -- بيئة العمل
  activity_category TEXT, syndicate TEXT,
  indoor_site TEXT, outdoor_site TEXT,
  climate_condition TEXT, shift_pattern TEXT,
  work_access TEXT, max_service_years TEXT,
  work_hours_per_day TEXT, rest_break TEXT, leaves_schedule TEXT,
  -- الفحوصات الطبية
  medical_exams JSONB DEFAULT '{}',
  -- المخاطر
  hazard_level hazard_level_ar DEFAULT 'منخفضة',
  possible_hazards TEXT[],
  potential_injuries TEXT[],
  occupational_diseases TEXT[],
  prevention_methods TEXT[],
  protective_equipment TEXT[],
  -- البطاقة الوظيفية
  qualifications TEXT[],
  training_requirements TEXT[],
  pre_work_conditions TEXT[],
  onboarding TEXT[],
  trial_period TEXT,
  performance_evaluation TEXT[],
  incentives_and_penalties TEXT[],
  -- المهام والكفايات
  tasks JSONB DEFAULT '[]',
  competencies JSONB DEFAULT '[]',
  -- التقييم
  skill_score INTEGER DEFAULT 0,
  responsibility_score INTEGER DEFAULT 0,
  autonomy_score INTEGER DEFAULT 0,
  complexity_score INTEGER DEFAULT 0,
  hazard_score INTEGER DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  grade profession_grade,
  -- الرواتب
  min_salary NUMERIC(12,2),
  max_salary NUMERIC(12,2),
  currency TEXT DEFAULT 'YER',
  pay_frequency payment_frequency,
  salary_grade TEXT,
  allowances TEXT[],
  overtime_policy TEXT,
  -- المسار المهني
  career_path JSONB DEFAULT '{}',
  -- القانوني
  legal_references JSONB DEFAULT '[]',
  institutional_standards JSONB DEFAULT '[]',
  decree_number TEXT,
  decree_year TEXT,
  -- السياسات
  yemenization_policy TEXT,
  -- كلمات مفتاحية
  keywords TEXT[],
  alternative_titles TEXT[],
  related_occupations TEXT[],
  -- مستويات العمل
  supervision_level supervision_level,
  decision_making_level decision_making_level,
  physical_demands TEXT[],
  mental_demands TEXT[],
  environmental_exposures TEXT[],
  tools_and_equipment TEXT[],
  technology_used TEXT[],
  -- الهيكل التنظيمي
  reporting_structure TEXT,
  team_size TEXT,
  data_sensitivity data_sensitivity,
  emergency_procedures TEXT[],
  quality_standards TEXT[],
  performance_indicators TEXT[],
  -- المتطلبات
  training_hours_required INTEGER,
  certification_required BOOLEAN DEFAULT FALSE,
  license_required BOOLEAN DEFAULT FALSE,
  age_requirement TEXT,
  gender_requirement TEXT,
  employment_tiers TEXT[],
  -- العقود
  contract_types JSONB DEFAULT '[]',
  -- الحوكمة
  governance_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_professions_code ON professions(code);
CREATE INDEX idx_professions_isco ON professions(isco_code);
CREATE INDEX idx_professions_sector ON professions(sector);
CREATE INDEX idx_professions_family ON professions(family);
CREATE INDEX idx_professions_level ON professions(level);
CREATE INDEX idx_professions_status ON professions(status);

-- ============================================================
-- 13. ENTERPRISE_OCCUPATION_LINKS — ربط المهن بالشركات
-- ============================================================

CREATE TABLE enterprise_occupation_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  occupation_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  enterprise_name TEXT NOT NULL,
  cr_number TEXT,
  occupation_code TEXT NOT NULL,
  occupation_name_ar TEXT NOT NULL,
  isco_code TEXT,
  department TEXT,
  allocated_headcount INTEGER NOT NULL DEFAULT 0,
  yemeni_headcount INTEGER NOT NULL DEFAULT 0,
  expatriate_headcount INTEGER NOT NULL DEFAULT 0,
  salary_scale TEXT,
  contract_types TEXT[],
  yemenization_policy TEXT,
  link_status TEXT NOT NULL DEFAULT 'نشط' CHECK (link_status IN ('نشط','معلق','منتهي')),
  compliance_score NUMERIC(5,2) DEFAULT 0,
  labor_law_compliant BOOLEAN DEFAULT FALSE,
  salary_compliant BOOLEAN DEFAULT FALSE,
  osh_compliant BOOLEAN DEFAULT FALSE,
  medical_checks_done BOOLEAN DEFAULT FALSE,
  yemenization_compliant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id, occupation_id)
);

-- ============================================================
-- 14. INSPECTIONS — التفتيش (26 حقل)
-- ============================================================

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  inspection_number TEXT UNIQUE NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_name TEXT NOT NULL,
  inspector_title TEXT,
  inspection_type inspection_type NOT NULL DEFAULT 'روتينية',
  compliance_status inspection_compliance NOT NULL DEFAULT 'متوافق جزئياً',
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  labor_law_score NUMERIC(5,2) DEFAULT 0,
  safety_score NUMERIC(5,2) DEFAULT 0,
  training_score NUMERIC(5,2) DEFAULT 0,
  yemenization_score NUMERIC(5,2) DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 0,
  labor_law_articles TEXT[],
  yemeni_decrees TEXT[],
  international_standards TEXT[],
  training_compliance_rate NUMERIC(5,2) DEFAULT 0,
  occupational_safety_score NUMERIC(5,2) DEFAULT 0,
  yemenization_rate NUMERIC(5,2) DEFAULT 0,
  recommendations TEXT[],
  strengths TEXT[],
  weaknesses TEXT[],
  next_inspection_date DATE,
  evaluation_model evaluation_model DEFAULT 'standard',
  evaluation_level evaluation_level DEFAULT 'basic',
  report_url TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 15. EVALUATION_CERTIFICATES — شهادات التقييم
-- ============================================================

CREATE TABLE evaluation_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_period INTEGER NOT NULL DEFAULT 365,
  expiry_date DATE NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status certificate_status NOT NULL DEFAULT 'صالحة',
  labor_law_compliance BOOLEAN DEFAULT FALSE,
  safety_compliance BOOLEAN DEFAULT FALSE,
  training_compliance BOOLEAN DEFAULT FALSE,
  yemenization_compliance BOOLEAN DEFAULT FALSE,
  certified_occupations TEXT[],
  evaluation_summary TEXT,
  issued_by TEXT, approved_by TEXT,
  qr_code_data TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 16. TRAINING_RECORDS — سجلات التدريب
-- ============================================================

CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  training_name TEXT NOT NULL,
  training_code TEXT,
  training_provider TEXT,
  training_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  duration_hours INTEGER DEFAULT 0,
  employee_name TEXT,
  employee_id TEXT,
  status training_status NOT NULL DEFAULT 'قيد التنفيذ',
  assessment_score NUMERIC(5,2),
  certification_issued BOOLEAN DEFAULT FALSE,
  certification_number TEXT,
  regulatory_basis TEXT,
  competence_ids TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 17. HAZARDOUS_OCCUPATIONS — المهن الخطرة
-- ============================================================

CREATE TABLE hazardous_occupations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  occupation_code TEXT NOT NULL,
  occupation_name_ar TEXT NOT NULL,
  occupation_name_en TEXT,
  risk_level INTEGER NOT NULL CHECK (risk_level BETWEEN 1 AND 6),
  hazard_category TEXT NOT NULL,
  critical_tasks TEXT[],
  safety_requirements TEXT[],
  medical_examinations TEXT[],
  protective_equipment TEXT[],
  training_requirements TEXT[],
  compliance_standards TEXT[],
  inspection_checklist JSONB DEFAULT '[]',
  min_salary NUMERIC(12,2),
  yemenization_policy TEXT,
  isco_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 18. LEGAL_REFERENCES + LAW_ARTICLES — المراجع القانونية
-- ============================================================

CREATE TABLE legal_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  law_name_ar TEXT NOT NULL,
  law_name_en TEXT,
  law_number TEXT,
  law_year INTEGER,
  effective_date DATE,
  status TEXT DEFAULT 'نافذ' CHECK (status IN ('نافذ','ملغى','معدل')),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE law_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_reference_id UUID NOT NULL REFERENCES legal_references(id) ON DELETE CASCADE,
  article_number TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  scope TEXT,
  penalties TEXT,
  related_articles TEXT[],
  weight NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 19. ILO_CONVENTIONS — اتفاقيات ILO
-- ============================================================

CREATE TABLE ilo_conventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convention_number TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  ratification_date DATE,
  status TEXT NOT NULL DEFAULT 'لم يصادق' CHECK (status IN ('صدق','لم يصادق','ملغى')),
  key_provisions TEXT[],
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 20. INTERNATIONAL_STANDARDS — المعايير الدولية
-- ============================================================

CREATE TABLE international_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  standard_code TEXT NOT NULL UNIQUE,
  standard_name TEXT NOT NULL,
  organization TEXT NOT NULL CHECK (organization IN ('ILO','ISO','OHSAS','SABER','OTHER')),
  description TEXT,
  version TEXT,
  issue_date DATE,
  status TEXT DEFAULT 'ساري',
  scope TEXT,
  key_requirements TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 21. CAREER_PATHS + SALARY_RANGES + CONTRACT_TYPES
-- ============================================================

CREATE TABLE career_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  entry_level TEXT NOT NULL,
  progression_levels TEXT[],
  promotion_criteria TEXT,
  training_path TEXT[],
  certification_requirements TEXT[],
  lateral_moves TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE salary_ranges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  min_salary NUMERIC(12,2) NOT NULL,
  max_salary NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'YER',
  pay_frequency payment_frequency,
  allowances TEXT[],
  overtime_policy TEXT,
  salary_grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contract_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_name TEXT NOT NULL,
  duration TEXT,
  renewal_policy TEXT,
  termination_notice TEXT,
  legal_basis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 22. WORKER_PROCEDURES — إجراءات العمال
-- ============================================================

CREATE TABLE worker_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  step_number INTEGER NOT NULL,
  description TEXT,
  required_compliance TEXT[],
  estimated_duration TEXT,
  safety_requirements TEXT[],
  checklist TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 23. EXPERT_OPINIONS — آراء الخبراء
-- ============================================================

CREATE TABLE expert_opinions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occupation_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  expert_name TEXT NOT NULL,
  expert_role TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  skill_rating INTEGER CHECK (skill_rating BETWEEN 1 AND 10),
  responsibility_rating INTEGER CHECK (responsibility_rating BETWEEN 1 AND 10),
  autonomy_rating INTEGER CHECK (autonomy_rating BETWEEN 1 AND 10),
  complexity_rating INTEGER CHECK (complexity_rating BETWEEN 1 AND 10),
  hazard_rating INTEGER CHECK (hazard_rating BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 24. LABOR_DISPUTES — النزاعات العمالية
-- ============================================================

CREATE TABLE labor_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  enterprise_name TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
  dispute_type TEXT NOT NULL,
  dispute_description TEXT NOT NULL,
  dispute_date DATE NOT NULL DEFAULT CURRENT_DATE,
  settlement_proposal TEXT,
  status dispute_status NOT NULL DEFAULT 'قيد النظر',
  resolution_date DATE, resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 25. EXPATRIATE_LICENSES — تراخيص العمالة الوافدة
-- ============================================================

CREATE TABLE expatriate_licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  link_id UUID REFERENCES enterprise_occupation_links(id) ON DELETE SET NULL,
  expatriate_name TEXT NOT NULL,
  expatriate_nationality TEXT NOT NULL,
  passport_number TEXT,
  license_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  linked_replacement_plan TEXT,
  status expatriate_status NOT NULL DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 26. MATURITY_ASSESSMENTS + INSPECTION_CHECKLISTS
-- ============================================================

CREATE TABLE maturity_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade maturity_grade,
  identity_score NUMERIC(5,2) DEFAULT 0,
  description_score NUMERIC(5,2) DEFAULT 0,
  tasks_score NUMERIC(5,2) DEFAULT 0,
  competencies_score NUMERIC(5,2) DEFAULT 0,
  safety_score NUMERIC(5,2) DEFAULT 0,
  career_score NUMERIC(5,2) DEFAULT 0,
  governance_score NUMERIC(5,2) DEFAULT 0,
  missing_count INTEGER DEFAULT 0,
  red_flags TEXT[],
  recommendations TEXT[],
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assessed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inspection_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  checklist_item TEXT NOT NULL,
  category TEXT NOT NULL,
  is_compliant BOOLEAN DEFAULT FALSE,
  notes TEXT,
  evidence_url TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 27. ENTERPRISE_EVALUATION_LEVELS — مستويات تقييم الشركات
-- ============================================================

CREATE TABLE enterprise_evaluation_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_name TEXT NOT NULL UNIQUE,
  level_key evaluation_level NOT NULL,
  min_score NUMERIC(5,2) NOT NULL,
  requirements TEXT[],
  benefits TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 28. INSTITUTIONAL_TEMPLATES — القوالب المؤسسية
-- ============================================================

CREATE TABLE institutional_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_code TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  description TEXT,
  content JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 29. SMART_SUGGESTIONS — الاقتراحات الذكية
-- ============================================================

CREATE TABLE smart_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  occupation_id UUID REFERENCES professions(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact suggestion_impact DEFAULT 'متوسط',
  patch JSONB DEFAULT '{}',
  is_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 30. CURRENCIES — العملات
-- ============================================================

CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  symbol TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  decimals INTEGER DEFAULT 2,
  locale TEXT DEFAULT 'ar',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 31. GOVERNORATES — المحافظات
-- ============================================================

CREATE TABLE governorates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  region TEXT,
  population INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 32. COMMERCIAL_ESTABLISHMENTS — المنشآت التجارية
-- ============================================================

CREATE TABLE commercial_establishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id TEXT UNIQUE NOT NULL,
  unified_code TEXT UNIQUE NOT NULL,
  commercial_register_number TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  entity_type commercial_entity_type DEFAULT 'company',
  sector sector,
  classification enterprise_size,
  status entity_status NOT NULL DEFAULT 'active',
  governorate TEXT, city TEXT, address TEXT,
  phone TEXT, email TEXT,
  owner_name TEXT,
  capital_amount NUMERIC(15,2),
  employees_count INTEGER DEFAULT 0,
  license_number TEXT,
  license_date DATE,
  expiry_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 33. COMMERCIAL_BRANCHES — فروع المنشآت
-- ============================================================

CREATE TABLE commercial_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  branch_type TEXT DEFAULT 'subsidiary',
  governorate TEXT, city TEXT, address TEXT,
  phone TEXT,
  manager_name TEXT,
  employees_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 34. COMMERCIAL_EQUIPMENT — معدات المنشآت
-- ============================================================

CREATE TABLE commercial_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  serial_number TEXT,
  equipment_type TEXT,
  purchase_date DATE,
  value NUMERIC(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 35. COMMERCIAL_WAREHOUSES — مخازن المنشآت
-- ============================================================

CREATE TABLE commercial_warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  area NUMERIC(10,2),
  capacity TEXT,
  manager_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 36. COMMERCIAL_CONTRACTS — عقود المنشآت
-- ============================================================

CREATE TABLE commercial_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  party_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  value NUMERIC(15,2),
  status contract_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 37. ENTERPRISE_SLOTS — تخصيص الوظائف في الشركات
-- ============================================================

CREATE TABLE enterprise_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  slot_code TEXT UNIQUE NOT NULL,
  job_title TEXT NOT NULL,
  occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
  contract_type TEXT DEFAULT 'دائم',
  evaluation_status TEXT DEFAULT 'مسودة',
  allocated_count INTEGER DEFAULT 1,
  yemeni_count INTEGER DEFAULT 0,
  expatriate_count INTEGER DEFAULT 0,
  salary_range TEXT,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 38. COMPLIANCE_MATRICES — مধ矩阵 الامتثال
-- ============================================================

CREATE TABLE compliance_matrices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
  occupation_type TEXT DEFAULT 'جميع المهن',
  article_number TEXT NOT NULL,
  article_title TEXT NOT NULL,
  compliance_status TEXT NOT NULL DEFAULT 'يحتاج مراجعة' CHECK (compliance_status IN ('متوافق','يحتاج مراجعة','غير متوافق')),
  notes TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  checked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 39. RISK_ASSESSMENTS — تقييمات المخاطر
-- ============================================================

CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL,
  risk_description TEXT NOT NULL,
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  risk_score NUMERIC(5,2) GENERATED ALWAYS AS (likelihood * impact) STORED,
  risk_level risk_level,
  mitigation_plan TEXT,
  responsible_person TEXT,
  review_date DATE,
  status TEXT DEFAULT 'مفتوح',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 40. NOTIFICATIONS — الإشعارات
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  entity_id UUID REFERENCES organizational_entities(entity_id),
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 41. REPORTS — التقارير
-- ============================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  description TEXT,
  filters JSONB DEFAULT '{}',
  columns JSONB DEFAULT '[]',
  is_scheduled BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_cron TEXT,
  created_by UUID REFERENCES profiles(id),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 42. AUDIT_LOG — سجل التدقيق
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action audit_action_type NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  actor_email TEXT, actor_role TEXT,
  old_values JSONB, new_values JSONB,
  changed_fields TEXT[],
  ip_address INET, user_agent TEXT, session_id TEXT,
  entity_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 43. ENTITY_RELATIONSHIPS — العلاقات بين الكيانات
-- ============================================================

CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  relationship_level INTEGER,
  start_date DATE, end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- ============================================================
-- 44. DYNAMIC_FIELDS — الحقول الديناميكية
-- ============================================================

CREATE TABLE dynamic_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, field_name)
);

-- ============================================================
-- 45. ERROR_LOG — سجل الأخطاء
-- ============================================================

CREATE TABLE error_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_code TEXT NOT NULL,
  message TEXT NOT NULL,
  severity error_severity NOT NULL DEFAULT 'error',
  category error_category NOT NULL DEFAULT 'system',
  stack_trace TEXT,
  entity_id UUID,
  user_id UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'new',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 46. BACKUP_LOG — سجل النسخ الاحتياطي
-- ============================================================

CREATE TABLE backup_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type backup_type NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_size BIGINT,
  duration_ms INTEGER,
  tables_included TEXT[],
  records_count INTEGER,
  compressed BOOLEAN DEFAULT TRUE,
  encrypted BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 47. SYNC_LOG — سجل المزامنة
-- ============================================================

CREATE TABLE sync_log (
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

-- ============================================================
-- 48. WORKER_DISPATCHES — سجل ارساليات العامل
-- ============================================================
-- 48. WORKER_DISPATCHES — سجل ارساليات العامل
-- relational entity: links organizational_entities + occupations + enterprise_occupation_links
-- lifecycle: مسودة → قيد الموافقة → تمت الموافقة → جاري التنفيذ → مكتمل | ملغي | معلق
-- ============================================================

CREATE TABLE worker_dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_number TEXT UNIQUE NOT NULL,

  -- Entities: organizational_entities (the enterprise hub — 24 inbound FKs)
  sending_enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  sending_enterprise_name TEXT,
  receiving_enterprise_id UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,
  receiving_enterprise_name TEXT,

  -- Occupation link: bridges to enterprise_occupation_links junction table
  occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
  link_id UUID REFERENCES enterprise_occupation_links(id) ON DELETE SET NULL,

  -- Worker identity
  worker_name TEXT NOT NULL,
  worker_national_id TEXT,
  worker_member_id UUID REFERENCES members(id) ON DELETE SET NULL,

  -- Dispatch lifecycle
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  dispatch_duration INTERVAL,
  purpose TEXT NOT NULL,
  legal_basis TEXT,

  -- Approval workflow
  status dispatch_status NOT NULL DEFAULT 'مسودة',
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Compliance & safety
  safety_briefing_done BOOLEAN DEFAULT FALSE,
  medical_clearance_done BOOLEAN DEFAULT FALSE,
  contract_amendment_required BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 49. WORKER_REDUCTION_REQUESTS — سجل طلبات تخفيض العمال
-- relational entity: links organizational_entities + occupations + profiles
-- lifecycle: مسودة → قيد المراجعة → تمت الموافقة → قيد التنفيذ → مكتمل | مرفوض
-- ============================================================

CREATE TABLE worker_reduction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE NOT NULL,

  -- Enterprise: organizational_entities (the hub entity)
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  enterprise_name TEXT NOT NULL,

  -- Reduction details
  requested_reduction_count INTEGER NOT NULL CHECK (requested_reduction_count > 0),
  current_employee_count INTEGER,
  reduction_reason TEXT NOT NULL,
  reduction_category TEXT NOT NULL DEFAULT 'economic',
  legal_basis TEXT,
  detailed_description TEXT,
  expected_savings NUMERIC(15,2),

  -- Affected workers & occupations (relational references)
  affected_occupations UUID[] DEFAULT '{}',
  affected_member_ids UUID[] DEFAULT '{}',
  affected_worker_names TEXT[],

  -- Alternative reemployment plan (required for compliance)
  alternative_reemployment_plan TEXT,
  reemployment_agency_notified BOOLEAN DEFAULT FALSE,
  ministry_notified BOOLEAN DEFAULT FALSE,

  -- Multi-stage approval workflow
  status reduction_request_status NOT NULL DEFAULT 'مسودة',
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  dept_reviewer_id UUID REFERENCES profiles(id),
  dept_reviewer_notes TEXT,
  dept_reviewed_at TIMESTAMPTZ,
  legal_reviewer_id UUID REFERENCES profiles(id),
  legal_reviewer_notes TEXT,
  legal_reviewed_at TIMESTAMPTZ,
  final_approver_id UUID REFERENCES profiles(id),
  final_approver_notes TEXT,
  final_approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Execution tracking
  effective_date DATE,
  execution_notes TEXT,
  executed_by UUID REFERENCES profiles(id),
  executed_at TIMESTAMPTZ,

  -- Audit
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 50. ISIC4_CLASSIFICATIONS — الدليل الوطني لتصنيف المنشآت الاقتصادية
-- hierarchical lookup: section → division → group → class
-- self-referencing parent_id for tree traversal
-- links to commercial_establishments via sector mapping
-- ============================================================

CREATE TABLE isic4_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isic_code TEXT UNIQUE NOT NULL,
  parent_code TEXT REFERENCES isic4_classifications(isic_code) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('section','division','group','class')),
  depth INTEGER NOT NULL DEFAULT 1,

  description_ar TEXT NOT NULL,
  description_en TEXT,

  -- Hierarchy denormalization (for fast filtering without JOINs)
  section_code TEXT,
  section_name TEXT,
  division_code TEXT,
  division_name TEXT,
  group_code TEXT,
  group_name TEXT,

  -- Sector mapping: bridges to the sector enum in commercial_establishments
  sector sector,
  activity_type TEXT,
  employee_range TEXT,
  capital_range TEXT,
  regulatory_notes TEXT,

  -- Statistics (materialized for performance)
  enterprise_count INTEGER DEFAULT 0,
  total_employees INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 51. ENTERPRISE_ISIC_LINKS — ربط المنشآت بالتصنيف ISIC-4
-- junction table: commercial_establishments ↔ isic4_classifications
-- supports multi-classification per enterprise (primary + secondary activities)
-- ============================================================

CREATE TABLE enterprise_isic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES commercial_establishments(id) ON DELETE CASCADE,
  isic_code TEXT NOT NULL REFERENCES isic4_classifications(isic_code) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id, isic_code)
);

-- ============================================================
-- TRIGGERS — المحفزات
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entities_updated_at BEFORE UPDATE ON organizational_entities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_elections_updated_at BEFORE UPDATE ON elections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_violations_updated_at BEFORE UPDATE ON violations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_professions_updated_at BEFORE UPDATE ON professions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_eol_updated_at BEFORE UPDATE ON enterprise_occupation_links FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_certificates_updated_at BEFORE UPDATE ON evaluation_certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_training_updated_at BEFORE UPDATE ON training_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON labor_disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expatriate_updated_at BEFORE UPDATE ON expatriate_licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_commercial_updated_at BEFORE UPDATE ON commercial_establishments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dispatches_updated_at BEFORE UPDATE ON worker_dispatches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reduction_requests_updated_at BEFORE UPDATE ON worker_reduction_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_isic4_updated_at BEFORE UPDATE ON isic4_classifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- تحديث عداد الأعضاء
CREATE OR REPLACE FUNCTION sync_member_count() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'INSERT' THEN UPDATE organizational_entities SET member_count = member_count + 1 WHERE entity_id = NEW.entity_id; ELSIF TG_OP = 'DELETE' THEN UPDATE organizational_entities SET member_count = GREATEST(0, member_count - 1) WHERE entity_id = OLD.entity_id; END IF; RETURN NULL; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sync_member_count AFTER INSERT OR DELETE ON members FOR EACH ROW EXECUTE FUNCTION sync_member_count();

-- حساب اليمننة
CREATE OR REPLACE FUNCTION compute_yemenization_rate() RETURNS TRIGGER AS $$ BEGIN IF NEW.allocated_headcount > 0 THEN NEW.compliance_score := ROUND((NEW.yemeni_headcount::NUMERIC / NEW.allocated_headcount * 100), 2); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_compute_yemenization BEFORE INSERT OR UPDATE OF yemeni_headcount, allocated_headcount ON enterprise_occupation_links FOR EACH ROW EXECUTE FUNCTION compute_yemenization_rate();

-- حساب انتهاء الشهادة
CREATE OR REPLACE FUNCTION compute_certificate_expiry() RETURNS TRIGGER AS $$ BEGIN IF NEW.issue_date IS NOT NULL AND NEW.validity_period IS NOT NULL THEN NEW.expiry_date := NEW.issue_date + (NEW.validity_period || ' days')::INTERVAL; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_compute_certificate_expiry BEFORE INSERT OR UPDATE OF issue_date, validity_period ON evaluation_certificates FOR EACH ROW EXECUTE FUNCTION compute_certificate_expiry();

-- تحديث عداد المنشآت في ISIC4 عند إضافة/حذف ربط
CREATE OR REPLACE FUNCTION update_isic4_enterprise_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE isic4_classifications SET enterprise_count = enterprise_count + 1 WHERE isic_code = NEW.isic_code;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE isic4_classifications SET enterprise_count = GREATEST(0, enterprise_count - 1) WHERE isic_code = OLD.isic_code;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_isic4_count AFTER INSERT OR DELETE ON enterprise_isic_links FOR EACH ROW EXECUTE FUNCTION update_isic4_enterprise_count();

-- تحديث حالة الإرسالية عند اكتمال الموافقة
CREATE OR REPLACE FUNCTION auto_approve_dispatch() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'تمت الموافقة' AND OLD.status != 'تمت الموافقة' THEN
    NEW.approved_at := NOW();
  ELSIF NEW.status = 'جاري التنفيذ' AND OLD.status = 'تمت الموافقة' THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auto_approve_dispatch BEFORE UPDATE ON worker_dispatches FOR EACH ROW EXECUTE FUNCTION auto_approve_dispatch();

-- تحديث حالة طلب التخفيض عند تغير المرحلة
CREATE OR REPLACE FUNCTION auto_advance_reduction_request() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'تمت الموافقة النهائية' AND OLD.status != 'تمت الموافقة النهائية' THEN
    NEW.final_approved_at := NOW();
  ELSIF NEW.status = 'قيد التنفيذ' AND OLD.status = 'تمت الموافقة النهائية' THEN
    NEW.effective_date := COALESCE(NEW.effective_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auto_advance_reduction BEFORE UPDATE ON worker_reduction_requests FOR EACH ROW EXECUTE FUNCTION auto_advance_reduction_request();

-- ============================================================
-- VIEWS — العروض
-- ============================================================

CREATE OR REPLACE VIEW professions_summary AS
SELECT p.id, p.code, p.name_ar, p.isco_code, p.sector, p.family, p.level, p.status,
  COUNT(DISTINCT eol.id) AS linked_enterprises,
  SUM(eol.allocated_headcount) AS total_headcount,
  SUM(eol.yemeni_headcount) AS total_yemeni
FROM professions p LEFT JOIN enterprise_occupation_links eol ON eol.occupation_id = p.id
GROUP BY p.id;

CREATE OR REPLACE VIEW enterprise_compliance_summary AS
SELECT e.entity_id, e.name_ar, e.governorate,
  COUNT(DISTINCT i.id) AS total_inspections,
  MAX(i.inspection_date) AS last_inspection,
  AVG(i.overall_score) AS avg_inspection_score,
  COUNT(DISTINCT ec.id) AS valid_certificates,
  COUNT(DISTINCT eol.id) AS linked_occupations,
  AVG(eol.compliance_score) AS avg_compliance_score
FROM organizational_entities e
LEFT JOIN inspections i ON i.enterprise_id = e.entity_id
LEFT JOIN evaluation_certificates ec ON ec.enterprise_id = e.entity_id
LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.entity_id
WHERE e.deleted_at IS NULL GROUP BY e.entity_id;

CREATE OR REPLACE VIEW system_statistics AS
SELECT
  (SELECT COUNT(*) FROM professions WHERE status = 'معتمدة') AS total_professions,
  (SELECT COUNT(*) FROM organizational_entities WHERE deleted_at IS NULL) AS total_entities,
  (SELECT COUNT(*) FROM members) AS total_members,
  (SELECT COUNT(*) FROM inspections) AS total_inspections,
  (SELECT COUNT(*) FROM evaluation_certificates WHERE status = 'صالحة') AS valid_certificates,
  (SELECT COUNT(*) FROM training_records WHERE status = 'مكتمل') AS completed_trainings,
  (SELECT COUNT(*) FROM labor_disputes WHERE status = 'قيد النظر') AS pending_disputes,
  (SELECT COUNT(*) FROM expatriate_licenses WHERE status = 'نشط') AS active_expatriate_licenses,
  (SELECT COUNT(*) FROM worker_dispatches WHERE status NOT IN ('ملغي','مكتمل')) AS active_dispatches,
  (SELECT COUNT(*) FROM worker_reduction_requests WHERE status NOT IN ('مرفوض','مكتمل')) AS pending_reduction_requests,
  (SELECT COUNT(*) FROM isic4_classifications WHERE is_active = true) AS active_isic4_codes;

-- ============================================================
-- VIEWS — إرساليات العمال
-- ============================================================

CREATE OR REPLACE VIEW worker_dispatches_full AS
SELECT
  wd.*,
  se.name_ar AS sending_enterprise_name_resolved,
  se.governorate AS sending_governorate,
  re.name_ar AS receiving_enterprise_name_resolved,
  re.governorate AS receiving_governorate,
  p.name_ar AS occupation_name_ar,
  p.isco_code AS occupation_isco_code,
  p.hazard_level AS occupation_hazard_level,
  m.full_name AS worker_member_name,
  eol.link_status AS link_status,
  eol.compliance_score AS link_compliance_score,
  sub.full_name AS submitted_by_name,
  rev.full_name AS reviewed_by_name,
  apr.full_name AS approved_by_name
FROM worker_dispatches wd
LEFT JOIN organizational_entities se ON se.entity_id = wd.sending_enterprise_id
LEFT JOIN organizational_entities re ON re.entity_id = wd.receiving_enterprise_id
LEFT JOIN professions p ON p.id = wd.occupation_id
LEFT JOIN enterprise_occupation_links eol ON eol.id = wd.link_id
LEFT JOIN members m ON m.id = wd.worker_member_id
LEFT JOIN profiles sub ON sub.id = wd.submitted_by
LEFT JOIN profiles rev ON rev.id = wd.reviewed_by
LEFT JOIN profiles apr ON apr.id = wd.approved_by;

-- ============================================================
-- VIEWS — طلبات تخفيض العمال
-- ============================================================

CREATE OR REPLACE VIEW reduction_requests_full AS
SELECT
  rrr.*,
  e.name_ar AS enterprise_name_resolved,
  e.governorate AS enterprise_governorate,
  e.entity_type AS enterprise_type,
  sub.full_name AS submitted_by_name,
  dr.full_name AS dept_reviewer_name,
  lr.full_name AS legal_reviewer_name,
  fa.full_name AS final_approver_name,
  ex.full_name AS executed_by_name,
  (rrr.requested_reduction_count * 100.0 / GREATEST(rrr.current_employee_count, 1)) AS reduction_percentage
FROM worker_reduction_requests rrr
LEFT JOIN organizational_entities e ON e.entity_id = rrr.enterprise_id
LEFT JOIN profiles sub ON sub.id = rrr.submitted_by
LEFT JOIN profiles dr ON dr.id = rrr.dept_reviewer_id
LEFT JOIN profiles lr ON lr.id = rrr.legal_reviewer_id
LEFT JOIN profiles fa ON fa.id = rrr.final_approver_id
LEFT JOIN profiles ex ON ex.id = rrr.executed_by;

-- ============================================================
-- VIEWS — تصنيف ISIC-4 الشجري
-- ============================================================

CREATE OR REPLACE VIEW isic4_hierarchy AS
SELECT
  c.isic_code,
  c.level,
  c.depth,
  c.description_ar,
  c.description_en,
  c.sector,
  c.activity_type,
  c.enterprise_count,
  c.total_employees,
  s.description_ar AS section_name_ar,
  s.description_en AS section_name_en,
  d.description_ar AS division_name_ar,
  d.description_en AS division_name_en,
  g.description_ar AS group_name_ar,
  g.description_en AS group_name_en
FROM isic4_classifications c
LEFT JOIN isic4_classifications s ON s.isic_code = c.section_code AND s.level = 'section'
LEFT JOIN isic4_classifications d ON d.isic_code = c.division_code AND d.level = 'division'
LEFT JOIN isic4_classifications g ON g.isic_code = c.group_code AND g.level = 'group';

-- ============================================================
-- VIEWS — ربط المنشآت بالتصنيف
-- ============================================================

CREATE OR REPLACE VIEW enterprise_isic_summary AS
SELECT
  ce.id AS enterprise_id,
  ce.name_ar AS enterprise_name,
  ce.commercial_register_number,
  COUNT(DISTINCT eil.isic_code) AS classification_count,
  STRING_AGG(DISTINCT i4.description_ar, ' | ') AS classifications_ar,
  MAX(CASE WHEN eil.is_primary THEN i4.description_ar END) AS primary_activity,
  MAX(CASE WHEN eil.is_primary THEN i4.isic_code END) AS primary_isic_code
FROM commercial_establishments ce
LEFT JOIN enterprise_isic_links eil ON eil.enterprise_id = ce.id
LEFT JOIN isic4_classifications i4 ON i4.isic_code = eil.isic_code
GROUP BY ce.id, ce.name_ar, ce.commercial_register_number;

-- ============================================================
-- SEED DATA — بيانات التهيئة الأولية
-- ============================================================

-- ── العملات ──
INSERT INTO currencies (code, symbol, name_ar, name_en, decimals) VALUES
  ('YER', 'ر.ي', 'الريال اليمني', 'Yemeni Rial', 2),
  ('USD', '$', 'الدولار الأمريكي', 'US Dollar', 2),
  ('SAR', 'ر.س', 'الريال السعودي', 'Saudi Riyal', 2),
  ('AED', 'د.إ', 'الدرهم الإماراتي', 'UAE Dirham', 2),
  ('EUR', '€', 'اليورو', 'Euro', 2);

-- ── المحافظات اليمنية ──
INSERT INTO governorates (code, name_ar, name_en, region) VALUES
  ('SAH', 'صنعاء', 'Sana''a', 'ال중앙ية'),
  ('ADN', 'عدن', 'Aden', 'الجنوبية'),
  ('TAI', 'تعز', 'Taiz', 'الغربية'),
  ('HAD', 'حضرموت', 'Hadramout', 'الشرقية'),
  ('HUD', 'الhudaydah', 'Al Hudaydah', 'الساحلية'),
  ('MRA', 'مأرب', 'Marib', 'الشرقية'),
  ('SHW', 'شبوة', 'Shabwah', 'الشرقية'),
  ('HJH', 'حجة', 'Hajjah', 'الشمالية'),
  ('JAN', 'الجوف', 'Al Jawf', 'الشمالية'),
  ('SBA', 'صعدة', 'Sa''dah', 'الشمالية'),
  ('LHJ', 'لحج', 'Lahij', 'الجنوبية'),
  ('ABY', 'أبين', 'Abyan', 'الجنوبية'),
  ('DHL', 'الضالع', 'Dhale''', 'الجنوبية'),
  ('TIB', 'تيبعت', 'Tibut', 'الشرقية'),
  ('RIY', 'الضالع', 'Raimah', 'الغربية'),
  ('IBB', 'إب', 'Ibb', 'الغربية'),
  ('DAM', 'ذمار', 'Dhamar', 'ال중앙ية'),
  ('BAI', 'البيضاء', 'Al Bayda''', 'الشرقية'),
  ('MAN', 'المهرة', 'Al Mahrah', 'الشرقية'),
  ('SOC', ' Socotra', 'Socotra', 'الجنوبية');

-- ── المراجع القانونية ──
INSERT INTO legal_references (law_name_ar, law_name_en, law_number, law_year, status, summary) VALUES
  ('قانون العمل اليمني', 'Yemeni Labor Law', '1', 1995, 'نافذ', 'القانون الأساسي لتنظيم العلاقات العمالية - 38 مادة'),
  ('قرار وزاري 42/2020', 'Ministerial Decree 42/2020', '42', 2020, 'نافذ', 'نظام التفتيش الميداني الموحد على المنشآت التجارية'),
  ('قرار وزاري 15/2018', 'Ministerial Decree 15/2018', '15', 2018, 'نافذ', 'نسبة اليمننة في سوق العمل'),
  ('قرار وزاري 10/2000', 'Ministerial Decree 10/2000', '10', 2000, 'نافذ', 'تنظيم العمل الأجنبي والعمالة الوافدة'),
  ('قرار وزاري 28/2019', 'Ministerial Decree 28/2019', '28', 2019, 'نافذ', 'السلامة والصحة المهنية في بيئة العمل');

-- ── مواد قانون العمل ──
INSERT INTO law_articles (legal_reference_id, article_number, title, content, scope, penalties, weight) VALUES
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 7', 'السلامة المهنية', 'يلزم صاحب العمل باتخاذ تدابير السلامة المهنية', 'جميع المهن', 'غرامة من 50,000 إلى 200,000 ر.ي', 20),
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 8', 'الفحوصات الطبية', 'يلزم صاحب العمل بإجراء فحوصات طبية دورية', 'جميع المهن', 'غرامة من 30,000 إلى 100,000 ر.ي', 15),
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 9', 'ساعات العمل', 'لا تتجاوز ساعات العمل 8 ساعات يومياً أو 40 ساعة أسبوعياً', 'جميع المهن', 'غرامة من 20,000 إلى 80,000 ر.ي', 15),
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 10', 'الإجازات', 'يستحق العامل إجازة سنوية 21 يوماً على الأقل', 'جميع المهن', 'غرامة من 10,000 إلى 50,000 ر.ي', 10),
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 13', 'الأجر الأدنى', 'يحد الأجر الأدنى وفق نظام الأجور', 'جميع المهن', 'غرامة من 100,000 إلى 500,000 ر.ي', 20),
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 15', 'التعويضات', 'يستحق العامل تعويضات عند الفصل التعسفي', 'جميع المهن', 'تعويض عن الأضرار', 10),
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 25', 'العقود الدائمة', 'يعقد العقد الدائم لمدة غير محددة', 'جميع المهن', 'غرامة من 50,000 إلى 200,000 ر.ي', 5),
  ((SELECT id FROM legal_references WHERE law_number='1'), 'المادة 30', 'الفصل التعسفي', 'يُحظر فصل العامل دون سبب مشروع', 'جميع المهن', 'تعويض بقيمة 3 أشهر أجر على الأقل', 5);

-- ── اتفاقيات ILO ──
INSERT INTO ilo_conventions (convention_number, title_ar, title_en, status, key_provisions) VALUES
  ('C87', 'حرية تأسيس النقابات العمالية', 'Freedom of Association', 'صدق', ARRAY['حرية التأسيس','حق التنظيم','الاستقلالية النقابية']),
  ('C98', 'حق التنظيم والمفاوضة الجماعية', 'Right to Organise', 'صدق', ARRAY['حماية من التمييز','المفاوضة الجماعية','حل النزاعات']),
  ('C29', 'العمل القسري', 'Forced Labour', 'صدق', ARRAY['حظر العمل القسري','العقوبات الجنائية','الاستثناءات المحدودة']),
  ('C100', 'معادلة الأجر', 'Equal Remuneration', 'صدق', ARRAY['مساواة الأجر','تقييم الوظائف','مراجعة الأجور']),
  ('C105', 'إلغاء العمل القسري', 'Abolition of Forced Labour', 'صدق', ARRAY['حظر جميع أشكال الإكراه','العقوبات على المخالفين']),
  ('C111', 'التمييز في التوظيف', 'Discrimination', 'صدق', ARRAY['حظر التمييز','الفرص المتاحة','ال הבריאות والتعليم']),
  ('C138', 'الحد الأدنى لسن العمل', 'Minimum Age', 'صدق', ARRAY['الحد الأدنى 15 سنة','العمل الخفيف 14 سنة','حظر العمل الخطر']),
  ('C182', 'أسوأ أشكال عمل الأطفال', 'Worst Forms of Child Labour', 'صدق', ARRAY['حظر الاستغلال','الastsaleки','العمل القسري للأطفال']);

-- ── المعايير الدولية ──
INSERT INTO international_standards (standard_code, standard_name, organization, description, key_requirements) VALUES
  ('ISO-9001', 'نظام إدارة الجودة', 'ISO', 'متطلبات أنظمة إدارة الجودة', ARRAY[' DOCUMENTATION ','REVIEW','IMPROVEMENT','CUSTOMER FOCUS']),
  ('ISO-45001', 'السلامة والصحة المهنية', 'ISO', 'أنظمة إدارة السلامة والصحة المهنية', ARRAY['HAZARD IDENTIFICATION','RISK ASSESSMENT','OPERATIONAL CONTROL']),
  ('ISO-14001', 'إدارة البيئة', 'ISO', 'أنظمة إدارة البيئة', ARRAY['ENVIRONMENTAL ASPECTS','LEGAL REQUIREMENTS','POLLUTION PREVENTION']),
  ('ISCO-08', 'تصنيف المهن الدولي', 'ILO', 'التصنيف الدولي الموحد للمهن', ARRAY['TAXONOMY','CLASSIFICATION','COMPARABILITY']),
  ('OHSAS-18001', 'السلامة والصحة المهنية', 'OHSAS', 'نظام إدارة السلامة والصحة (قديم)', ARRAY['HAZARD CONTROL','EMERGENCY PREPAREDNESS']),
  ('SABER', 'نظام التقييم والاعتماد', 'SABER', 'نظام هيئة المواصفات والمقاييس السعودية', ARRAY['PRODUCT CERTIFICATION','CONFORMITY ASSESSMENT']),
  ('ILO-R195', 'مبادئ حقوق العمال', 'ILO', 'إعلان المبادئ الخاصة بحقوق العمال', ARRAY['FREEDOM OF ASSOCIATION','EQUAL OPPORTUNITIES']);

-- ── إجراءات العمال ──
INSERT INTO worker_procedures (procedure_code, name_ar, name_en, step_number, description, estimated_duration, safety_requirements) VALUES
  ('PRC-001', 'دخول العامل', 'Worker Entry', 1, 'إجراءات تسجيل دخول العامل للمؤسسة وتسجيل البصمة', '15 دقيقة', ARRAY['بطاقة هوية سارية','تسجيل بصمة']),
  ('PRC-002', 'السلامة اليومية', 'Daily Safety', 2, 'إجراءات السلامة اليومية وفحص المعدات قبل البدء', '10 دقائق', ARRAY['فحص المعدات','ارتداء ملابس السلامة']),
  ('PRC-003', 'الفحص الطبي الدوري', 'Periodic Medical', 3, 'الفحوصات الطبية الدورية وفق المتطلبات القانونية', 'ساعة واحدة', ARRAY['صيام 12 ساعة','متابعة النتائج']),
  ('PRC-004', 'الإخلاء والطوارئ', 'Evacuation', 4, 'إجراءات الإخلاء في حالات الطوارئ والحرائق', '5 دقائق', ARRAY['معرفة نقاط التجمع','الospel للإخلاء']),
  ('PRC-005', 'الإبلاغ عن الحوادث', 'Incident Reporting', 5, 'إجراءات الإبلاغ عن الحوادث وإعداد التقارير', '15 دقيقة', ARRAY['توثيق الحادث','إبلاغ المدير المباشر']);

-- ── أنواع العقود ──
INSERT INTO contract_types (type_name, duration, renewal_policy, termination_notice, legal_basis) VALUES
  ('دائم', 'غير محدد', 'تلقائي', '30 يوماً', 'قانون العمل المادة 25'),
  ('عقد مشروع', 'محدد حسب المشروع', 'قابل للتجديد', '14 يوماً', 'قانون العمل المادة 26'),
  ('مؤقت', '6 أشهر', 'قابل للتجديد مرتين', '7 أيام', 'قانون العمل المادة 27'),
  ('تدريبي', '3-6 أشهر', 'غير قابل للتجديد', '7 أيام', 'قرار وزاري 15/2018');

-- ── الخدمات ──
INSERT INTO services (service_code, service_name, description, category, processing_days, fee_amount) VALUES
  ('SRV-001', 'تسجيل كيان جديد', 'تسجيل نقابة أو منظمة جديدة', 'تسجيل', 30, 500),
  ('SRV-002', 'تجديد الترخيص', 'تجديد ترخيص منتهي الصلاحية', 'تجديد', 14, 200),
  ('SRV-003', 'تغيير البيانات', 'تعديل بيانات مسجلة للكيان', 'تعديل', 7, 0),
  ('SRV-004', 'شهادة قيد', 'استخراج شهادة تسجيل رسمية', 'شهادات', 3, 50),
  ('SRV-005', 'اعتماد القيادة', 'اعتماد مجلس الإدارة الجديد', 'اعتماد', 10, 0),
  ('SRV-006', 'اعتماد النظام الداخلي', 'مراجعة واعتماد النظام الأساسي', 'اعتماد', 21, 0),
  ('SRV-007', 'إخطار بالانتخابات', 'إشعار بموعد الانتخابات النقابية', 'إشعار', 1, 0),
  ('SRV-008', 'اعتماد الميزانية', 'مراجعة واعتماد الميزانية السنوية', 'مالي', 14, 0),
  ('SRV-009', 'طلب إذن تظاهرة', 'الحصول على إذن للتظاهرة', 'أذونات', 7, 0),
  ('SRV-010', 'تسوية نزاع عمالي', 'طلب تسوية نزاع عمل', 'نزاعات', 14, 0);

-- ── مستويات تقييم الشركات ──
INSERT INTO enterprise_evaluation_levels (level_name, level_key, min_score, requirements, benefits) VALUES
  ('أساسي', 'basic', 60, ARRAY['الحد الأدنى من المتطلبات القانونية','سجلات أساسية'], ARRAY['ession Basic certificate','ال西Basic compliance']),
  ('متقدم', 'advanced', 80, ARRAY['متطلبات السلامة الشاملة','نظام تدريب دوري',' يمننةatisfied'], ARRAY['Advanced certificate','تقليل الرسوم']),
  ('خبير', 'expert', 95, ARRAY['ISO 45001','نظام جودة متكامل','تدريب متقدم','تقرير مالي مراجّع'], ARRAY['Expert certificate',' Preferential dealings','_saved fees']);

-- ── القوالب المؤسسية ──
INSERT INTO institutional_templates (template_code, template_name, template_type, description) VALUES
  ('TPL-CARD-001', 'بطاقة المهنة القياسية', 'بطاقة', 'قالب قياسي لبطاقة وصف المهنة'),
  ('TPL-INSP-001', 'نموذج التفتيش الذكي', 'تفتيش', 'قالب فحص ذكي مع 5 محاور تقييم'),
  ('TPL-ASSM-001', 'نموذج التقييم 360', 'تقييم', 'نموذج تقييم شامل بـ 360 درجة');

-- ──職業 التقييم LEVELS ──
INSERT INTO enterprise_evaluation_levels (level_name, level_key, min_score, requirements, benefits) VALUES
  ('نموذجية', 'basic', 60, ARRAY['الحد الأدنى من المتطلبات'], ARRAY['شهادة أساسية']),
  ('متقدمة', 'advanced', 80, ARRAY['متطلبات شاملة'], ARRAY['شهادة متقدمة']),
  ('متكاملة', 'expert', 95, ARRAY['معايير دولية'], ARRAY['شهادة خبرة']);

-- ── بيانات تجريبية للكيانات ──
INSERT INTO organizational_entities (unified_code, registration_number, entity_type, classification, sector, name_ar, name_en, governorate, city, establishment_date, registration_date, status, member_count, phone, email) VALUES
  ('UNI-ENG-001', 'REG-ENG-001', 'union', 'professional', 'construction', 'نقابة المهندسين اليمنية', 'Yemen Engineers Syndicate', 'صنعاء', 'صنعاء', '1970-01-01', '1970-01-01', 'active', 3200, '+967-1-234567', 'info@engineers-ye.org'),
  ('UNI-TEA-001', 'REG-TEA-001', 'union', 'labor', 'education', 'نقابة المعلمين اليمنيين', 'Yemen Teachers Syndicate', 'صنعاء', 'صنعاء', '1965-03-15', '1965-03-15', 'active', 15000, '+967-1-345678', 'info@teachers-ye.org'),
  ('UNI-DOC-001', 'REG-DOC-001', 'union', 'professional', 'healthcare', 'نقابة الأطباء اليمنيين', 'Yemen Doctors Syndicate', 'صنعاء', 'صنعاء', '1975-06-20', '1975-06-20', 'active', 8500, '+967-1-456789', 'info@doctors-ye.org'),
  ('UNI-LAW-001', 'REG-LAW-001', 'union', 'professional', 'other', 'نقابة المحامين اليمنيين', 'Yemen Lawyers Syndicate', 'صنعاء', 'صنعاء', '1968-09-10', '1968-09-10', 'active', 2100, '+967-1-567890', 'info@lawyers-ye.org'),
  ('UNI-JOU-001', 'REG-JOU-001', 'union', 'professional', 'other', 'نقابة الصحفيين اليمنيين', 'Yemen Journalists Syndicate', 'صنعاء', 'صنعاء', '1980-02-28', '1980-02-28', 'active', 950, '+967-1-678901', 'info@journalists-ye.org'),
  ('UNI-BUI-001', 'REG-BUI-001', 'union', 'labor', 'construction', 'نقابة عمال البناء', 'Construction Workers Union', 'عدن', 'عدن', '1985-05-01', '1985-05-01', 'active', 5600, '+967-2-123456', 'info@buildings-ye.org'),
  ('UNI-TRA-001', 'REG-TRA-001', 'federation', 'labor', 'transportation', 'اتحاد عمال النقل', 'Transport Workers Federation', 'عدن', 'عدن', '1978-11-15', '1978-11-15', 'active', 4200, '+967-2-234567', 'info@transport-ye.org'),
  ('UNI-OFF-001', 'REG-OFF-001', 'union', 'labor', 'services', 'اتحاد موظفي الدولة', 'Civil Servants Union', 'صنعاء', 'صنعاء', '1972-04-01', '1972-04-01', 'active', 25000, '+967-1-789012', 'info@civilservants-ye.org');

-- ── تصنيف ISIC-4 للمنشآت الاقتصادية ──
INSERT INTO isic4_classifications (isic_code, description_ar, description_en, section_code, section_name, sector, activity_type) VALUES
  ('A', 'الزراعة، الغابات، الصيد', 'Agriculture, Forestry and Fishing', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'exportable'),
  ('A01', 'زراعة المحاصيل واستيراد الحيوانات', 'Crop and Animal Production', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('A011', 'زراعة المحاصيل الحقلية', 'Growing of Non-perennial Crops', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('A012', 'زراعة المحاصيل الدائمة', 'Growing of Perennial Crops', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('A013', 'استيراد المحاصيل النباتية', 'Plant Propagation', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('A014', 'ربية الحيوانات', 'Animal Production', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('A015', 'زراعة الأILITIES ', 'Mixed Farming', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('A016', 'الأنشطة الزراعية المساندة', 'Support Activities to Agriculture', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'support'),
  ('A02', 'الغابات وال伐木', 'Forestry and Logging', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('A03', 'الصيد و捕捉 الأسماك', 'Fishing and Aquaculture', 'A', 'الزراعة والغابات والصيد', 'agriculture', 'primary'),
  ('B', 'التعدين ومستخرجات}', 'Mining and Quarrying', 'B', 'التعدين ومستخرجات', 'industry', 'primary'),
  ('B05', 'استخراج الفحم', 'Mining of Coal', 'B', 'التعدين ومستخرجات', 'industry', 'primary'),
  ('B06', 'استخراج البترول والغاز', 'Extraction of Petroleum and Gas', 'B', 'التعدين ومستخرجات', 'industry', 'primary'),
  ('B07', 'استخراج خامات', 'Mining of Metal Ores', 'B', 'التعدين ومستخرجات', 'industry', 'primary'),
  ('B08', 'استخراج خامات', 'Other Mining and Quarrying', 'B', 'التعدين ومستخرجات', 'industry', 'primary'),
  ('B09', 'الخدمات المساندة', 'Support Activities for Mining', 'B', 'التعدين ومستخرجات', 'industry', 'support'),
  ('C', 'الصناعة التحويلية', 'Manufacturing', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C10', 'صناعة المنتجات الغذائية', 'Manufacture of Food Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C11', 'صناعة المشروبات', 'Manufacture of Beverages', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C12', 'صناعة منتجات التبغ', 'Manufacture of Tobacco Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C13', 'صناعة المنسوجات', 'Manufacture of Textiles', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C14', 'صناعة الملابس', 'Manufacture of Wearing Apparel', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C15', 'صناعة المنتجات الجلدية', 'Manufacture of Leather Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C16', 'صناعة الخشب و منتجات', 'Manufacture of Wood Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C17', 'صناعة الورق والمنتجات الورقية', 'Manufacture of Paper Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C18', 'الطباعة ونقل الوسائط', 'Printing and Media Reproduction', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C19', 'صناعة المنتجات البترولية', 'Manufacture of Petroleum Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C20', 'صناعة المواد الكيميائية', 'Manufacture of Chemicals', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C21', 'صناعة الأدوية', 'Manufacture of Pharmaceuticals', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C22', 'صناعة المطاط والبلاستيك', 'Manufacture of Rubber and Plastics', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C23', 'صناعة المنتجات غير المعدنية', 'Manufacture of Non-metallic Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C24', 'صناعة المعادن الأساسية', 'Manufacture of Basic Metals', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C25', 'صناعة منتجات المعادن', 'Manufacture of Fabricated Metal Products', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C26', 'صناعة الإلكترونيات', 'Manufacture of Electronic Equipment', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C27', 'صناعة الكهرباء', 'Manufacture of Electrical Equipment', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C28', 'صناعة الآلات والمعدات', 'Manufacture of Machinery', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C29', 'صناعة السيارات', 'Manufacture of Motor Vehicles', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C30', 'صناعة وسائل النقل الأخرى', 'Manufacture of Other Transport Equipment', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C31', 'صناعة الأثاث', 'Manufacture of Furniture', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C32', 'التصنيع الآخر', 'Other Manufacturing', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('C33', 'إصلاح وتركيب الآلات', 'Repair and Installation of Machinery', 'C', 'الصناعة التحويلية', 'industry', 'secondary'),
  ('D', '_power supply', 'Electricity, Gas, Steam', 'D', 'energy supply', 'industry', 'secondary'),
  ('D35', 'إمداد الكهرباء والغاز', 'Electricity, Gas, Steam Supply', 'D', 'energy supply', 'industry', 'secondary'),
  ('E', '供水; الصرف الصحي', 'Water Supply; Sewerage', 'E', 'water supply', 'industry', 'secondary'),
  ('E36', 'إدارة مصادر المياه', 'Water Collection, Treatment', 'E', 'water supply', 'industry', 'secondary'),
  ('E37', 'الصرف الصحي', 'Sewerage', 'E', 'water supply', 'industry', 'secondary'),
  ('E38', 'جمع النفايات', 'Waste Collection', 'E', 'water supply', 'industry', 'secondary'),
  ('E39', 'معالجة النفايات', 'Waste Treatment', 'E', 'water supply', 'industry', 'secondary'),
  ('F', 'البناء', 'Construction', 'F', 'construction', 'construction', 'secondary'),
  ('F41', 'إنشاء المباني', 'Construction of Buildings', 'F', 'construction', 'construction', 'secondary'),
  ('F42', 'البنية التحتية', 'Civil Engineering', 'F', 'construction', 'construction', 'secondary'),
  ('F43', 'البناء المتخصص', 'Specialised Construction', 'F', 'construction', 'construction', 'secondary'),
  ('G', 'التجارة بالجملة والمفردة', 'Wholesale and Retail Trade', 'G', 'commerce', 'trade', 'tertiary'),
  ('G46', 'التجارة بالجملة', 'Wholesale Trade', 'G', 'commerce', 'trade', 'tertiary'),
  ('G47', 'التجارة بالمفردة', 'Retail Trade', 'G', 'commerce', 'trade', 'tertiary'),
  ('H', 'نقل ومخازن', 'Transportation and Storage', 'H', 'transport', 'transportation', 'tertiary'),
  ('H49', 'نقل البري', 'Land Transport', 'H', 'transport', 'transportation', 'tertiary'),
  ('H50', 'نقل المwater', 'Water Transport', 'H', 'transport', 'transportation', 'tertiary'),
  ('H51', 'نقل الجو', 'Air Transport', 'H', 'transport', 'transportation', 'tertiary'),
  ('H52', 'التخزين وال activities المساعدة', 'Warehousing and Support Activities', 'H', 'transport', 'transportation', 'tertiary'),
  ('H53', 'الأنشطة المساعدة للنقل', 'Other Transport Support Activities', 'H', 'transport', 'transportation', 'tertiary'),
  ('I', 'الخدمات الاستدامية والضيافة', 'Accommodation and Food Service', 'I', 'hospitality', 'tourism', 'tertiary'),
  ('I55', 'الإقامة', 'Accommodation', 'I', 'hospitality', 'tourism', 'tertiary'),
  ('I56', 'خدمات الطعام', 'Food and Beverage Service', 'I', 'hospitality', 'tourism', 'tertiary'),
  ('J', 'المعلومات والاتصالات', 'Information and Communication', 'J', 'ICT', 'technology', 'quaternary'),
  ('J58', 'النشر', 'Publishing Activities', 'J', 'ICT', 'technology', 'quaternary'),
  ('J59', 'إنتاج الأفلام', 'Film and Television Production', 'J', 'ICT', 'technology', 'quaternary'),
  ('J60', 'البث', 'Broadcasting', 'J', 'ICT', 'technology', 'quaternary'),
  ('J61', 'الاتصالات السلكية واللاسلكية', 'Telecommunications', 'J', 'ICT', 'technology', 'quaternary'),
  ('J62', 'برمجة الحاسوب', 'Computer Programming', 'J', 'ICT', 'technology', 'quaternary'),
  ('J63', 'الخدمات المعلوماتية', 'Information Service Activities', 'J', 'ICT', 'technology', 'quaternary'),
  ('K', 'الخدمات المالية والتأمين', 'Financial and Insurance Services', 'K', 'finance', 'finance', 'quaternary'),
  ('K64', 'الخدمات المالية', 'Financial Services', 'K', 'finance', 'finance', 'quaternary'),
  ('K65', 'التأمين', 'Insurance', 'K', 'finance', 'finance', 'quaternary'),
  ('K66', 'الأنشطة المساعدة', 'Support Activities for Finance', 'K', 'finance', 'finance', 'quaternary'),
  ('L', 'العقارات', 'Real Estate Activities', 'L', 'real estate', 'services', 'tertiary'),
  ('L68', 'العقارات', 'Real Estate Activities', 'L', 'real estate', 'services', 'tertiary'),
  ('M', 'الخدمات المهنية والفنية', 'Professional, Scientific and Technical', 'M', 'professional services', 'services', 'quaternary'),
  ('M69', 'الأنشطة القانونية والمحاسبية', 'Legal and Accounting Activities', 'M', 'professional services', 'services', 'quaternary'),
  ('M70', 'الإدارة والاستشارات', 'Management Consultancy', 'M', 'professional services', 'services', 'quaternary'),
  ('M71', 'الهندسة المعمارية والاستشارات الهندسية', 'Architecture and Engineering', 'M', 'professional services', 'services', 'quaternary'),
  ('M72', 'الأبحاث والتطوير', 'Research and Development', 'M', 'professional services', 'services', 'quaternary'),
  ('M73', 'الإعلان', 'Advertising', 'M', 'professional services', 'services', 'quaternary'),
  ('M74', 'الأنشطة المهنية الأخرى', 'Other Professional Activities', 'M', 'professional services', 'services', 'quaternary'),
  ('M75', 'الخدمات البيطرية', 'Veterinary Activities', 'M', 'professional services', 'services', 'quaternary'),
  ('N', 'خدمات الدعم وإدارة المنشآت', 'Administrative and Support Services', 'N', 'support services', 'services', 'tertiary'),
  ('N77', 'التأجير والاستئجار', 'Rental and Leasing', 'N', 'support services', 'services', 'tertiary'),
  ('N78', 'التوظيف', 'Employment Activities', 'N', 'support services', 'services', 'tertiary'),
  ('N79', 'السفر والسياحة', 'Travel Agency and Tour Operator', 'N', 'support services', 'tourism', 'tertiary'),
  ('N80', 'الأمن والحراسة', 'Security and Investigation', 'N', 'support services', 'services', 'tertiary'),
  ('N81', 'خدمات المباني', 'Services to Buildings and Landscape', 'N', 'support services', 'services', 'tertiary'),
  ('N82', 'الإدارة المكتبية والمساندة', 'Office Administrative and Support', 'N', 'support services', 'services', 'tertiary'),
  ('O', 'الإدارة العامة', 'Public Administration', 'O', 'public administration', 'services', 'quaternary'),
  ('O84', 'الإدارة العامة', 'Public Administration', 'O', 'public administration', 'services', 'quaternary'),
  ('P', 'التعليم', 'Education', 'P', 'education', 'education', 'quaternary'),
  ('P85', 'التعليم', 'Education', 'P', 'education', 'education', 'quaternary'),
  ('Q', 'الصحة البشرية', 'Human Health Activities', 'Q', 'health', 'healthcare', 'quaternary'),
  ('Q86', 'الصحة البشرية', 'Human Health Activities', 'Q', 'health', 'healthcare', 'quaternary'),
  ('R', 'الفنون والترفيه', 'Arts, Entertainment and Recreation', 'R', 'arts and entertainment', 'services', 'tertiary'),
  ('R90', 'الفنون الإبداعية', 'Creative, Arts and Entertainment', 'R', 'arts and entertainment', 'services', 'tertiary'),
  ('R91', 'المكتبات والمتاحف', 'Libraries, Museums', 'R', 'arts and entertainment', 'services', 'tertiary'),
  ('R92', 'المقاهي وال karena games', 'Gambling and Betting', 'R', 'arts and entertainment', 'services', 'tertiary'),
  ('R93', 'الأنشطة الرياضية', 'Sports Activities', 'R', 'arts and entertainment', 'services', 'tertiary'),
  ('S', 'خدمات الأسرة والأفراد', 'Other Service Activities', 'S', 'personal services', 'services', 'tertiary'),
  ('S94', 'المنظماتmembership', 'Membership Organisations', 'S', 'personal services', 'services', 'tertiary'),
  ('S95', 'الصيانة الشخصية', 'Repair of Personal and Household Goods', 'S', 'personal services', 'services', 'tertiary'),
  ('S96', 'الخدمات الشخصية الأخرى', 'Other Personal Service Activities', 'S', 'personal services', 'services', 'tertiary'),
  ('T', 'الكيانات المنزلية', 'Household Employers', 'T', 'household activities', 'services', 'tertiary'),
  ('T97', 'الكيانات المنزلية', 'Household Employers', 'T', 'household activities', 'services', 'tertiary'),
  ('U', 'المنظمات الدولية', 'International Organisations', 'U', 'international', 'services', 'quaternary'),
  ('U99', 'المنظمات الدولية', 'International Organisations', 'U', 'international', 'services', 'quaternary');
