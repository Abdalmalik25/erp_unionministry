// تنظيف صفوف الاختبار التي أنشأتها أثناء تطوير السلسلة (قبل الإطلاق الرسمي)
import pg from 'pg';
import fs from 'fs';

const url = fs.readFileSync('.env', 'utf8').match(/NEON_DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
try {
  const before = await pool.query(`SELECT COUNT(*) c FROM audit_log`);
  await pool.query(`TRUNCATE TABLE audit_log`);
  const after = await pool.query(`SELECT COUNT(*) c FROM audit_log`);
  console.log(`audit_log: ${before.rows[0].c} -> ${after.rows[0].c} (بداية نظيفة قبل الإطلاق)`);
} catch (e) {
  console.log('TRUNCATE blocked:', e.message);
}
await pool.end();
