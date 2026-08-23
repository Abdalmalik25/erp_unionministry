import pg from 'pg';
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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 30000 });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function seed() {
  console.log('🌱 Starting seed...\n');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Organizational Entities
    const entityData = [
      ['الاتحاد العام لنقابات العمال اليمنيين', 'federation', 'active', 'صنعاء', 'medium', 75, 'FED-001', 'REG-001', 'labor', 'nationwide', 'national'],
      ['نقابة عمال صنعاء', 'union', 'active', 'صنعاء', 'high', 85, 'UNI-001', 'REG-002', 'labor', 'single_governorate', 'governorate'],
      ['نقابة عمال عدن', 'union', 'active', 'عدن', 'medium', 70, 'UNI-002', 'REG-003', 'labor', 'single_governorate', 'governorate'],
      ['نقابة عمال تعز', 'union', 'active', 'تعز', 'low', 60, 'UNI-003', 'REG-004', 'labor', 'single_governorate', 'governorate'],
      ['نقابة عمال الحديدة', 'union', 'active', 'الحديدة', 'high', 80, 'UNI-004', 'REG-005', 'labor', 'single_governorate', 'governorate'],
      ['نقابة عمال مأرب', 'union', 'active', 'مأرب', 'low', 55, 'UNI-005', 'REG-006', 'labor', 'single_governorate', 'governorate'],
      ['نقابة عمالحضرموت', 'union', 'active', 'حضرموت', 'medium', 65, 'UNI-006', 'REG-007', 'labor', 'single_governorate', 'governorate'],
      ['الشركة اليمنية للاتصالات', 'organization', 'active', 'صنعاء', 'high', 90, 'COM-001', 'REG-008', 'professional', 'nationwide', 'national'],
      ['المؤسسة اليمنية للبترول', 'organization', 'active', 'عدن', 'high', 88, 'COM-002', 'REG-009', 'professional', 'nationwide', 'national'],
      ['البنك المركزي اليمني', 'organization', 'active', 'صنعاء', 'high', 92, 'COM-003', 'REG-010', 'professional', 'nationwide', 'national'],
      ['الشركة اليمنية للكهرباء', 'organization', 'active', 'صنعاء', 'medium', 72, 'COM-004', 'REG-011', 'professional', 'nationwide', 'national'],
      ['الهيئة اليمنية للموانئ', 'organization', 'active', 'عدن', 'medium', 68, 'ORG-001', 'REG-012', 'professional', 'multi_governorate', 'regional'],
      ['الشركة اليمنية للموانئ البحرية', 'organization', 'active', 'عدن', 'low', 50, 'COM-005', 'REG-013', 'professional', 'single_governorate', 'governorate'],
      ['مصنع السكر اليمني', 'organization', 'inactive', 'تعز', 'low', 45, 'COM-006', 'REG-014', 'employers', 'single_governorate', 'governorate'],
      ['الشركة اليمنية للمقاولات العامة', 'organization', 'active', 'صنعاء', 'medium', 62, 'COM-007', 'REG-015', 'employers', 'multi_governorate', 'regional'],
    ];

    const entityIds = [];
    for (const [nameAr, entityType, status, gov, riskLevel, riskScore, unifiedCode, regNum, classification, geoScope, govLevel] of entityData) {
      const r = await client.query(
        `INSERT INTO organizational_entities (name_ar, entity_type, status, governorate, compliance_status, risk_level, ai_risk_score, unified_code, registration_number, classification, geographic_scope, governance_level, legal_form, establishment_date, registration_date, city, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()) RETURNING entity_id`,
        [nameAr, entityType, status, gov, status === 'active' ? 'compliant' : 'non_compliant', riskLevel, riskScore, unifiedCode, regNum, classification, geoScope, govLevel, entityType === 'union' ? 'syndicate' : entityType === 'federation' ? 'federation' : 'association', '2015-01-01', '2015-06-01', gov]
      );
      entityIds.push(r.rows[0].entity_id);
    }
    console.log('  Entities: ' + entityIds.length);

    // 2. Professions
    const profData = [
      ['مهندس برمجيات', 'software_engineer', 'ISCO-1512', 'تقنية المعلومات'],
      ['محاسب', 'accountant', 'ISCO-3411', 'المحاسبة'],
      ['مدير موارد بشرية', 'hr_manager', 'ISCO-1213', 'الموارد البشرية'],
      ['محامٍ', 'lawyer', 'ISCO-2611', 'القانون'],
      ['طبيب عام', 'doctor', 'ISCO-2212', 'الصحة'],
      ['معلم', 'teacher', 'ISCO-2320', 'التعليم'],
      ['فنى صيانة', 'maintenance_tech', 'ISCO-7233', 'الصيانة'],
      ['سائق', 'driver', 'ISCO-8312', 'النقل'],
      ['عامل بناء', 'construction_worker', 'ISCO-7111', 'البناء'],
      ['عامل صناعي', 'factory_worker', 'ISCO-8111', 'الصناعة'],
      ['كاتب', 'clerk', 'ISCO-4212', 'الإدارة'],
      [' Officer سلامة', 'safety_officer', 'ISCO-3422', 'السلامة'],
      ['مشرف إنتاج', 'production_supervisor', 'ISCO-3119', 'الإنتاج'],
      ['تقني مختبر', 'lab_tech', 'ISCO-3111', 'المختبرات'],
      ['فني كهرباء', 'electrician', 'ISCO-7411', 'الكهرباء'],
    ];

    const profIds = [];
    for (const [nameAr, code, isco, sector] of profData) {
      const r = await client.query(
        `INSERT INTO professions (name_ar, code, isco_code, sector, major_group_code, major_group_name, family, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'معتمدة', NOW(), NOW()) RETURNING id`,
        [nameAr, code, isco, sector, isco.split('-')[0], sector, sector]
      );
      profIds.push(r.rows[0].id);
    }
    console.log('  Professions: ' + profIds.length);

    // 3. Members (80)
    const fnames = ['أحمد', 'محمد', 'عبدالله', 'خالد', 'عمر', 'سالم', 'ياسر', 'عادل', 'هاني', 'باسم',
      'فاطمة', 'نورا', 'سارة', 'مريم', 'هدى', 'رنا', 'ameer', 'سلطان', 'ماجد', 'وليد'];
    const lnames = ['العمري', 'الحسني', 'المقطري', 'الشرملي', 'السباعي', 'الشهاري', 'اليازعي', 'الحيمي', 'القرني', 'المؤيدي'];

    const memberIds = [];
    for (let i = 0; i < 40; i++) {
      const fn = fnames[i % fnames.length];
      const ln = lnames[i % lnames.length];
      const status = i < 30 ? 'active' : i < 35 ? 'inactive' : 'suspended';
      const gender = i < 25 ? 'male' : 'female';
      const year = 1980 + (i % 20);
      const month = String(1 + (i % 12)).padStart(2, '0');
      const day = String(1 + (i % 28)).padStart(2, '0');

      const r = await client.query(
        `INSERT INTO members (entity_id, full_name, national_id, status, gender, birth_date, phone, join_date, profession, membership_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING id`,
        [entityIds[i % entityIds.length], fn + ' ' + ln, '30' + String(i).padStart(8, '0'), status, gender,
         year + '-' + month + '-' + day, '77' + String(i).padStart(7, '0'),
         '2020-' + month + '-01', profData[i % profData.length][0], i % 3 === 0 ? 'honorary' : 'regular']
      );
      memberIds.push(r.rows[0].id);
    }
    console.log('  Members: ' + memberIds.length);

    // 4. Violations (40)
    const vTypes = ['wage', 'safety', 'contract', 'documentation', 'working_hours'];
    const sevs = ['minor', 'major', 'critical'];
    const vStat = ['open', 'under_review', 'resolved', 'closed', 'appealed'];
    for (let i = 0; i < 40; i++) {
      const m = String(1 + (i % 12)).padStart(2, '0');
      const d = String(1 + (i % 28)).padStart(2, '0');
      await client.query(
        `INSERT INTO violations (entity_id, violation_number, violation_type, severity, status, description, detected_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [entityIds[i % entityIds.length], 'VIO-2024-' + String(i + 1).padStart(4, '0'), vTypes[i % vTypes.length], sevs[i % sevs.length],
         vStat[i % vStat.length], 'مخالفة رقم ' + (i + 1), '2024-' + m + '-' + d]
      );
    }
    console.log('  Violations: 40');

    // 5. Inspections (30) — uses enterprise_id
    const iTypes = ['روتينية', 'طارئة', 'سنوية', 'متابعة'];
    const iStat = ['متوافق بالكامل', 'متوافق جزئياً', 'غير متوافق'];
    for (let i = 0; i < 30; i++) {
      const m = String(1 + (i % 12)).padStart(2, '0');
      const d = String(1 + (i % 28)).padStart(2, '0');
      await client.query(
        `INSERT INTO inspections (enterprise_id, inspection_number, inspection_type, compliance_status, overall_score, inspector_name, inspection_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [entityIds[i % entityIds.length], 'INS-2024-' + String(i + 1).padStart(4, '0'), iTypes[i % iTypes.length], iStat[i % iStat.length],
         Math.floor(Math.random() * 40) + 60, 'مفتش رقم ' + (i + 1), '2024-' + m + '-' + d]
      );
    }
    console.log('  Inspections: 30');

    // 6. Activities (25)
    const aTypes = ['training', 'seminar', 'meeting', 'workshop', 'election'];
    for (let i = 0; i < 25; i++) {
      const m = String(1 + (i % 12)).padStart(2, '0');
      const d = String(1 + (i % 28)).padStart(2, '0');
      await client.query(
        `INSERT INTO activities (entity_id, activity_number, activity_name, activity_type, status, start_date, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [entityIds[i % entityIds.length], 'ACT-2024-' + String(i + 1).padStart(4, '0'), 'نشاط رقم ' + (i + 1),
         aTypes[i % aTypes.length], i < 20 ? 'completed' : 'planned',
         '2024-' + m + '-' + d, 'وصف النشاط رقم ' + (i + 1)]
      );
    }
    console.log('  Activities: 25');

    // 7. Documents (35)
    const docTypes = ['contract', 'certificate', 'report', 'official_letter', 'meeting_minutes'];
    for (let i = 0; i < 35; i++) {
      await client.query(
        `INSERT INTO documents (entity_id, document_name, document_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [entityIds[i % entityIds.length], 'مستند رقم ' + (i + 1), docTypes[i % docTypes.length],
         i < 30 ? 'archived' : 'draft']
      );
    }
    console.log('  Documents: 35');

    // 8. Licenses (20)
    for (let i = 0; i < 20; i++) {
      const m = String(1 + (i % 12)).padStart(2, '0');
      await client.query(
        `INSERT INTO licenses (entity_id, license_number, license_type, status, issue_date, expiry_date, issuing_authority, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [entityIds[i % entityIds.length], 'LIC-2024-' + String(i + 1).padStart(4, '0'),
         'commercial', i < 15 ? 'valid' : 'expired',
         '2023-' + m + '-01', '2025-' + m + '-01', 'وزارة الشؤون الاجتماعية والعمل']
      );
    }
    console.log('  Licenses: 20');

    // 9. Compliance Alerts (15) — uses enterprise_id
    for (let i = 0; i < 15; i++) {
      await client.query(
        `INSERT INTO compliance_alerts (enterprise_id, alert_type, severity, title, description, is_resolved, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [entityIds[i % entityIds.length], 'deadline', sevs[i % sevs.length],
         'تنبيه رقم ' + (i + 1), 'وصف التنبيه رقم ' + (i + 1), i < 10 ? false : true]
      );
    }
    console.log('  Compliance Alerts: 15');

    // 10. Fee Payments (20)
    for (let i = 0; i < 20; i++) {
      const m = String(1 + (i % 12)).padStart(2, '0');
      const d = String(1 + (i % 28)).padStart(2, '0');
      await client.query(
        `INSERT INTO fee_payments (entity_id, amount, payment_date, payment_method, status, receipt_number, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [entityIds[i % entityIds.length], Math.floor(Math.random() * 500000) + 50000,
         '2024-' + m + '-' + d, 'bank_transfer', i < 18 ? 'completed' : 'pending',
         'RCT-2024-' + String(i + 1).padStart(5, '0')]
      );
    }
    console.log('  Fee Payments: 20');

    // 11. Training Records (15) — uses enterprise_id
    for (let i = 0; i < 15; i++) {
      const m = String(1 + (i % 12)).padStart(2, '0');
      await client.query(
        `INSERT INTO training_records (enterprise_id, member_id, training_name, training_type, start_date, end_date, duration_hours, status, assessment_score, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [entityIds[i % entityIds.length], memberIds[i % memberIds.length],
         'دورة تدريبية رقم ' + (i + 1), 'safety',
         '2024-' + m + '-01', '2024-' + m + '-15',
         40 + (i * 8), i < 12 ? 'مكتمل' : 'قيد التنفيذ',
         60 + Math.floor(Math.random() * 40)]
      );
    }
    console.log('  Training Records: 15');

    // 12. Entity Relationships (10)
    for (let i = 0; i < 10; i++) {
      await client.query(
        `INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, status, created_at)
         VALUES ($1, $2, $3, 'active', NOW())`,
        [entityIds[i], entityIds[(i + 1) % entityIds.length], i < 5 ? 'parent' : 'branch']
      );
    }
    console.log('  Entity Relationships: 10');

    // 13. Board Members (12)
    for (let i = 0; i < 12; i++) {
      await client.query(
        `INSERT INTO board_members (entity_id, full_name, position, appointment_date, end_date, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [entityIds[i % Math.min(entityIds.length, 8)], 'عضو مجلس رقم ' + (i + 1),
         i < 4 ? 'chairman' : i < 8 ? 'member' : 'secretary', '2023-01-01', '2026-01-01']
      );
    }
    console.log('  Board Members: 12');

    // 14. Legal References (8)
    const laws = [
      ['قانون العمل رقم ١ لسنة ١٩٩٥', 'labor_law', '1', '1995'],
      ['اللائحة التنفيذية لقانون العمل', 'regulation', '42', '2020'],
      ['قرار وزير الشؤون الاجتماعية رقم ١٥', 'ministerial_decree', '15', '2018'],
      ['اتفاقية ILO رقم 87', 'ilo_convention', '87', '1948'],
      ['اتفاقية ILO رقم 98', 'ilo_convention', '98', '1949'],
      ['اتفاقية ILO رقم 100', 'ilo_convention', '100', '1951'],
      ['اتفاقية ILO رقم 105', 'ilo_convention', '105', '1957'],
      ['اتفاقية ILO رقم 111', 'ilo_convention', '111', '1958'],
    ];
    for (const [name, type, number, year] of laws) {
      await client.query(
        `INSERT INTO legal_references (law_name_ar, law_number, law_year, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [name, number, year, 'نافذ']
      );
    }
    console.log('  Legal References: 8');

    await client.query('COMMIT');
    console.log('\n✅ Seed complete! Total records: ~335');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e.message);
    throw e;
  } finally {
    client.release();
  }
  await pool.end();
}

seed().catch(e => { process.exit(1); });
