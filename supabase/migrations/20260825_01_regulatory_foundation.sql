-- Migration 20260825_01_regulatory_foundation.sql
-- NATIONAL LABOR REGULATORY FOUNDATION — Law First Architecture
-- Implements: legal_sources → legal_documents → legal_articles → regulatory_rules → rule_versions → rule_evaluations

-- 1. Legal Sources (Law / Regulation / Decision / Circular)
CREATE TABLE IF NOT EXISTS legal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('constitution','law','regulation','ministerial_decision','circular','instruction','bylaw','ilo_convention')),
  law_number TEXT,
  law_year INTEGER,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  issuing_authority TEXT,
  issue_date DATE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'effective' CHECK (status IN ('draft','effective','amended','repealed','suspended')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_source_id UUID REFERENCES legal_sources(id),
  amendment_of UUID REFERENCES legal_sources(id),
  document_url TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  approved_by UUID
);
CREATE INDEX IF NOT EXISTS idx_legal_sources_type ON legal_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_legal_sources_effective ON legal_sources(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_legal_sources_number ON legal_sources(law_number, law_year);

-- 2. Legal Chapters / Articles / Paragraphs
CREATE TABLE IF NOT EXISTS legal_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_source_id UUID NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  chapter_number TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_source_id UUID NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES legal_chapters(id) ON DELETE SET NULL,
  article_number TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  content_ar TEXT,
  content_en TEXT,
  scope TEXT,
  penalties TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  effective_from DATE,
  effective_to DATE,
  status TEXT DEFAULT 'effective',
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_legal_articles_source ON legal_articles(legal_source_id);
CREATE INDEX IF NOT EXISTS idx_legal_articles_number ON legal_articles(article_number);

CREATE TABLE IF NOT EXISTS legal_paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES legal_articles(id) ON DELETE CASCADE,
  paragraph_number TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_en TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Regulatory Rules — executable knowledge (NOT hard-coded)
CREATE TABLE IF NOT EXISTS regulatory_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT UNIQUE NOT NULL, -- e.g., LAB-AGE-001, LAB-FOREIGN-002
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  legal_source_id UUID REFERENCES legal_sources(id),
  article_id UUID REFERENCES legal_articles(id),
  article_reference TEXT, -- "المادة 15 فقرة 2"
  rule_type TEXT NOT NULL CHECK (rule_type IN ('eligibility','validation','authorization','workflow','notification','calculation','restriction','protection')),
  condition JSONB NOT NULL, -- { "field": "age", "operator": "lt", "value": 18, "and": [...] }
  action JSONB NOT NULL,    -- { "type": "block", "message_ar": "...", "severity": "error" }
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','error','block','critical')),
  applies_to TEXT[] DEFAULT '{}', -- ['worker','contract','establishment']
  jurisdiction TEXT, -- governorate / national
  effective_from DATE NOT NULL,
  effective_to DATE,
  priority INTEGER DEFAULT 100,
  exceptions JSONB DEFAULT '[]', -- [{ condition, approved_by }]
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','active','suspended','retired')),
  version INTEGER NOT NULL DEFAULT 1,
  is_hard_constraint BOOLEAN DEFAULT true,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_code ON regulatory_rules(rule_code);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_status ON regulatory_rules(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_effective ON regulatory_rules(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_regulatory_rules_type ON regulatory_rules(rule_type);

-- 4. Rule Versions (time-machine)
CREATE TABLE IF NOT EXISTS regulatory_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES regulatory_rules(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- full rule copy at this version
  change_reason TEXT,
  changed_by UUID,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rule_id, version)
);

-- 5. Rule Evaluations — explainable trace
CREATE TABLE IF NOT EXISTS regulatory_rule_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES regulatory_rules(id),
  rule_code TEXT NOT NULL,
  evaluation_input JSONB NOT NULL,
  evaluation_result TEXT NOT NULL CHECK (evaluation_result IN ('passed','failed','blocked','exception_granted','not_applicable')),
  reason_ar TEXT,
  reason_en TEXT,
  legal_basis TEXT, -- "قانون العمل 5/1995 مادة 15"
  applied_version INTEGER,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  evaluated_by UUID,
  subject_type TEXT, -- contract, worker, establishment
  subject_id UUID,
  transaction_date DATE,
  workflow_instance_id UUID,
  case_id UUID,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_rule_evaluations_subject ON regulatory_rule_evaluations(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_rule_evaluations_date ON regulatory_rule_evaluations(transaction_date);

-- 6. Seed foundational legal sources (flags for review if uncertain)
INSERT INTO legal_sources (source_type, law_number, law_year, title_ar, title_en, effective_from, status, version) VALUES
  ('law','5','1995','قانون العمل','Labor Law', '1995-03-08','effective',1),
  ('law','25','1997','تعديل قانون العمل 25 لسنة 1997','Labor Law Amendment 25/1997','1997-01-01','effective',2),
  ('law','11','2001','تعديل قانون العمل 11 لسنة 2001','Labor Law Amendment 11/2001','2001-01-01','effective',3),
  ('law','25','2003','تعديل قانون العمل 25 لسنة 2003','Labor Law Amendment 25/2003','2003-01-01','effective',4),
  ('law','35','2002','قانون تنظيم النقابات العمالية','Trade Unions Law','2002-01-01','effective',1),
  ('law','43','2005','قانون الأجور والمرتبات','Wages and Salaries Law','2005-01-01','effective',1),
  ('law','45','2002','قانون حقوق الطفل','Child Rights Law','2002-01-01','effective',1),
  ('law','29','2003','قانون الغرف التجارية والصناعية','Chambers of Commerce Law','2003-01-01','effective',1)
ON CONFLICT DO NOTHING;

-- 7. Seed example protective rules (FLAG FOR LEGAL REVIEW — illustrative only)
INSERT INTO regulatory_rules (rule_code, name_ar, description_ar, rule_type, condition, action, severity, applies_to, effective_from, status, version, priority) VALUES
  ('LAB-AGE-001','حماية الأحداث — الحد الأدنى للتشغيل','يمنع تشغيل من هم دون السن المحددة قانوناً إلا وفق الاستثناءات المنصوص عليها — يتطلب مراجعة قانونية للنص النهائي','protection',
   '{"field":"worker.age","operator":"lt","value":15, "note":"FLAG_FOR_LEGAL_REVIEW: السن الحقيقي يحدده النص الرسمي"}',
   '{"type":"block","message_ar":"لا يمكن إكمال التعاقد — العامل دون الحد الأدنى للسن القانوني","requires":"human_review_or_exception_workflow"}',
   'block','{worker,contract}','1995-03-08','draft',1, 10),
  ('LAB-FOREIGN-001','تصريح عمل الأجنبي','لا يجوز تشغيل عامل غير يمني دون تصريح عمل ساري','validation',
   '{"field":"worker.nationality","operator":"ne","value":"YE","and":[{"field":"work_permit.status","operator":"ne","value":"valid"}]}',
   '{"type":"block","message_ar":"تصريح العمل للعامل غير اليمني غير ساري"}',
   'block','{worker,contract,establishment}','1995-03-08','draft',1, 20),
  ('LAB-CONTRACT-001','تحديد مدة العقد','يجب أن يتضمن العقد المدة وتاريخ البداية وفق النموذج المعتمد','validation',
   '{"or":[{"field":"contract.duration","operator":"is_null"},{"field":"contract.start_date","operator":"is_null"}]}',
   '{"type":"error","message_ar":"بيانات مدة العقد وتاريخ البداية مطلوبة"}',
   'error','{contract}','1995-03-08','draft',1, 30)
ON CONFLICT (rule_code) DO NOTHING;

-- 8. View: applicable rules at a point in time
CREATE OR REPLACE VIEW v_applicable_rules AS
SELECT r.*, ls.title_ar AS legal_source_title, ls.law_number, ls.law_year
FROM regulatory_rules r
LEFT JOIN legal_sources ls ON r.legal_source_id = ls.id
WHERE r.status = 'active' AND r.effective_from <= CURRENT_DATE AND (r.effective_to IS NULL OR r.effective_to >= CURRENT_DATE);
