// نسخة احتياطية كاملة لقاعدة بيانات المنظومة — ملف JSON لكل جدول + بيان جرد
// التشغيل: node scripts/backup-db.mjs   (يُجدول أسبوعياً عبر Task Scheduler)
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!url) { console.error('DATABASE_URL غير موجود في .env'); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = path.join('backups', stamp);
fs.mkdirSync(dir, { recursive: true });

const EXCLUDE = new Set([]); // كل الجداول تُنسخ — سجل التدقيق أهمها
const { rows: tables } = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);

const manifest = [];
let totalRows = 0, totalBytes = 0;
await pool.query('SET statement_timeout = 300000');
for (const { table_name } of tables) {
  if (EXCLUDE.has(table_name)) continue;
  process.stdout.write(`  ← ${table_name} … `);
  try {
    const { rows } = await pool.query(`SELECT * FROM "${table_name}"`);
    const file = path.join(dir, `${table_name}.json`);
    fs.writeFileSync(file, JSON.stringify(rows, null, 1));
    const bytes = fs.statSync(file).size;
    totalRows += rows.length; totalBytes += bytes;
    manifest.push(`${table_name}\t${rows.length}\t${(bytes / 1024).toFixed(1)} KB`);
    console.log(`${rows.length} صف، ${(bytes / 1024).toFixed(0)} KB`);
  } catch (e) {
    console.log(`خطأ: ${String(e.message).slice(0, 80)}`);
    manifest.push(`${table_name}\tERROR\t${String(e.message).slice(0, 80)}`);
  }
}

fs.writeFileSync(path.join(dir, '_manifest.txt'),
  `نسخة احتياطية ${stamp}\nالجداول: ${tables.length} | الصفوف: ${totalRows} | الحجم: ${(totalBytes / 1024 / 1024).toFixed(2)} MB\n\n` +
  manifest.join('\n'), 'utf8');

console.log(`✓ backup → ${dir}`);
console.log(`  tables: ${tables.length}, rows: ${totalRows}, size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
const errors = manifest.filter(m => m.includes('ERROR'));
if (errors.length) { console.log('⚠ أخطاء:'); console.log(errors.join('\n')); }

await pool.end();
