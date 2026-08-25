// تحقق حي: سلامة الترميز العربي في كل حزم الإنتاج + الاسم الموحد داخل بوابة الوزارة
const BASE = 'https://erp-unionministry.vercel.app';
const html = await (await fetch(BASE)).text();
const srcs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
let bundle = '';
for (const s of srcs) bundle += await (await fetch(`${BASE}${s}`)).text();
const dynamicImports = [...new Set([...bundle.matchAll(/"((?:\/[^"]*)?assets\/[A-Za-z0-9_-]+\.js)"/g)].map(m => m[1]))];
for (const d of dynamicImports) {
  try {
    const u = d.startsWith('/') ? `${BASE}${d}` : `${BASE}/${d}`;
    bundle += await (await fetch(u)).text();
  } catch {}
}

const checks = {
  'بوابة الوزارة بالاسم الموحد': bundle.includes('المنظومة الوطنية لإدارة قطاع العمل — وزارة الشؤون الاجتماعية والعمل'),
  'شعار المنصة الداخلي سليم': bundle.includes('منصة واحدة • نسيج واحد • حقيقة واحدة'),
  'لا تشويه ترميز في الحزم': !/Ø[§™„©]|â€"|â€™/.test(bundle),
  'صفر أسماء قديمة': !bundle.includes('للعمل النقابي') && !bundle.includes('نظام قطاع العمل —'),
  'لوحات المؤشرات باقية': bundle.includes('قطاع العمل في مؤشرات الدولة'),
};
let pass = true;
for (const [k, v] of Object.entries(checks)) { console.log(`${v ? '✓' : '✗'} ${k}`); if (!v) pass = false; }
process.exit(pass ? 0 : 1);
