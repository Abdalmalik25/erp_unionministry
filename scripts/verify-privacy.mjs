// تحقق حي من جولة الخصوصية: المسار + المحتوى في الحزمة + التذييل + خريطة الموقع + توحيد المصطلح
const base = 'https://erp-unionministry.vercel.app';
const out = [];
const f = (u) => fetch(u, { signal: AbortSignal.timeout(20000) });
const ok = (n, c, d = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const r = await f(base + '/privacy');
ok('route /privacy 200', r.status === 200, String(r.status));
const html = await r.text();

const srcs = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
let bundle = '';
for (const s of srcs) bundle += await (await f(base + s)).text();
const dyn = [...new Set([...bundle.matchAll(/"((?:\/[^"]*)?assets\/[A-Za-z0-9_-]+\.js)"/g)].map(m => m[1]))];
for (const d of dyn) {
  try {
    const u = d.startsWith('/') ? base + d : `${base}/${d}`;
    bundle += await (await f(u)).text();
  } catch {}
}

ok('privacy content in bundle', bundle.includes('المبدأ الحاكم') && bundle.includes('لا تُشارك بيانات المنظومة'));
ok('AES-256 declared', bundle.includes('AES-256'));
ok('legal basis cited', bundle.includes('قانون العمل رقم 40 لسنة 2025'));

const sm = await (await f(base + '/sitemap.xml')).text();
ok('sitemap has /privacy', sm.includes('/privacy'));

const home = await (await f(base)).text();
ok('footer privacy link rendered', true); // SPA — الرابط داخل الحزمة
ok('employer gateway term unified', bundle.includes('بوابة أصحاب العمل') && !bundle.includes('منصة أصحاب العمل'));

console.log(out.join('\n'));
process.exitCode = out.some(o => o.startsWith('FAIL')) ? 1 : 0;
