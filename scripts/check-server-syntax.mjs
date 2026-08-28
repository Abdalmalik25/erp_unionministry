// check-server-syntax.mjs — بوابة صياغة الخادم: كل ملف server/** يجب أن يُحلَّل بنجاح
// تُمنع أعطال الإقلاع في الإنتاج (FUNCTION_INVOCATION_FAILED) بسبب خطأ صياغة لم تلتقطه
// بوابات الواجهة (tsc/vite لا يمرّان على server/)
import { execFileSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd(), 'server');
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|mjs|cjs)$/.test(f) && !/\.test\./.test(f)) files.push(p);
  }
})(ROOT);

let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    failed++;
    console.error('SYNTAX ERROR:', f);
    console.error(String(e.stderr || e.message).split('\n').slice(0, 6).join('\n'));
  }
}
if (failed) {
  console.error(`\n${failed} ملف(ات) بصياغة غير سليمة — يُمنع النشر`);
  process.exit(1);
}
console.log(`SERVER SYNTAX OK — ${files.length} ملفاً فحصت`);
