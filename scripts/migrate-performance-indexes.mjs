/**
 * Migration #8 — فهارس الأداء المؤسسية (idempotent)
 * يسد فجوات الفهرسة في الجداول الساخنة: inspections, worker_dispatches, labor_disputes
 * كلها IF NOT EXISTS — آمنة لإعادة التشغيل
 */
import fs from 'fs';
import pg from 'pg';

const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const INDEXES = [
  // inspections — التفتيش الميداني (المخطط: enterprise_id + compliance_status + inspection_date)
  `CREATE INDEX IF NOT EXISTS idx_inspections_deleted ON inspections(deleted_at) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_inspections_compliance ON inspections(compliance_status)`,
  `CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_inspections_enterprise ON inspections(enterprise_id)`,
  // worker_dispatches — إيفاد العمالة (sending/receiving_enterprise_id)
  `CREATE INDEX IF NOT EXISTS idx_wd_deleted ON worker_dispatches(deleted_at) WHERE deleted_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_wd_status ON worker_dispatches(status)`,
  `CREATE INDEX IF NOT EXISTS idx_wd_sending ON worker_dispatches(sending_enterprise_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wd_receiving ON worker_dispatches(receiving_enterprise_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wd_created ON worker_dispatches(created_at DESC)`,
  // labor_disputes — النزاعات العمالية (enterprise_id)
  `CREATE INDEX IF NOT EXISTS idx_ld_status ON labor_disputes(status)`,
  `CREATE INDEX IF NOT EXISTS idx_ld_enterprise ON labor_disputes(enterprise_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ld_created ON labor_disputes(created_at DESC)`,
];

try {
  let created = 0, skipped = 0;
  for (const sql of INDEXES) {
    const name = sql.match(/idx_\w+/)[0];
    try {
      await pool.query(sql);
      console.log(`✓ ${name}`);
      created++;
    } catch (e) {
      if (e.code === '42P07') { console.log(`- ${name} (موجود)`); skipped++; }
      else throw e;
    }
  }
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM pg_indexes WHERE schemaname='public'");
  console.log(`\nتم: ${created} أُنشئ، ${skipped} موجود مسبقاً | إجمالي الفهارس: ${rows[0].n}`);
} finally {
  await pool.end();
}
