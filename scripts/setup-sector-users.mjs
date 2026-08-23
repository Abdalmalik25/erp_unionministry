import pg from 'pg';
import { randomBytes, scryptSync } from 'crypto';
import { readFileSync } from 'fs';

const env = readFileSync('G:\\App25\\unionministry1\\.env', 'utf8').split('\n');
env.forEach(l => {
  const t = l.trim();
  if (!t || t.startsWith('#')) return;
  const i = t.indexOf('=');
  if (i === -1) return;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!process.env[k]) process.env[k] = v;
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

const DEFAULT_PASSWORD = 'Sector@2026';

const SEED = [
  { name: 'معين محاوش', email: 'ministry@yemen.gov.ye', role: 'ministry_admin', user_type: 'ministry' },
  { name: 'خالد عبدالله المفتش', email: 'inspector@yemen.gov.ye', role: 'labor_inspector', user_type: 'ministry' },
  { name: 'سارة علي الامتثال', email: 'compliance@yemen.gov.ye', role: 'compliance_officer', user_type: 'ministry' },
  { name: 'نورة سالم السجل', email: 'registry@yemen.gov.ye', role: 'registry_officer', user_type: 'ministry' },
  { name: 'ياسر هاني التقارير', email: 'analyst@yemen.gov.ye', role: 'reports_viewer', user_type: 'ministry' },
  { name: 'علي حسن المهندس', email: 'engineers@union.ye', role: 'union_president', user_type: 'organization', organization_id: 'YE-2024-001' },
  { name: 'فاطمة أحمد الموارد', email: 'hr@union.ye', role: 'hr_officer', user_type: 'organization', organization_id: 'YE-2024-001' },
  { name: 'ماجد وليد المالي', email: 'finance@union.ye', role: 'financial_officer', user_type: 'organization', organization_id: 'YE-2024-001' },
];

const c = await pool.connect();
try {
  await c.query('BEGIN');
  await c.query(`
    CREATE TABLE IF NOT EXISTS sector_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      email text UNIQUE NOT NULL,
      role text NOT NULL,
      user_type text NOT NULL,
      password_hash text NOT NULL,
      salt text NOT NULL,
      organization_id text,
      is_active boolean DEFAULT true,
      last_login timestamptz,
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW(),
      deleted_at timestamptz
    )
  `);
  for (const u of SEED) {
    const { salt, hash } = hashPassword(DEFAULT_PASSWORD);
    await c.query(
      `INSERT INTO sector_users (name, email, role, user_type, password_hash, salt, organization_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role, user_type = EXCLUDED.user_type,
         password_hash = EXCLUDED.password_hash, salt = EXCLUDED.salt,
         organization_id = EXCLUDED.organization_id, updated_at = NOW()`,
      [u.name, u.email.toLowerCase(), u.role, u.user_type, hash, salt, u.organization_id || null]
    );
  }
  await c.query('COMMIT');
  const cnt = await c.query('SELECT COUNT(*)::int n FROM sector_users WHERE deleted_at IS NULL');
  console.log('✅ تم إنشاء/تحديث جدول sector_users. عدد المستخدمين:', cnt.rows[0].n);
  console.log('🔑 كلمة المرور الموحّدة لجميع المستخدمين التجريبيين:', DEFAULT_PASSWORD);
} catch (e) {
  await c.query('ROLLBACK');
  console.error('❌ خطأ:', e.message);
} finally {
  await c.release();
  await pool.end();
}
