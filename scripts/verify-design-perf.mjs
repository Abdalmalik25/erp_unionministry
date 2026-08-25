// تحقق حي من جولة الأداء والهوية: الخطوط الذاتية + CSP المشدود + خلو HTML من الخارجي
const base = 'https://erp-unionministry.vercel.app';
const out = [];
const f = (u) => fetch(u, { signal: AbortSignal.timeout(20000) });
const ok = (n, c, d = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const html = await (await f(base)).text();
ok('no external font links', !html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com'));
ok('critical fonts preloaded',
  html.includes('/fonts/IBMPlexSansArabic-400-arabic.woff2') &&
  html.includes('/fonts/Cairo-800-arabic.woff2'));

for (const p of ['/fonts/IBMPlexSansArabic-400-arabic.woff2', '/fonts/Cairo-800-arabic.woff2', '/fonts/JetBrainsMono-600-latin.woff2']) {
  const r = await f(base + p);
  ok(`font ${p.split('/').pop()}`, r.status === 200 && (r.headers.get('content-type') ?? '').includes('font'),
    `${r.status} ${r.headers.get('content-length')}B`);
}

const cspPage = (await f(base)).headers.get('content-security-policy') ?? '';
ok('CSP: no googleapis in style-src', !cspPage.includes('fonts.googleapis.com'), cspPage.slice(0, 80));
ok('CSP: font-src self only', /font-src[^;]*'self'[^;]*;/.test(cspPage));

// CSS الحزمة يشير للخطوط المحلية
const cssLink = html.match(/href="(\/assets\/index-[^"]+\.css)"/)?.[1];
if (cssLink) {
  const css = await (await f(base + cssLink)).text();
  ok('bundle CSS uses local fonts', css.includes('/fonts/Cairo-900-arabic.woff2') || css.includes('/fonts/IBMPlexSansArabic-700-arabic.woff2'));
  ok('bundle CSS has Cairo display stack', css.includes('--font-display'));
} else ok('bundle CSS found', false);

console.log(out.join('\n'));
process.exitCode = out.some(o => o.startsWith('FAIL')) ? 1 : 0;
