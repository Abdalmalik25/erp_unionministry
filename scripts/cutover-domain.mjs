// قطع مؤسسي إلى الدومين الرسمي nlsmp.gov.ye
// آمن بالتصميم: يرفض العمل ما لم يستجب النطاق في DNS فعلياً — لا وعد غير حي
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';

const DOMAIN = 'nlsmp.gov.ye';
const OLD = 'https://erp-unionministry.vercel.app';
const NEW = `https://${DOMAIN}`;

console.log(`فحص ${DOMAIN} …`);
try {
  const r = await dns.resolve(DOMAIN);
  console.log('✓ يستجيب:', r.join(', '));
} catch {
  console.error(`✗ ${DOMAIN} لا يستجيب في DNS بعد.`);
  console.error('  1) سجّل النطاق لدى مزود .ye باسم الوزارة');
  console.error('  2) CNAME @ → cname.vercel-dns.com');
  console.error('  3) أضف الدومين في إعدادات مشروع Vercel ثم أعد هذا السكربت');
  process.exit(1);
}

const files = ['index.html', 'public/sitemap.xml', 'public/robots.txt'];
let changed = 0;
for (const f of files) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) continue;
  const c0 = fs.readFileSync(p, 'utf8');
  if (!c0.includes(OLD)) { console.log(`— ${f}: لا يحوي العنوان القديم`); continue; }
  fs.writeFileSync(p, c0.replaceAll(OLD, NEW), 'utf8');
  changed++;
  console.log(`✓ ${f}: حُدّث`);
}
if (!changed) { console.log('لا شيء لتحديثه'); process.exit(0); }

console.log(`
التالي:
  git add -A && git commit -m "chore(domain): القطع إلى ${DOMAIN}" && vercel deploy --prod --yes
ثم في Vercel Dashboard تأكد من إسناد ${DOMAIN} لهذا المشروع`);
