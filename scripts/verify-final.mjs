const base = 'https://erp-unionministry.vercel.app';

// 1) POST audit-log بدون توكن (سيناريو فشل الدخول) — يجب ألا يعود 401
const r1 = await fetch(base + '/api/audit-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'LOGIN_FAILED', resource: 'auth', email: 'probe@test.ye', details: '{"probe":true}' }),
});
console.log('POST audit-log (بلا توكن):', r1.status, r1.status === 401 ? '(BAD)' : '(GOOD)');

// 2) الدخول
const l = await fetch(base + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
}).then(x => x.json());
console.log('login:', l.data?.token ? 'OK' : 'FAIL');

// 3) الصحة
const h = await fetch(base + '/api/health').then(x => x.json());
console.log('health:', h.data.status);

// 4) SPA fallback لمسار المنصة الوطنية
const html = await fetch(base + '/ministry/national-platform').then(r => r.text());
console.log('SPA fallback:', html.includes('<div id="root">') ? 'OK' : '?');
