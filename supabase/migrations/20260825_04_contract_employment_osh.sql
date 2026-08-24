-- Migration 20260825_04_contract_employment_osh.sql
-- Structured Contract Engine + Employment + OSH + Evidence Chain

-- 1. Employment Contracts — structured (not PDF only)
CREATE TABLE IF NOT EXISTS employment_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT UNIQUE NOT NULL,
  worker_person_id UUID NOT NULL REFERENCES persons(id),
  establishment_id UUID NOT NULL REFERENCES legal_entities(id),
  branch_id UUID REFERENCES establishment_branches(id),
  occupation_id UUID REFERENCES national_occupations(id),
  activity_id UUID REFERENCES national_activities(id),
  contract_type_id UUID REFERENCES contract_types_registry(id),
  workplace_governorate TEXT,
  workplace_address TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  duration_months INTEGER,
  working_hours_per_day NUMERIC,
  working_hours_per_week NUMERIC,
  leave_days_annual INTEGER,
  wage_amount NUMERIC NOT NULL,
  wage_currency TEXT DEFAULT 'YER',
  wage_period TEXT DEFAULT 'monthly',
  benefits JSONB DEFAULT '[]',
  termination_clause TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_validation','pending_approval','active','suspended','terminated','expired')),
  legal_validation_result JSONB, -- { passed, failed_rules: [], evaluations: [] }
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  document_url TEXT,
  document_hash TEXT,
  version INTEGER DEFAULT 1,
  parent_contract_id UUID REFERENCES employment_contracts(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_contracts_worker ON employment_contracts(worker_person_id);
CREATE INDEX IF NOT EXISTS idx_contracts_establishment ON employment_contracts(establishment_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON employment_contracts(status);

-- 2. Work Injuries
CREATE TABLE IF NOT EXISTS work_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_number TEXT UNIQUE NOT NULL,
  worker_person_id UUID NOT NULL REFERENCES persons(id),
  establishment_id UUID REFERENCES legal_entities(id),
  contract_id UUID REFERENCES employment_contracts(id),
  injury_date DATE NOT NULL,
  injury_type TEXT,
  severity TEXT CHECK (severity IN ('minor','moderate','severe','fatal')),
  location TEXT,
  description TEXT NOT NULL,
  medical_report_url TEXT,
  reported_by UUID,
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported','investigating','compensated','closed')),
  case_id UUID REFERENCES cases(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. OSH — Occupational Safety & Health Center
CREATE TABLE IF NOT EXISTS osh_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
  hazard_type TEXT NOT NULL,
  hazard_category TEXT,
  description TEXT,
  risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical')),
  assessment_date DATE DEFAULT CURRENT_DATE,
  assessed_by UUID,
  mitigation_status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osh_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
  committee_name TEXT NOT NULL,
  formation_date DATE,
  members JSONB DEFAULT '[]', -- [{ person_id, role }]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osh_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES legal_entities(id),
  inspection_id UUID, -- link to inspections table
  checklist JSONB DEFAULT '[]',
  findings JSONB DEFAULT '[]',
  corrective_actions JSONB DEFAULT '[]',
  score NUMERIC,
  inspected_by UUID REFERENCES inspectors(id),
  inspected_at DATE DEFAULT CURRENT_DATE,
  next_inspection_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Medical Fitness Certificates
CREATE TABLE IF NOT EXISTS health_fitness_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_person_id UUID NOT NULL REFERENCES persons(id),
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT,
  medical_center TEXT,
  fitness_result TEXT CHECK (fitness_result IN ('fit','unfit','fit_with_restrictions')),
  restrictions TEXT,
  document_url TEXT,
  document_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Digital Evidence Chain — immutable
CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_number TEXT UNIQUE NOT NULL,
  case_id UUID REFERENCES cases(id),
  contract_id UUID REFERENCES employment_contracts(id),
  inspection_id UUID,
  source_type TEXT NOT NULL, -- upload, photo, signature, document
  file_url TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  captured_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  parent_evidence_id UUID REFERENCES evidence_records(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence_records(case_id);

-- 6. Foreign Worker Permits — full lifecycle
CREATE TABLE IF NOT EXISTS foreign_worker_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_person_id UUID NOT NULL REFERENCES persons(id),
  establishment_id UUID NOT NULL REFERENCES legal_entities(id),
  permit_number TEXT UNIQUE NOT NULL,
  occupation_id UUID REFERENCES national_occupations(id),
  contract_id UUID REFERENCES employment_contracts(id),
  status TEXT DEFAULT 'application' CHECK (status IN ('application','verification','approved','active','renewal','suspended','expired','cancelled','transferred')),
  issue_date DATE,
  expiry_date DATE,
  renewal_count INTEGER DEFAULT 0,
  linked_replacement_plan TEXT,
  transfer_to_establishment_id UUID REFERENCES legal_entities(id),
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Notifications Intelligence (without spam)
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app','email','sms')),
  priority TEXT DEFAULT 'medium',
  action_required TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_person_id UUID REFERENCES persons(id),
  recipient_role TEXT,
  template_key TEXT REFERENCES notification_templates(template_key),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app',
  priority TEXT DEFAULT 'medium',
  related_entity_type TEXT,
  related_entity_id UUID,
  case_id UUID REFERENCES cases(id),
  action_url TEXT,
  deadline TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_person_id, is_read);
