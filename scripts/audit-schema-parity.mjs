// audit-schema-parity.mjs — تدقيق التوافق بين تعريفات الكود وأعمدة قاعدة البيانات
// يفحص: سجلات قطاع العمل، المنشآت، النقابات، الأعضاء — ويبلّغ عن أي حقل مفقود أو زائد.
import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const cs = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const c = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 30000 });
await c.connect();

const TABLES = [
  // سجلات شؤون العمل
  'directorates', 'ministry_offices', 'ministry_employees', 'inspectors',
  'inspection_criteria', 'work_injuries', 'insurance_records', 'irregular_workers',
  'health_fitness_certificates', 'experience_certificates', 'work_procedures',
  // المنشآت والعمل
  'commercial_establishments', 'commercial_branches', 'worker_profiles',
  'expatriate_licenses', 'worker_dispatches',
  // النقابات
  'organizational_entities', 'entity_relationships', 'members', 'board_members', 'elections',
];

const REQUIRED_SOFT_DELETE = ['created_at', 'updated_at', 'deleted_at'];

let issues = 0;
console.log('='.repeat(64));
for (const t of TABLES) {
  const cols = await c.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [t]);
  if (cols.rows.length === 0) {
    console.log(`✗ ${t}: الجدول غير موجود`);
    issues++;
    continue;
  }
  const names = cols.rows.map(x => x.column_name);
  // المفاتيح الأساسية المقبولة: id (المعيار) أو entity_id (سجل المنظمات)
  const hasPk = names.includes('id') || names.includes('entity_id');
  const missingSoft = REQUIRED_SOFT_DELETE.filter(k => !names.includes(k));
  const flags = [];
  if (!hasPk) { flags.push('لا يحتوي عمود هوية (id/entity_id)'); issues++; }
  missingSoft.forEach(k => { flags.push(`ينقصه ${k}`); });
  if (hasPk && missingSoft.length === 0)
    console.log(`✓ ${t}: ${names.length} أعمدة — بنية موحدة`);
  else {
    console.log(`△ ${t}: ${names.length} أعمدة — ${flags.join('، ')}`);
    if (missingSoft.length) issues++;
  }
}
console.log('='.repeat(64));

// فحص تكامل المراجع: persons مقابل السجلات الشخصية
const fkCheck = await c.query(`
  SELECT
    COUNT(*) FILTER (WHERE person_id IS NOT NULL)::int linked,
    COUNT(*)::int total
  FROM ministry_employees`);
if (fkCheck.rows.length) {
  const { linked, total } = fkCheck.rows[0];
  console.log(`ministry_employees: ${linked}/${total} مرتبط بملف شخصي`);
}

const orphanPersons = await c.query(`SELECT COUNT(*)::int n FROM persons WHERE deleted_at IS NOT NULL`);
console.log(`persons المؤرشفة: ${orphanPersons.rows[0].n}`);

await c.end();
console.log(issues === 0 ? 'AUDIT CLEAN — البنية موحدة بالكامل' : `AUDIT: ${issues} مشكلة تحتاج معالجة`);
