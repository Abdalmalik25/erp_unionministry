import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
} catch (e) {
  console.warn('Could not load .env:', e.message);
}

import { pool } from '../server/middleware/shared.js';
import { hashPassword } from '../server/middleware/auth.js';

async function seedOfficialAccounts() {
  const accounts = [
    { email: 'ministry@yemen.gov.ye', name: 'محمد أحمد الوزير', role: 'ministry_admin', user_type: 'ministry' },
    { email: 'supervisory@yemen.gov.ye', name: 'د. عبدالملك حيدر - مدير عام الرقابة والتفتيش', role: 'supervisory_director', user_type: 'ministry' },
    { email: 'legal@yemen.gov.ye', name: 'المستشار القانوني - رئيس لجان التحكيم', role: 'legal_counsel', user_type: 'ministry' },
    { email: 'inspector@yemen.gov.ye', name: 'خالد عبدالله - مفتش العمل والسلامة المهنية', role: 'labor_inspector', user_type: 'ministry' },
    { email: 'compliance@yemen.gov.ye', name: 'سارة علي - مسؤول الامتثال وتصاريح العمل', role: 'compliance_officer', user_type: 'ministry' },
    { email: 'registry@yemen.gov.ye', name: 'نورة سالم - موظف السجل الوطني وتوصيف المهن', role: 'registry_officer', user_type: 'ministry' },
    { email: 'analyst@yemen.gov.ye', name: 'ياسر هاني - محلل البيانات والذكاء المؤسسي', role: 'reports_viewer', user_type: 'ministry' },
    { email: 'engineers@union.ye', name: 'علي حسن المهندس - رئيس الكيان المسجل', role: 'union_president', user_type: 'entity', organization_id: 'YE-2024-001' },
    { email: 'hr@union.ye', name: 'فاطمة أحمد - مسؤول الموارد البشرية', role: 'hr_officer', user_type: 'entity', organization_id: 'YE-2024-001' },
    { email: 'finance@union.ye', name: 'ماجد وليد - المسؤول المالي والتحصيل', role: 'financial_officer', user_type: 'entity', organization_id: 'YE-2024-001' }
  ];

  for (const acc of accounts) {
    const { salt, hash } = hashPassword('Sector@2026');
    await pool.query(`
      INSERT INTO sector_users (name, email, role, user_type, password_hash, salt, organization_id, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
      ON CONFLICT (email) DO UPDATE 
      SET name = $1, role = $3, user_type = $4, password_hash = $5, salt = $6, organization_id = $7, is_active = true, updated_at = NOW()
    `, [acc.name, acc.email, acc.role, acc.user_type, hash, salt, acc.organization_id || null]);
  }
  console.log('SUCCESS: All 10 official accounts seeded in PostgreSQL.');
  process.exit(0);
}

seedOfficialAccounts().catch(e => {
  console.error('Seed error:', e);
  process.exit(1);
});
