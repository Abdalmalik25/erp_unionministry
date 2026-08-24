-- Migration 20260825_03_workflow_case_sla.sql
-- Unified Workflow Engine + Case Management + SLA + Correspondence

-- 1. Workflow Definitions (versioned)
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key TEXT UNIQUE NOT NULL, -- entity_registration, inspection, violation, license_renewal, dispute
  name_ar TEXT NOT NULL,
  name_en TEXT,
  entity_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  definition JSONB NOT NULL, -- { states, transitions, sla }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workflow_key, version)
);

-- 2. Workflow Instances
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key TEXT NOT NULL REFERENCES workflow_definitions(workflow_key),
  workflow_version INTEGER NOT NULL DEFAULT 1,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_state TEXT NOT NULL,
  previous_state TEXT,
  assigned_to UUID,
  assigned_office_id UUID REFERENCES ministry_offices(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_state ON workflow_instances(current_state);

-- 3. Workflow History (immutable)
CREATE TABLE IF NOT EXISTS workflow_transitions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  comment TEXT,
  legal_basis TEXT,
  rule_evaluation_id UUID REFERENCES regulatory_rule_evaluations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Cases — unified case management
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE NOT NULL,
  case_type TEXT NOT NULL CHECK (case_type IN ('complaint','dispute','inspection','violation','appeal','injury','union_action','request')),
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','pending_info','resolved','closed','appealed')),
  jurisdiction_governorate TEXT,
  jurisdiction_directorate TEXT,
  office_id UUID REFERENCES ministry_offices(id),
  assigned_to UUID,
  assigned_office_id UUID REFERENCES ministry_offices(id),
  legal_basis TEXT,
  legal_source_id UUID REFERENCES legal_sources(id),
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  sla_deadline TIMESTAMPTZ,
  sla_status TEXT DEFAULT 'on_track' CHECK (sla_status IN ('on_track','at_risk','overdue','breached','paused')),
  parties JSONB DEFAULT '[]', -- [{ person_id, role, entity_id }]
  linked_entity_id UUID,
  linked_entity_type TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cases_type ON cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_sla ON cases(sla_status, sla_deadline);

CREATE TABLE IF NOT EXISTS case_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT,
  actor_id UUID,
  actor_role TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id UUID,
  file_url TEXT,
  file_hash TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  hearing_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  parties_present JSONB DEFAULT '[]',
  outcome TEXT,
  next_hearing_date TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SLA Policies
CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  applies_to TEXT NOT NULL, -- case_type or workflow_key
  duration_days INTEGER NOT NULL,
  escalation_after_days INTEGER,
  escalation_to_role TEXT,
  pause_on TEXT[], -- ['pending_info']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO sla_policies (policy_key, name_ar, applies_to, duration_days, escalation_after_days, escalation_to_role) VALUES
  ('sla_complaint_15','شكوى عمالية — 15 يوم','complaint',15,10,'supervisory_director'),
  ('sla_dispute_30','نزاع عمالي — 30 يوم','dispute',30,20,'legal_counsel'),
  ('sla_inspection_7','تفتيش — 7 أيام','inspection',7,5,'supervisory_director'),
  ('sla_violation_30','مخالفة — 30 يوم معالجة','violation',30,20,'compliance_officer')
ON CONFLICT (policy_key) DO NOTHING;

-- 6. Correspondence
CREATE TABLE IF NOT EXISTS correspondences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT UNIQUE NOT NULL,
  direction TEXT CHECK (direction IN ('incoming','outgoing')),
  subject TEXT NOT NULL,
  body TEXT,
  sender_entity_type TEXT,
  sender_entity_id UUID,
  recipient_entity_type TEXT,
  recipient_entity_id UUID,
  case_id UUID REFERENCES cases(id),
  linked_entity_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','received','archived')),
  attachments JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Seed workflow definitions
INSERT INTO workflow_definitions (workflow_key, name_ar, entity_type, version, definition) VALUES
  ('entity_registration','تسجيل كيان','organizational_entities',1,'{"states":["draft","submitted","under_review","approved","rejected","suspended"],"transitions":[{"from":"draft","to":"submitted","action":"submit","role":"union_president"},{"from":"submitted","to":"under_review","action":"start_review","role":"registry_officer"},{"from":"under_review","to":"approved","action":"approve","role":"ministry_admin"},{"from":"under_review","to":"rejected","action":"reject","role":"ministry_admin","requires_comment":true}]}'::jsonb),
  ('inspection_lifecycle','دورة التفتيش','inspections',1,'{"states":["planned","assigned","in_progress","reported","findings","corrective","reinspection","closed"],"transitions":[{"from":"planned","to":"assigned","action":"assign_inspector","role":"supervisory_director"},{"from":"assigned","to":"in_progress","action":"start_inspection","role":"labor_inspector"},{"from":"in_progress","to":"reported","action":"submit_report","role":"labor_inspector"},{"from":"reported","to":"findings","action":"record_findings","role":"labor_inspector"},{"from":"findings","to":"corrective","action":"require_corrective","role":"compliance_officer"},{"from":"corrective","to":"reinspection","action":"schedule_reinspection","role":"labor_inspector"},{"from":"reinspection","to":"closed","action":"close","role":"ministry_admin"}]}'::jsonb),
  ('dispute_resolution','معالجة النزاع','labor_disputes',1,'{"states":["filed","classified","conciliation","hearing","settled","arbitration","decided","appealed","closed"],"transitions":[{"from":"filed","to":"classified","action":"classify","role":"registry_officer"},{"from":"classified","to":"conciliation","action":"start_conciliation","role":"legal_counsel"},{"from":"conciliation","to":"settled","action":"settle","role":"legal_counsel"},{"from":"conciliation","to":"hearing","action":"escalate_hearing","role":"legal_counsel"},{"from":"hearing","to":"decided","action":"decide","role":"legal_counsel"},{"from":"decided","to":"appealed","action":"appeal","role":"ministry_admin"},{"from":"decided","to":"closed","action":"close","role":"legal_counsel"}]}'::jsonb)
ON CONFLICT (workflow_key, version) DO NOTHING;
