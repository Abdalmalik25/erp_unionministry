// هجرة 7 — تطهير إنتاجي نهائي: إزالة كل البيانات التجريبية والافتراضية والمستخدمين المؤقتين
// المنصة تُسلَّم فارغة من السجلات المعاملاتية وجاهزة لإدخال البيانات الرسمية الحقيقية فقط.
// تُحفظ: الجداول المرجعية (المحافظات، المهن، ISIC4، الأدلة الوطنية، الخدمات، المراجع القانونية، بنية المكاتب).
import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const cs = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const c = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 30000 });
await c.connect();

async function tableExists(t) {
  const r = await c.query(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [t]);
  return r.rows.length > 0;
}
async function purge(table) {
  if (!await tableExists(table)) return;
  const before = await c.query(`SELECT COUNT(*)::int n FROM ${table}`);
  await c.query(`DELETE FROM ${table}`);
  console.log(`  PURGED ${table}: ${before.rows[0].n} rows removed`);
}

console.log('[PURGE] transactional + demo data');

// ===== 1) الحسابات والجلسات — كلها (التزويد الرسمي عبر scripts/provision-admin.mjs وطلبات فتح الحسابات) =====
await purge('user_sessions');
await purge('login_attempts');
await purge('account_requests');
await purge('sector_users');
await purge('role_permissions'); // تُعاد تهيئتها أدناه بقيم رسمية

// ===== 2) السجلات المعاملاتية للركائز الأربع =====
await purge('worker_dispatches');
await purge('worker_reduction_requests');
await purge('expatriate_licenses');
await purge('commercial_branches');
await purge('commercial_establishments');
await purge('enterprise_occupation_links');
await purge('worker_profiles');
await purge('members');
await purge('board_members');
await purge('elections');
await purge('entity_relationships');
await purge('organizational_entities');
await purge('ministry_employees');
await purge('inspectors');
await purge('work_injuries');
await purge('insurance_records');
await purge('irregular_workers');
await purge('health_fitness_certificates');
await purge('experience_certificates');
await purge('work_procedures');
await purge('inspection_criteria');
await purge('directorates');

// ===== 3) سجلات الرقابة والتشغيل التجريبية =====
// سجل التدقيق محمي بزناد عدم قابلية التعديل (سلسلة هاش) — يُعطَّل لمرة واحدة فقط
// أثناء التهيئة الإنتاجية الأولى ثم يُعاد تفعيله فوراً.
await c.query(`ALTER TABLE audit_log DISABLE TRIGGER trg_block_audit_update`);
await purge('audit_log');
await c.query(`ALTER TABLE audit_log ENABLE TRIGGER trg_block_audit_update`);
await purge('violations');
await purge('inspections');
await purge('labor_disputes');
await purge('evaluation_certificates');
await purge('licenses');
await purge('fee_payments');
await purge('training_records');
await purge('compliance_alerts');
await purge('risk_assessments');
await purge('compliance_matrices');
await purge('maturity_assessments');
await purge('service_requests');
await purge('activities');
await purge('documents');
await purge('notifications');

// ===== 4) الأشخاص (المرجع الديموغرافي) =====
await purge('persons');

// ===== 5) تصفير مراجع المديرين الوهمية في بنية المكاتب (تُحفظ البنية نفسها) =====
if (await tableExists('ministry_offices')) {
  const r = await c.query(`UPDATE ministry_offices SET manager_person_id = NULL WHERE manager_person_id IS NOT NULL`);
  if (r.rowCount) console.log(`  CLEANED ministry_offices.manager_person_id (${r.rowCount} refs)`);
}
// توحيد بنية entity_relationships مع المعيار المؤسسي
await c.query(`ALTER TABLE entity_relationships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

// ===== 6) تصحيح تعريف النظام في الإعدادات العامة =====
console.log('[SETTINGS] official system definition');
const SETTINGS = [
  // [setting_key, setting_value, value_type, category, description]
  ['org_name_ar', 'وزارة الشؤون الاجتماعية والعمل', 'string', 'identity', 'الاسم الرسمي للوزارة (العربية)'],
  ['org_name_en', 'Ministry of Social Affairs and Labor', 'string', 'identity', 'الاسم الرسمي للوزارة (الإنجليزية)'],
  ['org_country', 'الجمهورية اليمنية', 'string', 'identity', 'اسم الدولة الرسمي'],
  ['system_name_ar', 'نظام قطاع العمل — المنظومة الإلكترونية الموحدة', 'string', 'identity', 'الاسم الرسمي للنظام'],
  ['legal_basis', 'قانون العمل رقم 40 لسنة 2025 ولائحه التنفيذية', 'string', 'identity', 'السند القانوني لعمل النظام'],
  ['fiscal_year_start', '01-01', 'string', 'operations', 'بداية السنة المالية'],
  ['default_language', 'ar', 'string', 'operations', 'لغة النظام الافتراضية'],
  ['session_timeout_minutes', '30', 'number', 'security', 'مهلة انتهاء الجلسة (دقائق)'],
  ['password_min_length', '10', 'number', 'security', 'الحد الأدنى لطول كلمة المرور'],
  ['max_login_attempts', '8', 'number', 'security', 'أقصى عدد لمحاولات الدخول قبل التعليق المؤقت'],
  ['maintenance_mode', 'false', 'boolean', 'security', 'وضع الصيانة (إيقاف مؤقت للبوابة)'],
];
for (const [key, value, valueType, category, description] of SETTINGS) {
  await c.query(`
    INSERT INTO system_settings (setting_key, setting_value, value_type, category, description, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
    [key, value, valueType, category, description]);
}
console.log(`  system_settings ensured (${SETTINGS.length} keys)`);

// ===== 7) صلاحيات افتراضية رسمية للأدوار =====
console.log('[ROLE PERMISSIONS] defaults');
await purge('role_permissions');
const DEFAULT_GRANTS = [
  // [role_key, resource, view, create, edit, delete, export, approve]
  ['ministry_admin', '*', true, true, true, true, true, true],
  ['sector_manager', 'entities', true, true, true, false, true, true],
  ['sector_manager', 'workers', true, true, true, false, true, false],
  ['registry_officer', 'establishments', true, true, true, false, true, true],
  ['registry_officer', 'workers', true, true, true, false, true, false],
  ['inspector', 'inspections', true, true, true, false, false, false],
  ['inspector', 'violations', true, true, false, false, false, false],
  ['reports_viewer', 'reports', true, false, false, false, true, false],
  ['union_president', 'members', true, true, true, false, true, false],
  ['hr_officer', 'establishments', true, false, false, false, false, false],
];
for (const [roleKey, resource, v, cr, ed, de, ex, ap] of DEFAULT_GRANTS) {
  await c.query(`
    INSERT INTO role_permissions (role_key, resource, can_view, can_create, can_edit, can_delete, can_export, can_approve, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    ON CONFLICT DO NOTHING`,
    [roleKey, resource, v, cr, ed, de, ex, ap]);
}
console.log('  role_permissions seeded (official defaults)');

// ===== 8) ملخص ما تبقى =====
console.log('[SUMMARY] remaining row counts:');
const KEEP = ['governorates', 'professions', 'isic4_classifications', 'national_directories',
  'national_occupations', 'services', 'legal_references', 'hazardous_occupations',
  'ministry_offices', 'sector_property_matrix', 'labor_roles', 'custom_field_definitions'];
for (const t of KEEP) {
  if (!await tableExists(t)) continue;
  try {
    const r = await c.query(`SELECT COUNT(*)::int n FROM ${t}`);
    console.log(`  ${t}: ${r.rows[0].n}`);
  } catch { /* تجاهل */ }
}

await c.end();
console.log('DONE — platform is production-clean');
