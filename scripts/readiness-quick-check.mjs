// بوابة استعداد بسيطة (سريعة) لإثبات الحالة — تمهيدي للنسخة الكاملة في production-readiness.mjs
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const envPath = path.resolve('.env');
let pass = 0, fail = 0;
const ok = (m) => { console.log(`  \x1b[32m✓\x1b[0m ${m}`); pass++; };
const bad = (m) => { console.log(`  \x1b[31m✗\x1b[0m ${m}`); fail++; };

console.log('\x1b[1mبوابات جاهزية سريعة (P0 security/env)\x1b[0m');

if (!fs.existsSync(envPath)) bad('.env غير موجود');
else ok('.env موجود');

const c = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const m = c.match(/^JWT_SECRET\s*=\s*(.+)$/m);
if (m && m[1].trim().length >= 32) ok(`JWT_SECRET طويل كافٍ (${m[1].trim().length} حرفاً)`);
else bad('JWT_SECRET قصير أو غير معرف');

if (/(JWT_SECRET|BACKUP_KEY)\s*=\s*(''|example|changeme|password)/i.test(c)) bad('قيمة placeholder لسر');
else ok('بدون قيم placeholder للسر');

try {
  const t = execSync('git ls-files server/err.log server/out.log tsc_*.txt dist 2>/dev/null || git ls-files server/err.log server/out.log', { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
  if (t) bad('ملفات ميتة/مؤقتة متبعة في git: ' + t);
  else ok('ملفات سجلات/وقتية غير متبعة في git');
} catch {
  ok('ملفات سجلات/وقتية غير متبعة في git');
}

console.log(`\nملخّص البوابات السريعة: ${pass} نجح / ${fail} فشل\n`);
process.exit(fail ? 1 : 0);
