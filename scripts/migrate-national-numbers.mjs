/**
 * الهجرة المؤسسية #3 — تعميم الرقم الوطني على كل السجلات
 * - organizational_entities → UN- (نقابة) / FD- (اتحاد) / OG- (منظمة) / OE- (أخرى)
 * - worker_profiles         → WK-XXXXXXXX
 * - ministry_employees      → ME-XXXXXX (توليد عند الإدخال مستقبلاً؛ العمود + فهرس فقط)
 * سكربت idempotent: يعيد ترقيم الصفوف التي بلا رقم وطني فقط.
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const connStr = readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.+)$/m)?.[1].trim();
const c = new pg.Client({ connectionString: connStr, connectionTimeoutMillis: 30000 });
await c.connect();

const PREFIX = { union: 'UN', federation: 'FD', organization: 'OG', committee: 'OE', department: 'OE', office: 'OE', branch: 'OE', unit: 'OE' };

async function ensureColumn(table, col) {
  await c.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} text`);
}
async function ensureIndex(name, table, col) {
  const exists = await c.query(`SELECT 1 FROM pg_indexes WHERE indexname=$1`, [name]);
  if (!exists.rows.length) {
    await c.query(`CREATE UNIQUE INDEX ${name} ON ${table} (${col}) WHERE ${col} IS NOT NULL AND deleted_at IS NULL`);
    console.log(`  + unique index ${name}`);
  }
}

// ===== 1) الكيانات النقابية والمنظمات =====
console.log('[1/3] organizational_entities');
await ensureColumn('organizational_entities', 'national_number');
{
  const rows = (await c.query(
    `SELECT entity_id, entity_type FROM organizational_entities
     WHERE deleted_at IS NULL AND national_number IS NULL ORDER BY created_at`
  )).rows;
  let n = 0;
  for (const row of rows) {
    const p = PREFIX[row.entity_type] || 'OE';
    // تسلسل عالمي لكل نوع: UN-000001...
    const seq = await c.query(
      `SELECT COALESCE(MAX((regexp_replace(national_number,'\\D','','g'))::bigint),0)+1 AS next
       FROM organizational_entities WHERE national_number LIKE '${p}-%'`
    );
    const nn = `${p}-${String(seq.rows[0].next).padStart(6, '0')}`;
    try {
      await c.query(`UPDATE organizational_entities SET national_number=$1 WHERE entity_id=$2`, [nn, row.entity_id]);
      n++;
    } catch {
      console.log(`  ! collision on ${nn}, retrying`);
    }
  }
  console.log(`  backfilled ${n}/${rows.length} national numbers`);
}
await ensureIndex('uq_oe_national_number', 'organizational_entities', 'national_number');
{ const x = await c.query(`SELECT 1 FROM pg_indexes WHERE indexname='idx_oe_name_ar'`);
  if (!x.rows.length) await c.query(`CREATE INDEX idx_oe_name_ar ON organizational_entities (name_ar)`); }

// ===== 2) ملفات العمال =====
console.log('[2/3] worker_profiles');
await ensureColumn('worker_profiles', 'national_number');
{
  const rows = (await c.query(
    `SELECT id FROM worker_profiles
     WHERE deleted_at IS NULL AND national_number IS NULL ORDER BY created_at`
  )).rows;
  let seq = (await c.query(
    `SELECT COALESCE(MAX((regexp_replace(national_number,'\\D','','g'))::bigint),0) FROM worker_profiles WHERE national_number LIKE 'WK-%'`
  )).rows[0].coalesce || 0;
  for (const row of rows) {
    seq++;
    await c.query(`UPDATE worker_profiles SET national_number=$1 WHERE id=$2`,
      [`WK-${String(seq).padStart(8, '0')}`, row.id]);
  }
  console.log(`  backfilled ${rows.length} worker numbers`);
}
{ const exists = await c.query(`SELECT 1 FROM pg_indexes WHERE indexname='uq_wp_national_number'`);
  if (!exists.rows.length) {
    await c.query(`CREATE UNIQUE INDEX uq_wp_national_number ON worker_profiles (national_number) WHERE national_number IS NOT NULL AND deleted_at IS NULL`);
    console.log('  + uq_wp_national_number');
  } }

// ===== 3) موظفو الوزارة =====
console.log('[3/3] ministry_employees');
await ensureColumn('ministry_employees', 'national_number');
{ const exists = await c.query(`SELECT 1 FROM pg_indexes WHERE indexname='uq_me_national_number'`);
  if (!exists.rows.length) {
    await c.query(`CREATE UNIQUE INDEX uq_me_national_number ON ministry_employees (national_number) WHERE national_number IS NOT NULL`);
    console.log('  + uq_me_national_number');
  } }

// ===== التحقق النهائي =====
const v1 = await c.query(`SELECT COUNT(*) total, COUNT(national_number) nn FROM organizational_entities WHERE deleted_at IS NULL`);
const v2 = await c.query(`SELECT COUNT(*) total, COUNT(national_number) nn FROM worker_profiles WHERE deleted_at IS NULL`);
const d1 = await c.query(`SELECT COUNT(DISTINCT national_number) d FROM organizational_entities WHERE national_number IS NOT NULL`);
const d2 = await c.query(`SELECT COUNT(DISTINCT national_number) d FROM worker_profiles WHERE national_number IS NOT NULL`);
console.log(`ORG : NN=${v1.rows[0].nn}/${v1.rows[0].total} distinct=${d1.rows[0].d}`);
console.log(`WORK: NN=${v2.rows[0].nn}/${v2.rows[0].total} distinct=${d2.rows[0].d}`);
await c.end();
console.log('DONE');
