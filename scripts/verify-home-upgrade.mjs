// تحقق حي: لوحات المؤشرات + شريط الإعلان + دوام السبت-الأربعاء داخل حزم SPA
const BASE = 'https://erp-unionministry.vercel.app';
const html = await (await fetch(BASE)).text();
const srcs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
console.log('JS bundles found:', srcs.length);

let bundle = '';
for (const s of srcs) {
  const js = await (await fetch(`${BASE}${s}`)).text();
  bundle += js;
}
// أيقونات الصفحات العامة محمّلة كسلاسل ديناميكية أيضاً
const dynamicImports = [...bundle.matchAll(/"((?:\/[^"]*)?assets\/[A-Za-z0-9_-]+\.js)"/g)].map(m => m[1]);
for (const d of dynamicImports.slice(0, 40)) {
  try {
    const u = d.startsWith('/') ? `${BASE}${d}` : `${BASE}/${d}`;
    bundle += await (await fetch(u)).text();
  } catch {}
}

const checks = {
  'قسم المؤشرات الوطنية': bundle.includes('قطاع العمل في مؤشرات الدولة'),
  'لوحة القانون 40/2025': bundle.includes('40/2025') && bundle.includes('المرجعية التشريعية الحاكمة'),
  'لوحة السيادة على البيانات': bundle.includes('سيادة الدولة على بيانات قطاع العمل'),
  'لوحة الحوكمة 5152': bundle.includes('منشأة تحت الحوكمة'),
  'شريط الإعلان المؤسسي': bundle.includes('مرجعيةٌ واحدة للبيانات'),
  'دوام السبت–الأربعاء': bundle.includes('السبت – الأربعاء، 8:00 ص – 2:00 م'),
  'زوال الدوام القديم': !bundle.includes('الأحد – الخميس'),
};
let pass = true;
for (const [k, v] of Object.entries(checks)) { console.log(`${v ? '✓' : '✗'} ${k}`); if (!v) pass = false; }
process.exit(pass ? 0 : 1);
