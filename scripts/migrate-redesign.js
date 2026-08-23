/**
 * Migration: Redesign worker_dispatches, worker_reduction_requests, isic4_classifications
 * Drop old tables and recreate with proper relational design
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

const MIGRATION_SQL = `
-- Drop old tables (cascade to remove dependent views/triggers)
DROP VIEW IF EXISTS worker_dispatches_full CASCADE;
DROP VIEW IF EXISTS reduction_requests_full CASCADE;
DROP VIEW IF EXISTS isic4_hierarchy CASCADE;
DROP VIEW IF EXISTS enterprise_isic_summary CASCADE;
DROP TABLE IF EXISTS enterprise_isic_links CASCADE;
DROP TABLE IF EXISTS worker_dispatches CASCADE;
DROP TABLE IF EXISTS worker_reduction_requests CASCADE;
DROP TABLE IF EXISTS isic4_classifications CASCADE;

-- Drop old enums and recreate
DROP TYPE IF EXISTS dispatch_status CASCADE;
DROP TYPE IF EXISTS reduction_request_status CASCADE;

CREATE TYPE dispatch_status AS ENUM ('مسودة','قيد الموافقة','تمت الموافقة','جاري التنفيذ','مكتمل','ملغي','معلق');
CREATE TYPE reduction_request_status AS ENUM ('مسودة','قيد المراجعة','قيد مراجعة القسم','قيد المراجعة القانونية','تمت الموافقة النهائية','مرفوض','قيد التنفيذ','مكتمل');

-- 48. WORKER_DISPATCHES — سجل ارساليات العامل
CREATE TABLE worker_dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_number TEXT UNIQUE NOT NULL,
  sending_enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  sending_enterprise_name TEXT,
  receiving_enterprise_id UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,
  receiving_enterprise_name TEXT,
  occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
  link_id UUID REFERENCES enterprise_occupation_links(id) ON DELETE SET NULL,
  worker_name TEXT NOT NULL,
  worker_national_id TEXT,
  worker_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  dispatch_duration INTERVAL,
  purpose TEXT NOT NULL,
  legal_basis TEXT,
  status dispatch_status NOT NULL DEFAULT 'مسودة',
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  safety_briefing_done BOOLEAN DEFAULT FALSE,
  medical_clearance_done BOOLEAN DEFAULT FALSE,
  contract_amendment_required BOOLEAN DEFAULT FALSE,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 49. WORKER_REDUCTION_REQUESTS — سجل طلبات تخفيض العمال
CREATE TABLE worker_reduction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  enterprise_name TEXT NOT NULL,
  requested_reduction_count INTEGER NOT NULL CHECK (requested_reduction_count > 0),
  current_employee_count INTEGER,
  reduction_reason TEXT NOT NULL,
  reduction_category TEXT NOT NULL DEFAULT 'economic',
  legal_basis TEXT,
  detailed_description TEXT,
  expected_savings NUMERIC(15,2),
  affected_occupations UUID[] DEFAULT '{}',
  affected_member_ids UUID[] DEFAULT '{}',
  affected_worker_names TEXT[],
  alternative_reemployment_plan TEXT,
  reemployment_agency_notified BOOLEAN DEFAULT FALSE,
  ministry_notified BOOLEAN DEFAULT FALSE,
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
  effective_date DATE,
  execution_notes TEXT,
  executed_by UUID REFERENCES profiles(id),
  executed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 50. ISIC4_CLASSIFICATIONS — الدليل الوطني لتصنيف المنشآت الاقتصادية
CREATE TABLE isic4_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isic_code TEXT UNIQUE NOT NULL,
  parent_code TEXT REFERENCES isic4_classifications(isic_code) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('section','division','group','class')),
  depth INTEGER NOT NULL DEFAULT 1,
  description_ar TEXT NOT NULL,
  description_en TEXT,
  section_code TEXT,
  section_name TEXT,
  division_code TEXT,
  division_name TEXT,
  group_code TEXT,
  group_name TEXT,
  sector sector,
  activity_type TEXT,
  employee_range TEXT,
  capital_range TEXT,
  regulatory_notes TEXT,
  enterprise_count INTEGER DEFAULT 0,
  total_employees INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 51. ENTERPRISE_ISIC_LINKS — ربط المنشآت بالتصنيف ISIC-4
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

-- Triggers
CREATE TRIGGER trg_dispatches_updated_at BEFORE UPDATE ON worker_dispatches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reduction_requests_updated_at BEFORE UPDATE ON worker_reduction_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_isic4_updated_at BEFORE UPDATE ON isic4_classifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update ISIC4 enterprise count
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

-- Auto-approve dispatch workflow
CREATE OR REPLACE FUNCTION auto_approve_dispatch() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'تمت الموافقة' AND OLD.status != 'تمت الموافقة' THEN
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auto_approve_dispatch BEFORE UPDATE ON worker_dispatches FOR EACH ROW EXECUTE FUNCTION auto_approve_dispatch();

-- Auto-advance reduction request workflow
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

-- Views
CREATE OR REPLACE VIEW worker_dispatches_full AS
SELECT wd.*,
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

CREATE OR REPLACE VIEW reduction_requests_full AS
SELECT rrr.*,
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

CREATE OR REPLACE VIEW isic4_hierarchy AS
SELECT c.isic_code, c.level, c.depth, c.description_ar, c.description_en,
  c.sector, c.activity_type, c.enterprise_count, c.total_employees,
  s.description_ar AS section_name_ar, s.description_en AS section_name_en,
  d.description_ar AS division_name_ar, d.description_en AS division_name_en,
  g.description_ar AS group_name_ar, g.description_en AS group_name_en
FROM isic4_classifications c
LEFT JOIN isic4_classifications s ON s.isic_code = c.section_code AND s.level = 'section'
LEFT JOIN isic4_classifications d ON d.isic_code = c.division_code AND d.level = 'division'
LEFT JOIN isic4_classifications g ON g.isic_code = c.group_code AND g.level = 'group';

CREATE OR REPLACE VIEW enterprise_isic_summary AS
SELECT ce.id AS enterprise_id, ce.name_ar AS enterprise_name, ce.commercial_register_number,
  COUNT(DISTINCT eil.isic_code) AS classification_count,
  STRING_AGG(DISTINCT i4.description_ar, ' | ') AS classifications_ar,
  MAX(CASE WHEN eil.is_primary THEN i4.description_ar END) AS primary_activity,
  MAX(CASE WHEN eil.is_primary THEN i4.isic_code END) AS primary_isic_code
FROM commercial_establishments ce
LEFT JOIN enterprise_isic_links eil ON eil.enterprise_id = ce.id
LEFT JOIN isic4_classifications i4 ON i4.isic_code = eil.isic_code
GROUP BY ce.id, ce.name_ar, ce.commercial_register_number;
`;

async function migrate() {
  console.log('🔄 Redesigning worker_dispatches, worker_reduction_requests, isic4_classifications\n');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Split by semicolons, handling dollar quotes
    const statements = [];
    let current = '';
    let inDollar = false;
    let dollarTag = '';
    
    for (let i = 0; i < MIGRATION_SQL.length; i++) {
      const ch = MIGRATION_SQL[i];
      
      if (ch === '$') {
        const rest = MIGRATION_SQL.slice(i);
        const m = rest.match(/^\$[a-zA-Z_]*\$/);
        if (m) {
          if (!inDollar) {
            inDollar = true;
            dollarTag = m[0];
          } else if (m[0] === dollarTag) {
            inDollar = false;
            dollarTag = '';
          }
          current += m[0];
          i += m[0].length - 1;
          continue;
        }
      }
      
      if (ch === ';' && !inDollar) {
        const trimmed = current.trim();
        if (trimmed && !trimmed.startsWith('--')) {
          statements.push(trimmed);
        }
        current = '';
      } else {
        current += ch;
      }
    }
    const last = current.trim();
    if (last && !last.startsWith('--')) statements.push(last);
    
    let ok = 0, fail = 0;
    
    for (const stmt of statements) {
      try {
        await client.query('BEGIN');
        await client.query(stmt);
        await client.query('COMMIT');
        ok++;
      } catch (err) {
        await client.query('ROLLBACK');
        if (err.message.includes('already exists') || err.message.includes('does not exist') || err.message.includes('cannot drop')) {
          ok++;
        } else {
          console.error(`⚠️  ${err.message.slice(0, 120)}`);
          fail++;
        }
      }
    }
    
    console.log(`\n✅ Migration complete: ${ok} applied, ${fail} failed`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
