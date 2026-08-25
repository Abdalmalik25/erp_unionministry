// فحص انحدار نهائي: كل المسارات العامة + الأصول الحرجة على الرابط الرسمي
const BASE = 'https://erp-unionministry.vercel.app';
const ROUTES = ['/', '/about', '/services', '/registries', '/legal', '/faq', '/contact', '/login'];
const ASSETS = [
  'favicon.ico', 'favicon-32x32.png', 'android-chrome-512x512.png',
  'manifest.json', 'robots.txt', 'sitemap.xml', 'logo_yemen.jpg',
];
let fail = 0;
for (const r of ROUTES) {
  const res = await fetch(`${BASE}${r}`);
  const ok = res.status === 200 && (await res.text()).includes('<div id="root">');
  if (!ok) { console.log(`✗ ${r} => ${res.status}`); fail++; }
}
console.log(`routes: ${ROUTES.length - fail}/${ROUTES.length} ✓`);
let aFail = 0;
for (const a of ASSETS) {
  const res = await fetch(`${BASE}/${a}`);
  if (res.status !== 200) { console.log(`✗ /${a} => ${res.status}`); aFail++; }
}
console.log(`assets: ${ASSETS.length - aFail}/${ASSETS.length} ✓`);
const branding = await (await fetch(`${BASE}/api/system/branding`)).json();
const b = branding.data ?? branding;
console.log(`identity: ${b.systemNameAr}`);
process.exit(fail + aFail === 0 ? 0 : 1);
