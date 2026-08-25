// تحقق حي: نقطة الصحة + HSTS على الصفحات + أرضية مؤشر المهن في الحزمة
const base = 'https://erp-unionministry.vercel.app';
const out = [];
const ok = (name, cond, detail = '') => out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);

let h;
try {
  h = await (await fetch(base + '/api/health')).json();
  ok('health endpoint', h?.status === 'healthy' && h?.database?.status === 'connected',
    `db=${h?.database?.latency_ms}ms service=${(h?.service ?? '').slice(0, 40)}`);
} catch (e) { ok('health endpoint', false, String(e).slice(0, 60)); }

try {
  const r = await fetch(base);
  const sts = r.headers.get('strict-transport-security');
  ok('HSTS on homepage', !!sts && sts.includes('max-age=63072000'), sts ?? 'MISSING');
  const html = await r.text();
  const srcs = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
  let bundle = '';
  for (const s of srcs) bundle += await (await fetch(base + s)).text();
  const dyn = [...new Set([...bundle.matchAll(/"((?:\/[^"]*)?assets\/[A-Za-z0-9_-]+\.js)"/g)].map(m => m[1]))];
  for (const d of dyn) {
    try {
      const u = d.startsWith('/') ? base + d : `${base}/${d}`;
      bundle += await (await fetch(u)).text();
    } catch {}
  }
  ok('professions floor 3,607+', bundle.includes('3,607+'));
  ok('unified guarantees live', bundle.includes('استمرارية ميدانية كاملة حتى دون اتصال'));
  ok('arabic identity in health payload', (h?.service ?? '').includes('المنظومة الوطنية'));
} catch (e) { ok('bundle scan', false, String(e).slice(0, 60)); }

console.log(out.join('\n'));
process.exitCode = out.some(o => o.startsWith('FAIL')) ? 1 : 0;
