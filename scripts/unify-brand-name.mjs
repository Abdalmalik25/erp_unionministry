// توحيد الاسم الرسمي للمنظومة في كل أجزاء النظام
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const NEW_FULL = 'المنظومة الوطنية لإدارة قطاع العمل';
const NEW_SHORT = 'المنظومة الوطنية';

const REPLACEMENTS = [
  ['نظام قطاع العمل — المنظومة الإلكترونية الموحدة', NEW_FULL],
  ['المنظومة الوطنية لإدارة قطاع العمل للعمل النقابي', NEW_FULL],
  ['المنظومة الوطنية للعمل النقابي', NEW_FULL],
  ['المنصة الوطنية الموحدة', NEW_SHORT],
  ['المنصة الوطنية', NEW_SHORT],
];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(tsx?|html|json)$/.test(e.name)) yield p;
  }
}

const roots = ['src', 'index.html', 'public/manifest.json'];
let touched = 0;
for (const root of roots) {
  const targets = fs.statSync(root).isFile() ? [root] : [...walk(root)];
  for (const file of targets) {
    let srcTxt = fs.readFileSync(file, 'utf8');
    let count = 0;
    for (const [from, to] of REPLACEMENTS) {
      while (srcTxt.includes(from)) { srcTxt = srcTxt.split(from).join(to); count++; }
    }
    if (count) { fs.writeFileSync(file, srcTxt); console.log(`${file}: ${count}`); touched += count; }
  }
}
console.log(`TOTAL frontend replacements: ${touched}`);

// قاعدة البيانات — المصدر الرسمي لاسم النظام
const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
await pool.query(
  `INSERT INTO system_settings (setting_key, setting_value) VALUES ('system_name_ar', $1)
   ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
  [NEW_FULL]
);
const { rows } = await pool.query(`SELECT setting_key, setting_value FROM system_settings WHERE setting_key = 'system_name_ar'`);
console.log('DB:', rows[0]);
await pool.end();
