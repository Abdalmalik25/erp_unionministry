// verify-deploy.mjs — انتظار اكتمال نشر Vercel ثم التحقق من الرابط المعتمد
const BASE = 'https://erp-unionministry.vercel.app';
import fs from 'fs';

const localCss = fs.readdirSync('dist/assets').find(f => /^index-.*\.css$/.test(f));
console.log('local css hash:', localCss);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    const h = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(15000) });
    const body = await h.text();
    console.log(`[${attempt}] /api/health -> ${h.status} ${body.slice(0, 120)}`);

    if (h.status === 200) {
      const j = JSON.parse(body);
      console.log('health data:', JSON.stringify(j.data?.status), '| db:', JSON.stringify(j.data?.database?.status));

      // 2) تسجيل الدخول — يجب ألا يكون 403 MFA
      const login = await fetch(BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'wrong-password-probe' }),
        signal: AbortSignal.timeout(15000),
      });
      const lbody = await login.text();
      console.log('login probe ->', login.status, lbody.includes('MFA_REQUIRED') ? 'MFA BLOCKED(BAD)' : login.status === 401 ? 'auth-check OK(401 expected)' : lbody.slice(0, 100));

      // 3) الصفحة الرئيسية + توافق هاش CSS
      const html = await (await fetch(BASE + '/', { signal: AbortSignal.timeout(15000) })).text();
      const m = html.match(/assets\/index-[^"]+\.css/);
      console.log('live css:', m ? m[0] : '?');
      console.log('css match:', m && m[0] === 'assets/' + localCss ? 'YES — new build LIVE' : 'NO — still old build');

      // 4) CSP
      const csp = (await fetch(BASE + '/', { method: 'HEAD', signal: AbortSignal.timeout(15000) })).headers.get('content-security-policy');
      console.log('CSP:', csp ? 'present, frame-ancestors ' + (csp.includes("frame-ancestors 'none'") ? "none(GOOD)" : 'other') : 'MISSING');
      break;
    }
  } catch (e) {
    console.log(`[${attempt}] ERR ${e.message}`);
  }
  await sleep(20000);
}
