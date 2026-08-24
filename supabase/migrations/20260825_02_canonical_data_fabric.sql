-- Migration 20260825_02_canonical_data_fabric.sql
-- ONE PERSON — ONE LABOR IDENTITY | ONE ESTABLISHMENT — ONE CANONICAL RECORD

-- 1. Persons — unified national labor identity
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id TEXT UNIQUE,
  passport_number TEXT,
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male','female')),
  nationality TEXT DEFAULT 'YE',
  marital_status TEXT,
  phone TEXT,
  email TEXT,
  governorate TEXT,
  directorate TEXT,
  address TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','deceased')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  legacy_source TEXT, -- Excel/Access source
  legacy_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_persons_national_id ON persons(national_id);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(full_name_ar);

-- 2. Worker Profiles — extends Person
CREATE TABLE IF NOT EXISTS worker_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  worker_number TEXT UNIQUE,
  employment_status TEXT DEFAULT 'seeking' CHECK (employment_status IN ('seeking','employed','suspended','terminated','retired')),
  occupation_id UUID,
  current_establishment_id UUID,
  hire_date DATE,
  contract_id UUID,
  is_foreign BOOLEAN DEFAULT false,
  work_permit_id UUID,
  qualifications JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  experience_years INTEGER,
  medical_fitness_status TEXT,
  last_medical_check DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id)
);

-- 3. Legal Entities — canonical establishment registry
CREATE TABLE IF NOT EXISTS legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_number TEXT UNIQUE NOT NULL, -- unified national number
  name_ar TEXT NOT NULL,
  name_en TEXT,
  legal_form TEXT,
  sector TEXT,
  classification TEXT,
  unified_code TEXT,
  commercial_register TEXT,
  tax_number TEXT,
  governorate TEXT NOT NULL,
  directorate TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  owner_person_id UUID REFERENCES persons(id),
  manager_person_id UUID REFERENCES persons(id),
  status TEXT DEFAULT 'active',
  compliance_status TEXT DEFAULT 'pending',
  risk_level TEXT DEFAULT 'low',
  establishment_date DATE,
  registration_date DATE,
  latitude NUMERIC,
  longitude NUMERIC,
  metadata JSONB DEFAULT '{}',
  legacy_source TEXT,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);
CREATE INDEX IF NOT EXISTS idx_legal_entities_gov ON legal_entities(governorate);
CREATE INDEX IF NOT EXISTS idx_legal_entities_status ON legal_entities(status);

-- 4. Establishment Branches
CREATE TABLE IF NOT EXISTS establishment_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
  branch_number TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  governorate TEXT,
  city TEXT,
  address TEXT,
  manager_person_id UUID REFERENCES persons(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(legal_entity_id, branch_number)
);

-- 5. Ministry Organization — Governorates/Directorates/Offices/Inspectors
CREATE TABLE IF NOT EXISTS ministry_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  office_type TEXT CHECK (office_type IN ('ministry','governorate','directorate','branch')),
  parent_office_id UUID REFERENCES ministry_offices(id),
  governorate TEXT,
  directorate TEXT,
  address TEXT,
  phone TEXT,
  manager_person_id UUID REFERENCES persons(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id),
  inspector_number TEXT UNIQUE NOT NULL,
  office_id UUID REFERENCES ministry_offices(id),
  specialization TEXT,
  governorate TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id)
);

CREATE TABLE IF NOT EXISTS ministry_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id),
  employee_number TEXT UNIQUE NOT NULL,
  office_id UUID REFERENCES ministry_offices(id),
  position TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Master Data Registries — national single source
CREATE TABLE IF NOT EXISTS national_occupations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  parent_code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  level TEXT CHECK (level IN ('major','sub_major','minor','unit')),
  isic_link TEXT,
  hazard_level TEXT,
  is_hazardous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  source TEXT DEFAULT 'national_registry',
  version INTEGER DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS national_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  parent_code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  sector TEXT,
  level TEXT,
  status TEXT DEFAULT 'active',
  version INTEGER DEFAULT 1,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS violation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  severity TEXT CHECK (severity IN ('minor','major','critical')),
  legal_source_id UUID REFERENCES legal_sources(id),
  penalty_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_types_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  duration_rule TEXT,
  renewal_policy TEXT,
  legal_basis TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Link persons ↔ legal_entities (employment graph edges)
CREATE TABLE IF NOT EXISTS person_legal_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  legal_entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
  link_type TEXT CHECK (link_type IN ('owner','manager','employee','board_member')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id, legal_entity_id, link_type, start_date)
);

-- 8. Backfill from legacy where possible (idempotent)
INSERT INTO persons (national_id, full_name_ar, phone, governorate, legacy_source)
SELECT DISTINCT national_id, full_name, phone, governorate, 'members_legacy'
FROM members WHERE national_id IS NOT NULL
ON CONFLICT (national_id) DO NOTHING;
