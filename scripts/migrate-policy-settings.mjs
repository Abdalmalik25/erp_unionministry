/**
 * Migration #9 — عتبات السياسات الرسمية القابلة للتحكم
 * yemenization_min_ratio: الحد الأدنى القانوني لنسبة التوطين (المصدر: system_settings فئة policy)
 * idempotent — ON CONFLICT DO NOTHING يحفظ أي تعديل إداري لاحق
 */
import fs from 'fs';
import pg from 'pg';

const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const SETTINGS = [
  ['yemenization_min_ratio', '80', 'number', 'policy',
   'الحد الأدنى القانوني لنسبة التوطين (اليمننة) المطلوبة قبل منح تراخيص الوافدين الجدد'],
];

try {
  for (const [key, value, type, category, description] of SETTINGS) {
    const r = await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value, value_type, category, description, updated_by)
       VALUES ($1,$2,$3,$4,$5,'system-migration')
       ON CONFLICT (setting_key) DO NOTHING
       RETURNING setting_key`,
      [key, value, type, category, description]
    );
    console.log(r.rows.length ? `✓ أُدرج ${key} = ${value}` : `- ${key} موجود — لم يُمَس`);
  }
  // تحقق نهائي
  const { rows } = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE category='policy'");
  console.log('\nإعدادات السياسات:', JSON.stringify(rows));
} finally {
  await pool.end();
}
