// تحقق حي من ترويسات الحماية والكاش الجديدة
const base = 'https://erp-unionministry.vercel.app';
const out = [];
const ok = (n, c, d = '') => out.push(`${c ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const h = (await fetch(base, { signal: AbortSignal.timeout(20000) })).headers;
const pp = h.get('permissions-policy') ?? '';
ok('Permissions-Policy', pp.includes('camera=()') && pp.includes('microphone=()'), pp.slice(0, 60));
ok('COOP same-origin', h.get('cross-origin-opener-policy') === 'same-origin');
ok('CORP same-origin', h.get('cross-origin-resource-policy') === 'same-origin');

const fh = (await fetch(base + '/fonts/Cairo-800-arabic.woff2', { signal: AbortSignal.timeout(20000) })).headers;
ok('fonts immutable cache', (fh.get('cache-control') ?? '').includes('immutable'), fh.get('cache-control'));

const lh = (await fetch(base + '/logo_yemen.jpg', { signal: AbortSignal.timeout(20000) })).headers;
ok('logo stale-while-revalidate', (lh.get('cache-control') ?? '').includes('stale-while-revalidate'), lh.get('cache-control'));

console.log(out.join('\n'));
process.exitCode = out.some(o => o.startsWith('FAIL')) ? 1 : 0;
