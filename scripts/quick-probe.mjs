// quick-probe.mjs — فحص فردي عبر سطر أوامر: node scripts/quick-probe.mjs <path> [method] [body]
const BASE = 'https://erp-unionministry.vercel.app';
const [, , pathArg = '/', method = 'GET', bodyArg] = process.argv;
try {
  const res = await fetch(BASE + pathArg, {
    method,
    headers: bodyArg ? { 'Content-Type': 'application/json' } : undefined,
    body: bodyArg || undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  console.log('status:', res.status);
  if (pathArg === '/') {
    const m = text.match(/assets\/index-[^"]+\.css/);
    console.log('css:', m ? m[0] : '?');
    console.log('csp:', res.headers.get('content-security-policy') ? 'present' : 'MISSING');
    console.log('x-frame-options:', res.headers.get('x-frame-options'));
  } else {
    console.log(text.slice(0, 250));
  }
} catch (e) {
  console.log('ERR:', e.cause?.message || e.message);
}
