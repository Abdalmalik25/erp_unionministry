// تحقق حي نهائي من حزمة التدقيق الخبير
const BASE = 'https://erp-unionministry.vercel.app';
const html = await (await fetch(BASE)).text();
const srcs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
let bundle = '';
for (const s of srcs) bundle += await (await fetch(`${BASE}${s}`)).text();
const dyn = [...new Set([...bundle.matchAll(/"((?:\/[^"]*)?assets\/[A-Za-z0-9_-]+\.js)"/g)].map(m => m[1]))];
for (const d of dyn) {
  try {
    const u = d.startsWith('/') ? `${BASE}${d}` : `${BASE}/${d}`;
    bundle += await (await fetch(u)).text();
  } catch {}
}

const checks = {
  'خدمة حوادث وإصابات العمل': bundle.includes('توثيق حوادث وإصابات العمل'),
  'خدمة العمالة الوافدة': bundle.includes('تراخيص تشغيل العمالة الوافدة'),
  'وعد المستندات المعلنة': bundle.includes('مستندات معلنة قبل التقديم'),
  'بيان الرسوم الحكومية': bundle.includes('لا تُحصَّل بأي صورة خارج القنوات الرسمية'),
  'مرساة اتفاقيات العمل الدولية': bundle.includes('اتفاقيات منظمة العمل الدولية'),
  'دوام التذييل في كل صفحة': bundle.includes('السبت – الأربعاء: 8:00 ص – 2:00 م'),
  'زوال انحراف المصطلح (المنصة)': !/تصدره المنصة|الخروج من المنصة|حول المنصة|على المنصة\./.test(bundle),
};
let pass = true;
for (const [k, v] of Object.entries(checks)) { console.log(`${v ? '✓' : '✗'} ${k}`); if (!v) pass = false; }
process.exit(pass ? 0 : 1);
