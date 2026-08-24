/**
 * الهجرة المؤسسية #5 — سلامة البيانات + فهارس الأداء
 * 1) فحص الارتباطات اليتيمة (orphan FKs) وإصلاح ما يصلح
 * 2) فهارس على مفاتيح أجنبية وأعمدة بحث ساخنة
 * idempotent.
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const connStr = readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.+)$/m)?.[1].trim();
const c = new pg.Client({ connectionString: connStr, connectionTimeoutMillis: 30000 });
await c.connect();

// ===== 1) سلامة البيانات: فحص الارتباطات =====
console.log('[INTEGRITY] orphan checks');
const CHECKS = [
  ['members → organizational_entities', `SELECT COUNT(*)::int n FROM members m LEFT JOIN organizational_entities e ON e.entity_id = m.entity_id WHERE m.deleted_at IS NULL AND m.entity_id IS NOT NULL AND e.entity_id IS NULL`],
  ['worker_profiles → members', `SELECT COUNT(*)::int n FROM worker_profiles wp LEFT JOIN members m ON m.id = wp.member_id WHERE wp.deleted_at IS NULL AND m.id IS NULL`],
  ['commercial_branches → establishments', `SELECT COUNT(*)::int n FROM commercial_branches b LEFT JOIN commercial_establishments e ON e.establishment_id::text = b.enterprise_id::text WHERE e.establishment_id IS NULL`],
  ['sector_users.organization_id → organizational_entities', `SELECT COUNT(*)::int n FROM sector_users u LEFT JOIN organizational_entities e ON e.entity_id::text = u.organization_id::text WHERE u.deleted_at IS NULL AND u.organization_id IS NOT NULL AND e.entity_id IS NULL`],
];
const orphans = {};
for (const [label, q] of CHECKS) {
  try {
    const r = await c.query(q);
    orphans[label] = r.rows[0].n;
    console.log(`  ${label}: ${r.rows[0].n}`);
  } catch (e) {
    orphans[label] = 'ERR:' + e.code;
    console.log(`  ${label}: check skipped (${e.code})`);
  }
}
// إصلاح آمن: قطع الارتباطات اليتيمة فقط (لا حذف بيانات)
if (orphans['worker_profiles → members'] > 0 || orphans['worker_profiles → members'] === 'ERR:2353') {
  // member مفقود → نلغي الارتباط بدل الحذف (الملف يبقى)
}
try {
  const fix1 = await c.query(`UPDATE worker_profiles wp SET member_id = NULL
    FROM (SELECT wp2.id FROM worker_profiles wp2 LEFT JOIN members m ON m.id = wp2.member_id
          WHERE wp2.deleted_at IS NULL AND wp2.member_id IS NOT NULL AND m.id IS NULL) o
    WHERE wp.id = o.id`);
  if (fix1.rowCount) console.log(`  FIXED: detached ${fix1.rowCount} worker_profiles from missing members`);
} catch {}
try {
  const fix2 = await c.query(`UPDATE sector_users u SET organization_id = NULL
    FROM (SELECT u2.id FROM sector_users u2 LEFT JOIN organizational_entities e ON e.entity_id::text = u2.organization_id::text
          WHERE u2.deleted_at IS NULL AND u2.organization_id IS NOT NULL AND e.entity_id IS NULL) o
    WHERE u.id = o.id`);
  if (fix2.rowCount) console.log(`  FIXED: cleared ${fix2.rowCount} invalid user organization links`);
} catch {}

// ===== 2) فهارس الأداء على المسارات الساخنة =====
console.log('[PERFORMANCE] hot-path indexes');
const INDEXES = [
  ['idx_members_entity',        'members', '(entity_id)',                        'WHERE deleted_at IS NULL'],
  ['idx_members_national_id',   'members', '(national_id)',                      'WHERE deleted_at IS NULL'],
  ['idx_members_status',        'members', '(status)',                           'WHERE deleted_at IS NULL'],
  ['idx_wp_member',             'worker_profiles', '(member_id)',                'WHERE deleted_at IS NULL'],
  ['idx_wp_enterprise',         'worker_profiles', '(current_enterprise_id)',    'WHERE deleted_at IS NULL'],
  ['idx_oe_governorate',        'organizational_entities', '(governorate)',      'WHERE deleted_at IS NULL'],
  ['idx_oe_type_status',        'organizational_entities', '(entity_type, status)', 'WHERE deleted_at IS NULL'],
  ['idx_ce_gov_status',         'commercial_establishments', '(governorate, status)', 'WHERE deleted_at IS NULL'],
  ['idx_ar_reviewed_by',        'account_requests', '(reviewed_by)',              null],
  ['idx_audit_actor_time',      'audit_log', '(actor_id, created_at DESC)',       null],
];
for (const [name, tbl, cols, cond] of INDEXES) {
  try {
    const ex = await c.query(`SELECT 1 FROM pg_indexes WHERE indexname=$1`, [name]);
    if (!ex.rows.length) {
      await c.query(`CREATE INDEX ${name} ON ${tbl} ${cols} ${cond || ''}`);
      console.log(`  + ${name}`);
    }
  } catch (e) {
    console.log(`  ! skip ${name}: ${e.code}`);
  }
}

// ===== 3) دقة بيانات جدول المحافظات (تصحيحات موضعية آمنة) =====
console.log('[DATA ACCURACY] governorates fixes');
const FIXES = [
  // [code, الاسم الصحيح]
  ['HUD', 'الحديدة'],   // كانت "الhudaydah" (خلط عربي/لاتيني)
  ['RIY', 'ريمة'],      // كانت مكررة "الضالع"
  ['SOC', 'سقطرى'],     // كانت " Socotra" بحرف لاتيني وبمسافة
  ['TIB', 'عمران'],     // كانت "تيبعت" (خطأ إملائي غير معروف)
];
for (const [code, name] of FIXES) {
  const r = await c.query(`UPDATE governorates SET name_ar=$1 WHERE code=$2 AND name_ar <> $1`, [name, code]);
  if (r.rowCount) console.log(`  FIXED ${code} -> ${name}`);
}
// إدراج أمانة العاصمة إن غابت (كل السجل التجاري مصنف تحتها)
{
  const ex = await c.query(`SELECT 1 FROM governorates WHERE name_ar='أمانة العاصمة'`);
  if (!ex.rows.length) {
    await c.query(`INSERT INTO governorates (code, name_ar, name_en, region, is_active)
                   VALUES ('AMN', 'أمانة العاصمة', 'Amanat Al Asimah', 'الوسطى', true)`);
    console.log('  INSERTED AMN أمانة العاصمة');
  }
}

await c.end();
console.log('DONE');
