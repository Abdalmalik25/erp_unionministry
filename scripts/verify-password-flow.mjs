// تحقق شامل: الموقع العام المرقى + مسار كلمة المرور الكامل (دخول → إشارة → تغيير → زوال الإشارة)
const base = 'https://erp-unionministry.vercel.app';

// انتظار النشر
for (let i = 0; i < 25; i++) {
  const h = await fetch(base + '/api/health').then(r => r.json()).catch(() => null);
  if (h?.data?.status === 'healthy') { console.log('live, attempt', i + 1); break; }
  await new Promise(r => setTimeout(r, 3000));
}

// 1) الدخول بحساب مدير النظام — يجب أن يحمل mustChangePassword=true
const l = await fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
}).then(x => x.json());
const token = l.data?.token ?? l.token;
console.log('login:', token ? 'OK' : 'FAIL', '| mustChangePassword:', l.data?.user?.mustChangePassword ?? l.user?.mustChangePassword);

// 2) /api/auth/me يعرض الإشارة
const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json());
console.log('me.mustChangePassword:', me.user?.mustChangePassword);

// 3) تغيير بكلمة حالية خاطئة → يجب أن يُرفض 401
const bad = await fetch(base + '/api/auth/change-password', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ currentPassword: 'wrong-pass-123', newPassword: 'NewSecure#2026x' }),
});
console.log('wrong current rejected:', bad.status === 401 ? 'YES(GOOD)' : `HTTP ${bad.status}(BAD)`);

// 4) تغيير حقيقي ثم التحقق من الدخول بالجديدة وزوال الإشارة
const ch = await fetch(base + '/api/auth/change-password', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ currentPassword: 'M0sal!Admin#2026', newPassword: 'M0sal!Admin#2026x' }),
}).then(x => x.json());
console.log('change:', ch.success ? 'SUCCESS' : ch.error || 'FAIL');

const l2 = await fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026x' }),
}).then(x => x.json());
console.log('login with NEW password:', l2.token || l2.data?.token ? 'OK' : 'FAIL',
  '| mustChangePassword now:', l2.data?.user?.mustChangePassword ?? l2.user?.mustChangePassword);

const oldTry = await fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
});
console.log('old password blocked:', oldTry.status === 401 ? 'YES(GOOD)' : `HTTP ${oldTry.status}(BAD)`);

// 5) أعدها للأصلية كما طلب المستخدم (سيغيرها بنفسه لاحقاً)
const t2 = l2.token ?? l2.data?.token;
const rev = await fetch(base + '/api/auth/change-password', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t2}` },
  body: JSON.stringify({ currentPassword: 'M0sal!Admin#2026x', newPassword: 'M0sal!Admin#2026' }),
}).then(x => x.json());
console.log('restored to original for user handover:', rev.success ? 'DONE' : rev.error);

// 6) علامات المحتوى المرقى في الحزمة
const html = await fetch(base + '/').then(r => r.text());
const idx = html.match(/src="(\/assets\/index-[^"]+\.js)"/)[1];
const js = await fetch(base + idx).then(r => r.text());
const m = js.match(/[A-Za-z0-9_-]*PublicHome[A-Za-z0-9_-]*\.js/);
if (m) {
  const c = await fetch(base + '/assets/' + m[0]).then(r => r.text());
  console.log('impact section live:', c.includes('لماذا منظومة وطنية') ? 'YES(GOOD)' : 'NO');
  console.log('addressed portals live:', c.includes('إن كنت عاملاً') ? 'YES(GOOD)' : 'NO');
}
