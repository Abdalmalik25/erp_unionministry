import fs from 'fs';

const base = 'https://erp-unionministry.vercel.app';

// 1. ترويسات الصفحة
const home = await fetch(base + '/', { redirect: 'follow' });
const csp = home.headers.get('content-security-policy');
console.log('CSP header:', csp ? csp.substring(0, 120) + '...' : 'MISSING');
console.log('  frame-ancestors:', csp?.includes("frame-ancestors 'none'") ? 'YES(GOOD)' : 'NO');
console.log('  X-Frame-Options:', home.headers.get('x-frame-options'));

// 2. صحة الـ API
const h = await fetch(base + '/api/health').then(r => r.json());
console.log('health:', h.data.status, '| db:', h.data.database.status);

// 3. الدخول
const login = await fetch(base + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
}).then(r => r.json());
const tok = login.data?.token;
console.log('login:', tok ? 'OK (' + login.data.user.role + ')' : 'FAILED');

// 4. سجل التدقيق
const a = await fetch(base + '/api/audit-log?limit=1', { headers: { Authorization: `Bearer ${tok}` } });
console.log('audit-log:', a.status);

// 5. السجلات المطورة أُطفئت في الحزمة؟
const html = await home.text();
const jsPath = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
if (jsPath) {
  const js = await fetch(base + jsPath).then(r => r.text());
  console.log('[PWA] logs in bundle:', js.includes('[PWA]') ? 'STILL PRESENT(BAD)' : 'REMOVED(GOOD)');
  console.log('[Offline] init log in bundle:', js.includes('[Offline] IndexedDB initialized') ? 'PRESENT(BAD)' : 'REMOVED(GOOD)');
}
