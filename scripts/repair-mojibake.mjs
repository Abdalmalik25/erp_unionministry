// إصلاح الملفات المشوّهة الترميز (قرأها PowerShell بترميز خاطئ وأعاد كتابتها)
// الاستراتيجية: استعادة النسخة السليمة من git ثم تطبيق استبدال الاسم الرسمي بترميز UTF-8 صحيح
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const GOOD_COMMIT = '331d7176';
const FILES = [
  'src/app/pages/NationalPlatformHome.tsx',
  'src/app/components/guide/UserGuideModal.tsx',
  'server/routes/system.js',
];
const OLD_NAME = 'نظام قطاع العمل — المنظومة الإلكترونية الموحدة';
const NEW_NAME = 'المنظومة الوطنية لإدارة قطاع العمل';
const MARKERS = ['المنظومة', 'وزارة'];

for (const f of FILES) {
  const good = execSync(`git show ${GOOD_COMMIT}:${f}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  let restored = good.split(OLD_NAME).join(NEW_NAME);
  const hasArabic = MARKERS.every(m => restored.includes(m));
  const stillMojibake = /Ø[§™„-]|â€|Ù[ˆ„Œ]/.test(restored);
  if (!hasArabic || stillMojibake) {
    console.error(`✗ ${f} فشل التحقق بعد الاستعادة — لن يُكتب`);
    process.exit(1);
  }
  fs.writeFileSync(f, restored, 'utf8');
  console.log(`✓ ${f} — استُعيد وأُصلح (${restored.length} حرفاً)`);
}

// مسح شامل: أي ملف آخر فيه تشويه مشابه؟
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (!p.includes('node_modules')) yield* walk(p); }
    else if (/\.(tsx?|js|mjs|html|json|css)$/.test(e.name)) yield p;
  }
}
let dirty = [];
for (const root of ['src', 'server', 'public', 'scripts']) {
  for (const p of walk(root)) {
    const t = fs.readFileSync(p, 'utf8');
    if (/Ø[§™„©­­¯±²³´µ¶·¸¹º»¼½¾]|â€"|â€™|Ù„Ù|Ø£Ù/.test(t)) dirty.push(p);
  }
}
console.log(dirty.length ? `⚠ ملفات مشوّهة متبقية:\n${dirty.join('\n')}` : '✓ لا تشويه متبقٍ في أي ملف');
