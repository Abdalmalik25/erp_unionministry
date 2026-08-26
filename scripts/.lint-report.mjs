// تحليل مؤقت لتوزيع تحذيرات lint حسب القاعدة والملف (يُحذف بعد اتخاذ القرار)
import { readFileSync } from 'node:fs';
const lines = readFileSync('lint-full.txt', 'utf8').split(/\r?\n/);
let cur = '';
const wanted = process.argv[2] || '';
for (const l of lines) {
  if (/^[A-Z]:\\.*\.(ts|tsx)$/.test(l.trim())) cur = l.trim().split('\\').pop();
  if (wanted && l.includes(wanted)) {
    const m = l.match(/^\s*(\d+):(\d+)\s+warning\s+(.*)$/);
    if (m) console.log(cur + ':' + m[1] + ' ' + m[3]);
  }
}
