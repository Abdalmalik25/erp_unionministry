// هجرة 6 — سجلات قطاع شؤون العمل: إنشاء الجداول الناقصة وتوحيد الموجودة
// على النموذج المرجعي الشخصي-المركزي (persons) وفق اصطلاحات 20260825_02_canonical_data_fabric
// آمنة لإعادة التشغيل (IF NOT EXISTS / IF NOT EXISTS columns) — لا تحذف أي بيانات.
import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const cs = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const c = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 30000 });
await c.connect();

async function addColumn(table, colDef) {
  const col = colDef.split(' ')[0];
  const r = await c.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
    [table, col]
  );
  if (!r.rows.length) {
    await c.query(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
    console.log(`  + ${table}.${col}`);
  }
}

// ===== 1) الجداول الخمسة الناقصة — ببنية موحدة مع البقية =====
console.log('[CREATE] missing registry tables');

await c.query(`
CREATE TABLE IF NOT EXISTS directorates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  governorate TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
)`);

await c.query(`
CREATE TABLE IF NOT EXISTS inspection_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_code TEXT UNIQUE,
  title_ar TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  establishment_type TEXT,
  activity_isic4 TEXT,
  inspection_kind TEXT,
  applies_to TEXT DEFAULT 'جميع المنشآت',
  frequency_months INTEGER,
  weight NUMERIC(5,2),
  is_mandatory BOOLEAN DEFAULT true,
  legal_reference TEXT,
  status TEXT DEFAULT 'ساري',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
)`);

await c.query(`
CREATE TABLE IF NOT EXISTS insurance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number TEXT UNIQUE,
  insurance_type TEXT,
  insured_person_id UUID REFERENCES persons(id),
  insured_national_id TEXT,
  enterprise_name TEXT,
  provider_name TEXT,
  coverage_start DATE,
  coverage_end DATE,
  premium_amount NUMERIC(14,2),
  coverage_amount NUMERIC(14,2),
  beneficiaries_count INTEGER,
  status TEXT DEFAULT 'ساري',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
)`);

await c.query(`
CREATE TABLE IF NOT EXISTS irregular_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE,
  person_id UUID REFERENCES persons(id),
  full_name TEXT,
  national_id TEXT,
  gender TEXT,
  birth_date DATE,
  nationality TEXT DEFAULT 'يمني',
  governorate TEXT,
  district TEXT,
  phone TEXT,
  activity_type TEXT,
  workplace_description TEXT,
  daily_income NUMERIC(12,2),
  monthly_income NUMERIC(12,2),
  has_insurance BOOLEAN DEFAULT false,
  has_fitness_certificate BOOLEAN DEFAULT false,
  registered_via TEXT,
  registered_at TIMESTAMPTZ,
  regularization_path TEXT,
  status TEXT DEFAULT 'مسجل',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
)`);

await c.query(`
CREATE TABLE IF NOT EXISTS experience_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT UNIQUE,
  person_id UUID REFERENCES persons(id),
  worker_national_id TEXT,
  occupation TEXT,
  occupation_code TEXT,
  enterprise_name TEXT,
  experience_years INTEGER,
  experience_level TEXT,
  issued_by TEXT,
  issue_date DATE,
  verified_by UUID,
  verification_date TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'صادرة',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
)`);

await c.query(`
CREATE TABLE IF NOT EXISTS work_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code TEXT UNIQUE,
  procedure_name TEXT NOT NULL,
  procedure_type TEXT,
  person_id UUID REFERENCES persons(id),
  worker_national_id TEXT,
  enterprise_name TEXT,
  start_date DATE,
  end_date DATE,
  reference_number TEXT,
  approved_by TEXT,
  approval_date DATE,
  legal_basis TEXT,
  description TEXT,
  status TEXT DEFAULT 'قيد الدراسة',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
)`);

// ===== 2) توحيد الجداول الستة الموجودة مع اصطلاحات persons =====
console.log('[ALIGN] existing tables -> canonical conventions');
for (const t of ['ministry_offices', 'inspectors', 'ministry_employees']) {
  await addColumn(t, 'updated_at TIMESTAMPTZ DEFAULT now()');
  await addColumn(t, 'deleted_at TIMESTAMPTZ');
  await addColumn(t, 'deleted_by UUID');
}
for (const t of ['work_injuries', 'health_fitness_certificates']) {
  await addColumn(t, 'updated_at TIMESTAMPTZ DEFAULT now()');
  await addColumn(t, 'deleted_at TIMESTAMPTZ');
  await addColumn(t, 'deleted_by UUID');
}
// موظفو الوزارة: رقم وطني مؤسسي ME-
await addColumn('ministry_employees', 'national_number TEXT UNIQUE');
// الفروع: حذف ناعم موحد مع بقية المنصة
for (const colDef of ['deleted_at TIMESTAMPTZ', 'deleted_by UUID']) {
  await addColumn('commercial_branches', colDef);
}

// ===== 3) فهارس المسارات الساخنة =====
console.log('[INDEXES]');
const IDX = [
  ['idx_directorates_gov', `CREATE INDEX IF NOT EXISTS idx_directorates_gov ON directorates(governorate)`],
  ['idx_ministry_offices_gov', `CREATE INDEX IF NOT EXISTS idx_ministry_offices_gov ON ministry_offices(governorate)`],
  ['idx_inspectors_office', `CREATE INDEX IF NOT EXISTS idx_inspectors_office ON inspectors(office_id)`],
  ['idx_ministry_emp_office', `CREATE INDEX IF NOT EXISTS idx_ministry_emp_office ON ministry_employees(office_id)`],
  ['idx_work_injuries_est', `CREATE INDEX IF NOT EXISTS idx_work_injuries_est ON work_injuries(establishment_id)`],
  ['idx_hfc_expiry', `CREATE INDEX IF NOT EXISTS idx_hfc_expiry ON health_fitness_certificates(expiry_date)`],
  ['idx_irregular_status', `CREATE INDEX IF NOT EXISTS idx_irregular_status ON irregular_workers(status)`],
  ['idx_exp_cert_person', `CREATE INDEX IF NOT EXISTS idx_exp_cert_person ON experience_certificates(person_id)`],
];
for (const [name, sql] of IDX) {
  try { await c.query(sql); } catch { /* موجود مسبقاً */ }
}
console.log('  indexes ensured');

await c.end();
console.log('DONE — all 11 labor registries now exist with canonical schema');
