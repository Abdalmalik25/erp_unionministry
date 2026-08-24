/**
 * migrate-establishment-registry.mjs
 * ترحيل رسمي مؤسسي لسجل المنشآت:
 * 1) عمود الرقم الوطني للمنشأة national_number بصيغة NE-XXXXXX
 * 2) فهرس فريد جزئي (غير فارغ + غير محذوف)
 * 3) تعبئة رجعية للسجلات القائمة بأرقام وطنية تسلسلية مستقرة
 * 4) عمود national_number لجدول الفروع (صيغة: رقم الأم - B01)
 * 5) فهارس بحث (اسم عربي/إنجليزي، سجل تجاري، رمز موحد)
 * آمن للتكرار (idempotent)
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const connStr = readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.+)$/m)?.[1].trim();
const c = new pg.Client({ connectionString: connStr, connectionTimeoutMillis: 20000 });

try {
  await c.connect();
  console.log('Connected.');

  // 1) عمود الرقم الوطني للمنشآت
  await c.query(`ALTER TABLE commercial_establishments ADD COLUMN IF NOT EXISTS national_number text`);
  console.log('✓ column commercial_establishments.national_number');

  // 2) فهرس فريد جزئي
  await c.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ce_national_number
    ON commercial_establishments (national_number)
    WHERE national_number IS NOT NULL AND deleted_at IS NULL`);
  console.log('✓ unique index uq_ce_national_number');

  // 3) تعبئة رجعية مستقرة حسب ترتيب الإنشاء
  const backfill = await c.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
      FROM commercial_establishments
      WHERE national_number IS NULL AND deleted_at IS NULL
    )
    UPDATE commercial_establishments ce
    SET national_number = 'NE-' || LPAD(ranked.rn::text, 6, '0')
    FROM ranked
    WHERE ce.id = ranked.id
    RETURNING ce.national_number`);
  console.log(`✓ backfilled ${backfill.rowCount} national numbers`);

  // 3-ب) استثناء المحذوفة: املأها أيضاً لتجنب NULL متكرر مستقبلاً
  await c.query(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) + 100000 AS rn
      FROM commercial_establishments
      WHERE national_number IS NULL AND deleted_at IS NOT NULL
    )
    UPDATE commercial_establishments ce
    SET national_number = 'NE-D' || LPAD(ranked.rn::text, 6, '0')
    FROM ranked
    WHERE ce.id = ranked.id`);

  // 4) عمود الرقم الوطني للفروع
  await c.query(`ALTER TABLE commercial_branches ADD COLUMN IF NOT EXISTS national_number text`);
  await c.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_cb_national_number
    ON commercial_branches (national_number)
    WHERE national_number IS NOT NULL`);
  console.log('✓ column commercial_branches.national_number + unique index');

  // 5) فهارس بحث سريعة
  await c.query(`CREATE INDEX IF NOT EXISTS idx_ce_name_ar ON commercial_establishments (name_ar)`);
  await c.query(`CREATE INDEX IF NOT EXISTS idx_ce_cr_number ON commercial_establishments (commercial_register_number)`);
  await c.query(`CREATE INDEX IF NOT EXISTS idx_ce_unified ON commercial_establishments (unified_code)`);
  await c.query(`CREATE INDEX IF NOT EXISTS idx_cb_enterprise ON commercial_branches (enterprise_id)`);
  console.log('✓ search indexes');

  // تحقق نهائي
  const v = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE national_number LIKE 'NE-%') AS ne_count,
      COUNT(*) AS total,
      COUNT(DISTINCT national_number) AS distinct_nn
    FROM commercial_establishments WHERE deleted_at IS NULL`);
  const r = v.rows[0];
  console.log(`RESULT: NE=${r.ne_count}/${r.total} | distinct=${r.distinct_nn} | duplicates=${r.total - r.distinct_nn}`);

  await c.end();
  console.log('MIGRATION COMPLETE ✓');
} catch (e) {
  console.error('MIGRATION FAIL:', e.message);
  process.exit(1);
}
