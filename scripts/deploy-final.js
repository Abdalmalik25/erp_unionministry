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
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}

loadEnv();
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) { console.error('No DB URL'); process.exit(1); }

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  statement_timeout: 120000,
  query_timeout: 120000,
});

async function run(label, sql) {
  try {
    await pool.query(sql);
    console.log(`  OK: ${label}`);
    return true;
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log(`  SKIP: ${label} (already exists)`);
      return true;
    }
    console.log(`  FAIL: ${label} -> ${err.message.slice(0, 150)}`);
    return false;
  }
}

async function main() {
  console.log('=== Deploying Final Schema ===\n');

  let ok = 0, fail = 0;

  // 1. Tables
  console.log('--- Tables ---');
  const tables = [
    ['compliance_alerts', `CREATE TABLE IF NOT EXISTS compliance_alerts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
      enterprise_name TEXT,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      title TEXT NOT NULL,
      description TEXT,
      source_table TEXT,
      source_id UUID,
      due_date DATE,
      is_acknowledged BOOLEAN DEFAULT FALSE,
      acknowledged_by UUID REFERENCES profiles(id),
      acknowledged_at TIMESTAMPTZ,
      resolution_notes TEXT,
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES profiles(id),
      is_resolved BOOLEAN DEFAULT FALSE,
      notification_sent BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
    ['fee_payments', `CREATE TABLE IF NOT EXISTS fee_payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_id UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,
      member_id UUID REFERENCES members(id) ON DELETE SET NULL,
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
      currency TEXT NOT NULL DEFAULT 'YER',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      receipt_number TEXT UNIQUE,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status TEXT NOT NULL DEFAULT 'pending',
      description TEXT,
      processed_by UUID REFERENCES profiles(id),
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
    ['worker_profiles', `CREATE TABLE IF NOT EXISTS worker_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      member_id UUID UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      current_enterprise_id UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,
      current_occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
      link_id UUID REFERENCES enterprise_occupation_links(id) ON DELETE SET NULL,
      employment_status TEXT NOT NULL DEFAULT 'active',
      employment_start_date DATE,
      employment_end_date DATE,
      contract_type TEXT,
      social_insurance_number TEXT,
      current_salary_grade TEXT,
      skills TEXT[] DEFAULT '{}',
      certifications JSONB DEFAULT '[]',
      last_medical_check_date DATE,
      next_medical_check_date DATE,
      total_experience_years INTEGER DEFAULT 0,
      compliance_score NUMERIC(5,2) DEFAULT 100,
      notes TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`],
  ];

  for (const [name, sql] of tables) {
    if (await run(`table: ${name}`, sql)) ok++; else fail++;
  }

  // 2. Indexes
  console.log('\n--- Indexes ---');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_ca_enterprise ON compliance_alerts(enterprise_id)',
    'CREATE INDEX IF NOT EXISTS idx_ca_type ON compliance_alerts(alert_type)',
    'CREATE INDEX IF NOT EXISTS idx_ca_severity ON compliance_alerts(severity)',
    'CREATE INDEX IF NOT EXISTS idx_ca_resolved ON compliance_alerts(is_resolved) WHERE is_resolved = FALSE',
    'CREATE INDEX IF NOT EXISTS idx_ca_due ON compliance_alerts(due_date) WHERE due_date IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_fp_entity ON fee_payments(entity_id) WHERE entity_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_fp_member ON fee_payments(member_id) WHERE member_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_fp_date ON fee_payments(payment_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_fp_status ON fee_payments(status)',
    'CREATE INDEX IF NOT EXISTS idx_wp_member ON worker_profiles(member_id)',
    'CREATE INDEX IF NOT EXISTS idx_wp_enterprise ON worker_profiles(current_enterprise_id) WHERE current_enterprise_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_wp_status ON worker_profiles(employment_status)',
  ];

  for (const sql of indexes) {
    if (await run(`idx`, sql)) ok++; else fail++;
  }

  // 3. Triggers
  console.log('\n--- Triggers ---');
  const triggers = [
    'CREATE TRIGGER trg_compliance_alerts_updated_at BEFORE UPDATE ON compliance_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
    'CREATE TRIGGER trg_fee_payments_updated_at BEFORE UPDATE ON fee_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
    'CREATE TRIGGER trg_worker_profiles_updated_at BEFORE UPDATE ON worker_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
  ];
  for (const sql of triggers) {
    if (await run(`trigger`, sql)) ok++; else fail++;
  }

  // 4. Materialized Views (separate to handle long queries)
  console.log('\n--- Materialized Views ---');
  if (await run('mv_dashboard_stats', `CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
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
      (SELECT COUNT(*) FROM worker_reduction_requests WHERE status NOT IN ('مرفوض','مكتمل')) AS pending_reductions,
      (SELECT COUNT(*) FROM compliance_alerts WHERE is_resolved = FALSE) AS unresolved_alerts`)) ok++; else fail++;

  if (await run('idx_mv_dashboard', 'CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard ON mv_dashboard_stats(total_professions)')) ok++; else fail++;

  if (await run('mv_enterprise_compliance', `CREATE MATERIALIZED VIEW IF NOT EXISTS mv_enterprise_compliance AS
    SELECT e.entity_id, e.name_ar, e.governorate, e.sector,
      COUNT(DISTINCT i.id) AS total_inspections,
      MAX(i.inspection_date) AS last_inspection,
      ROUND(AVG(i.overall_score), 2) AS avg_inspection_score,
      COUNT(DISTINCT CASE WHEN ec.status = 'صالحة' THEN ec.id END) AS valid_certificates,
      COUNT(DISTINCT eol.id) AS linked_occupations,
      ROUND(AVG(eol.compliance_score), 2) AS avg_compliance_score
    FROM organizational_entities e
    LEFT JOIN inspections i ON i.enterprise_id = e.entity_id
    LEFT JOIN evaluation_certificates ec ON ec.enterprise_id = e.entity_id
    LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.entity_id
    WHERE e.deleted_at IS NULL
    GROUP BY e.entity_id, e.name_ar, e.governorate, e.sector`)) ok++; else fail++;

  if (await run('idx_mv_ecompliance', 'CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ecompliance ON mv_enterprise_compliance(entity_id)')) ok++; else fail++;

  // 5. Functions
  console.log('\n--- Functions ---');
  if (await run('refresh_all_materialized_views', `CREATE OR REPLACE FUNCTION refresh_all_materialized_views() RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enterprise_compliance;
    END; $$ LANGUAGE plpgsql`)) ok++; else fail++;

  if (await run('resolve_compliance_alert', `CREATE OR REPLACE FUNCTION resolve_compliance_alert(p_alert_id UUID, p_user_id UUID, p_notes TEXT DEFAULT NULL)
    RETURNS BOOLEAN AS $$
    BEGIN
      UPDATE compliance_alerts SET is_resolved = TRUE, resolved_at = NOW(), resolved_by = p_user_id, resolution_notes = p_notes
      WHERE id = p_alert_id AND is_resolved = FALSE;
      RETURN FOUND;
    END; $$ LANGUAGE plpgsql`)) ok++; else fail++;

  // 6. Quick verify
  console.log(`\n=== Result: ${ok} OK, ${fail} FAIL ===`);
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'`);
    console.log(`Total tables in cloud: ${r.rows[0].count}`);
  } catch(e) { /* ignore */ }

  await pool.end();
  console.log('Done.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
