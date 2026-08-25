// تحقق نهائي حي من توحيد الاسم + تدفق كلمة المرور
import fs from 'node:fs';
import pg from 'pg';

const BASE = 'https://erp-unionministry.vercel.app';

const html = await (await fetch(BASE)).text();
console.log('title OK:', html.includes('المنظومة الوطنية لإدارة قطاع العمل — وزارة'));
console.log('desc OK:', html.includes('المنظومة الوطنية لإدارة قطاع العمل — منصة وزارة'));

const branding = await (await fetch(`${BASE}/api/system/branding`)).json();
const b = branding.data ?? branding;
console.log('branding API:', b.systemNameAr);

const manifest = await (await fetch(`${BASE}/manifest.json`)).json();
console.log('manifest:', manifest.name, '|', manifest.short_name);

const login = await (await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
})).json();
const d = login.data ?? login;
console.log('login flag mustChangePassword:', d.user?.mustChangePassword);
