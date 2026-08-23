import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(name) {
  const raw = readFileSync(join(ROOT, '.env'), 'utf8');
  const m = raw.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!m) throw new Error(`Missing ${name} in .env`);
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function readSql(file) {
  return readFileSync(join(ROOT, 'src', 'app', 'utils', file), 'utf8');
}

function splitStatements(sql) {
  const statements = [];
  let buf = '';
  let inDollar = false;
  let inQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next = sql[i + 1];
    if (!inQuote && !inDollar && c === '$' && next === '$') {
      buf += '$$';
      inDollar = true;
      i++;
      continue;
    }
    if (inDollar && c === '$' && next === '$') {
      buf += '$$';
      inDollar = false;
      i++;
      continue;
    }
    if (!inDollar && c === "'") {
      inQuote = !inQuote;
      buf += c;
      continue;
    }
    if (!inDollar && !inQuote && c === ';') {
      statements.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) statements.push(buf);
  return statements;
}

const SKIP_PREFIXES = ['CREATE POLICY', 'ALTER TABLE', '--'];
const IGNORABLE_CODES = new Set(['42710', '42P07', '23505']);

async function main() {
  const reset = process.argv.includes('--reset');
  const connectionString = loadEnv('NEON_DATABASE_URL');
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('[neon] connected: ' + connectionString.replace(/\/\/[^@]+@/, '//***@'));

  let schema = readSql('schema.sql');
  schema = schema
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('--'))
    .join('\n');
  schema = schema.replace(/REFERENCES auth\.users\(id\) ON DELETE CASCADE/g, '');

  const statements = splitStatements(schema);
  let applied = 0;
  let skipped = 0;
  let ignored = 0;
  let failed = 0;
  for (const raw of statements) {
    const stmt = raw.trim();
    const head = stmt.toUpperCase();
    if (!stmt || SKIP_PREFIXES.some((p) => head.startsWith(p))) {
      skipped++;
      continue;
    }
    try {
      await client.query(stmt);
      applied++;
    } catch (err) {
      if (IGNORABLE_CODES.has(err.code)) {
        ignored++;
      } else {
        failed++;
        console.error('[neon] FAILED statement:\n' + stmt.slice(0, 400) + '\n  -> ' + err.message);
      }
    }
  }
  console.log(`[neon] schema: applied=${applied} skipped=${skipped} already_exist=${ignored} failed=${failed}`);
  if (failed > 0) {
    await client.end();
    process.exit(1);
  }

  if (reset) {
    await client.query(`
      TRUNCATE TABLE board_members, elections, election_results, activities, documents, members,
        service_requests, violations, entity_relationships, dynamic_fields, audit_log, notifications,
        reports, licenses, services, organizational_entities, profiles
      RESTART IDENTITY CASCADE
    `);
    console.log('[neon] reset: tables truncated');
  }

  let seedApplied = 0;
  let seedIgnored = 0;
  for (const raw of seedStatements()) {
    const stmt = raw.trim();
    if (!stmt) continue;
    try {
      await client.query(stmt);
      seedApplied++;
    } catch (err) {
      if (IGNORABLE_CODES.has(err.code) || err.code === '23505') {
        seedIgnored++;
      } else {
        failed++;
        console.error('[neon] SEED FAILED:\n' + stmt.slice(0, 300) + '\n  -> ' + err.message);
      }
    }
  }
  console.log(`[neon] seed: applied=${seedApplied} skipped=${seedIgnored} failed=${failed}`);
  if (failed > 0) {
    await client.end();
    process.exit(1);
  }

  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
  );
  console.log(`[neon] tables (${tables.rows.length}):`);
  for (const r of tables.rows) {
    const rowCount = await client.query(`SELECT COUNT(*)::int AS c FROM "${r.table_name}"`);
    console.log(`  - ${r.table_name}: ${rowCount.rows[0].c} rows`);
  }
  const types = await client.query(
    `SELECT count(*)::int AS c FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typtype = 'e'`
  );
  console.log(`[neon] enums: ${types.rows[0].c}`);

  const nameOk = await client.query(
    `SELECT name_ar FROM organizational_entities ORDER BY unified_code LIMIT 1`
  );
  console.log('[neon] first entity name:', JSON.stringify(nameOk.rows[0]?.name_ar));

  await client.end();
  console.log('[neon] done');
}

function seedStatements() {
  return [
    // ===== SERVICES (mirror of schema.sql seed) =====
    `INSERT INTO services (service_code, service_name, description, category, processing_days, fee_amount) VALUES
      ('SRV-001', 'تسجيل كيان جديد',           'تسجيل نقابة أو منظمة جديدة',              'تسجيل',   30,  500),
      ('SRV-002', 'تجديد الترخيص',             'تجديد ترخيص الكيان المنتهي',               'تجديد',   14,  200),
      ('SRV-003', 'تغيير البيانات الأساسية',    'تعديل بيانات الكيان المسجلة',              'تعديل',    7,    0),
      ('SRV-004', 'شهادة قيد',                  'استخراج شهادة إثبات التسجيل',             'شهادات',   3,   50),
      ('SRV-005', 'اعتماد القيادة الجديدة',     'اعتماد مجلس الإدارة المنتخب',             'اعتماد',   10,    0),
      ('SRV-006', 'اعتماد النظام الداخلي',      'مراجعة وإقرار النظام الأساسي',            'اعتماد',   21,    0),
      ('SRV-007', 'إخطار بالانتخابات',          'إشعار الوزارة بموعد الانتخابات',           'إشعار',    1,    0),
      ('SRV-008', 'اعتماد الميزانية السنوية',   'مراجعة وإقرار الميزانية',                 'مالي',     14,    0),
      ('SRV-009', 'طلب إذن تظاهرة',            'الحصول على إذن لتنظيم تظاهرة',             'أذونات',   7,    0),
      ('SRV-010', 'تسوية نزاع عمالي',           'طلب تسوية نزاع بين الكيان والأعضاء',      'نزاعات',  14,    0),
      ('SRV-011', 'استخراج صحيفة الحالة الجنائية', 'للأعضاء المرشحين للقيادة',            'شهادات',   3,   30),
      ('SRV-012', 'طلب إعفاء من الرسوم',       'الحصول على إعفاء من رسوم الخدمات',         'مالي',     14,    0)`,
    // ===== PROFILES =====
    `INSERT INTO profiles (id, email, full_name, role, is_active) VALUES
      ('f1a2b3c4-5d6e-4f78-9abc-01def2345678', 'ministry@yemen.gov.ye', 'محمد أحمد الوزير', 'ministry', true)`,
    // ===== ENTITIES (valid UUIDs) =====
    `INSERT INTO organizational_entities (
      entity_id, unified_code, registration_number, entity_type, classification, sector,
      name_ar, governorate, city, phone, email,
      president_name, president_phone, member_count, status, compliance_status,
      establishment_date, registration_date, legal_form, governance_level, geographic_scope
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'YE-2024-001', 'REG-2024-001', 'union', 'professional', 'construction',
     'نقابة المهندسين اليمنية', 'صنعاء', 'صنعاء', '+967-1-234567', 'info@engineers.ye',
     'م. عبدالله أحمد', '+967-777-123456', 15420, 'active', 'compliant',
     '1965-03-15', '2024-01-10', 'syndicate', 'national', 'nationwide'),
    ('b2c3d4e5-f607-4801-bcde-ef2345678901', 'YE-2024-002', 'REG-2024-002', 'union', 'labor', 'industry',
     'نقابة عمال البناء', 'عدن', 'عدن', '+967-2-345678', 'info@construction.ye',
     'أحمد محمد سالم', '+967-733-234567', 8750, 'active', 'compliant',
     '1978-07-22', '2024-01-10', 'syndicate', 'governorate', 'single_governorate'),
    ('c3d4e5f6-4708-4901-cdef-ef3456789012', 'YE-2024-003', 'REG-2024-003', 'union', 'professional', 'healthcare',
     'نقابة الأطباء اليمنية', 'صنعاء', 'صنعاء', '+967-1-456789', 'info@doctors.ye',
     'د. فاطمة علي', '+967-711-345678', 12300, 'active', 'compliant',
     '1971-11-05', '2024-01-12', 'syndicate', 'national', 'nationwide'),
    ('d4e5f6a7-4809-4a01-def0-ef4567890123', 'YE-2024-004', 'REG-2024-004', 'union', 'professional', 'education',
     'نقابة المعلمين', 'تعز', 'تعز', '+967-4-567890', 'info@teachers.ye',
     'أ. خالد حسن', '+967-770-456789', 25680, 'active', 'compliant',
     '1968-01-20', '2024-01-14', 'syndicate', 'governorate', 'multi_governorate'),
    ('e5f6a7b8-490a-4b01-ef01-ef5678901234', 'YE-2024-005', 'REG-2024-005', 'union', 'professional', 'other',
     'نقابة الصحفيين', 'صنعاء', 'صنعاء', '+967-1-678901', 'info@journalists.ye',
     'محمد عبدالله', '+967-777-567890', 3250, 'active', 'compliant',
     '1975-04-18', '2024-01-15', 'syndicate', 'national', 'nationwide')`,
    // ===== MEMBERS =====
    `INSERT INTO members (
      entity_id, national_id, full_name, gender, birth_date, profession, workplace, qualification,
      phone, email, governorate, city, member_number, join_date, status, membership_type,
      subscription_amount, last_payment_date, payment_status, experience_years
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', '01011234567', 'أحمد محمد علي', 'male', '1985-05-15',
     'مهندس مدني', 'شركة الإنشاءات اليمنية', 'بكالوريوس هندسة مدنية',
     '+967-777-111222', 'ahmed.ali@email.ye', 'صنعاء', 'صنعاء', 'ENG-2010-001234',
     '2010-03-20', 'active', 'عضو دائم', 125000, '2026-01-15', 'مدفوع', 15),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', '01021234568', 'فاطمة أحمد حسن', 'female', '1990-08-22',
     'مهندسة معمارية', 'مكتب الهندسة الحديثة', 'ماجستير عمارة',
     '+967-733-222333', 'fatima.hassan@email.ye', 'صنعاء', 'حدة', 'ENG-2015-005678',
     '2015-07-10', 'active', 'عضو دائم', 85000, '2026-02-10', 'مدفوع', 10),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', '01031234569', 'خالد عبدالله سعيد', 'male', '1978-01-10',
     'مهندس كهرباء', 'المؤسسة العامة للكهرباء', 'بكالوريوس هندسة كهربائية',
     '+967-711-333444', 'khaled.saeed@email.ye', 'صنعاء', 'شملان', 'ENG-2005-000789',
     '2005-11-02', 'active', 'عضو دائم', 150000, '2026-01-30', 'مدفوع', 20),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', '01041234570', 'سمية علي حسين', 'female', '1995-03-05',
     'مهندسة صناعية', 'شركة اليمن للصناعة', 'بكالوريوس هندسة صناعية',
     '+967-770-555666', 'sumaya.hussein@email.ye', 'عدن', 'المنصورة', 'ENG-2020-009012',
     '2020-02-01', 'active', 'عضو مؤقت', 30000, '2026-02-20', 'متأخر', 5),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', '01051234571', 'عمر صالح ناصر', 'male', '1982-11-30',
     'مهندس ميكانيك', 'ورشة الصالح للميكانيكا', 'دبلوم فني',
     '+967-733-777888', 'omar.nasser@email.ye', 'تعز', 'المظفر', 'ENG-2012-003456',
     '2012-09-15', 'inactive', 'عضو دائم', 60000, '2025-11-10', 'مدفوع', 13)`,
    // ===== ACTIVITIES =====
    `INSERT INTO activities (
      entity_id, activity_number, activity_name, activity_type, status,
      start_date, end_date, location, description, responsible,
      planned_participants, actual_participants, budget, actual_cost, funding_source
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'ACT-2026-001', 'ورشة عمل حول إجراءات السلامة المهنية',
     'workshop', 'completed', '2026-05-15', '2026-05-16', 'صنعاء - مقر النقابة',
     'ورشة تدريبية حول إجراءات السلامة المهنية في مشاريع البناء', 'لجنة التدريب',
     80, 95, 50000, 48000, 'رسوم الاشتراك'),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'ACT-2026-002', 'اجتماع اللجنة الإدارية الدوري',
     'meeting', 'completed', '2026-05-20', '2026-05-20', 'مقر النقابة',
     'اجتماع دوري لمتابعة أعمال النقابة وخطط الربع القادم', 'الأمين العام',
     15, 14, 0, 0, null),
    ('c3d4e5f6-4708-4901-cdef-ef3456789012', 'ACT-2026-003', 'حملة توعية صحية للأعضاء',
     'awareness', 'planned', '2026-08-10', '2026-08-15', 'عدن - كريتر',
     'حملة توعية صحية للأعضاء وعائلاتهم في المحافظة', 'لجنة الصحة',
     300, 0, 30000, 0, 'دعم ذاتي')`,
    // ===== DOCUMENTS =====
    `INSERT INTO documents (
      entity_id, document_number, document_name, document_type, status,
      issue_date, submission_date, issuing_authority, file_name, file_size, description
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'DOC-2026-001', 'قرار ترخيص داخلي', 'قرار', 'approved',
     '2026-01-05', '2026-01-05', 'وزارة الشؤون الاجتماعية والعمل', 'license-decision.pdf', 2621440,
     'قرار ترخيص النقابة للعام 2026'),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'DOC-2026-002', 'تقرير الإدارة المالية', 'تقرير', 'under_review',
     '2026-03-30', '2026-03-30', 'لجنة التدقيق', 'financial-report-q1.pdf', 1887437,
     'التقرير المالي للربع الأول 2026'),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'DOC-2026-003', 'دفتر الأعضاء', 'سجل', 'approved',
     '2025-12-10', '2025-12-10', 'الأمانة العامة', 'members-register.xlsx', 5452595,
     'سجل أعضاء النقابة المحدث')`,
    // ===== SERVICE REQUESTS =====
    `INSERT INTO service_requests (
      entity_id, service_id, request_number, status, submission_date, expected_date, notes
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', (SELECT id FROM services WHERE service_code = 'SRV-001'),
     'REQ-2026-0001', 'processing', '2026-04-20', '2026-05-20', 'طلب تجديد ترخيص النقابة السنوي'),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', (SELECT id FROM services WHERE service_code = 'SRV-004'),
     'REQ-2026-0002', 'pending', '2026-04-22', '2026-04-25', 'استخراج شهادة قيد للكيان'),
    ('c3d4e5f6-4708-4901-cdef-ef3456789012', (SELECT id FROM services WHERE service_code = 'SRV-002'),
     'REQ-2026-0003', 'completed', '2026-04-25', '2026-05-09', 'طلبات متابعة تجديد الترخيص')`,
    // ===== VIOLATIONS =====
    `INSERT INTO violations (
      entity_id, violation_number, violation_type, severity, description, status, detected_date
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'VIO-2026-001', 'عدم تقديم التقارير الشهرية', 'minor',
     'لم يتم تقديم التقرير المالي الشهري لشهر مارس', 'open', '2026-04-05')`,
    // ===== ELECTIONS =====
    `INSERT INTO elections (
      entity_id, election_number, title, election_type, status,
      planned_date, eligible_voters, positions_count, venue, notes
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'ELECT-2026-001', 'انتخابات مجلس إدارة النقابة 2026',
     'general', 'planned', '2026-12-15', 15420, 11, 'المقر الرئيسي - صنعاء',
     'انتخابات الدورة الخامسة لمجلس الإدارة')`,
    // ===== BOARD MEMBERS =====
    `INSERT INTO board_members (
      entity_id, full_name, national_id, position, appointment_date, end_date, term, phone, email
    ) VALUES
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'م. عبدالله أحمد', '01060000001', 'رئيس', '2022-12-20', '2026-12-20', '2022-2026', '+967-777-123456', 'president@engineers.ye'),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'م. علي حسن محمد', '01060000002', 'نائب الرئيس', '2022-12-20', '2026-12-20', '2022-2026', '+967-777-234567', 'vp@engineers.ye'),
    ('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'م. نادية صالح', '01060000003', 'الأمين العام', '2022-12-20', '2026-12-20', '2022-2026', '+967-777-345678', 'sec@engineers.ye')`,
  ];
}

main().catch((err) => {
  console.error('[neon] fatal:', err.message);
  process.exit(1);
});