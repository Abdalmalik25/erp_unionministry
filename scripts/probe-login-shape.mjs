import '../server/lib/loadEnv.js';

const r = await fetch('https://erp-unionministry.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
});
const j = await r.json();
console.log('keys:', Object.keys(j));
console.log('user:', JSON.stringify(j.user || j.data?.user || null));
// اختبار /api/audit-log بالتوكن
const tok = j.token || j.data?.token;
const a = await fetch('https://erp-unionministry.vercel.app/api/audit-log?limit=3', { headers: { Authorization: `Bearer ${tok}` } });
console.log('audit-log status:', a.status);
if (a.status === 200) {
  const aj = await a.json();
  const rows = aj.data?.data || aj.data || [];
  console.log('audit rows:', Array.isArray(rows) ? rows.length : typeof rows);
}
