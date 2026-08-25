import fs from 'fs';

// ===== 1) الخادم: السماح بـ POST /api/audit-log عبر البوابة مع مانع إغراق مخصص =====
let s = fs.readFileSync('server/index.js', 'utf8');

const gateAnchor = "const PUBLIC_POST = ['/api/account-requests'];";
if (!s.includes("AUDIT_POST_LIMITER")) {
  s = s.replace(
    gateAnchor,
    `const PUBLIC_POST = ['/api/account-requests', '/api/audit-log'];

// مانع إغراق مخصص لقيود التدقيق العامة: 30 طلباً/دقيقة لكل عنوان — يحمي جدول التدقيق من التعبئة
const AUDIT_POST_LIMITER = (() => {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now - v.t > 60000) hits.delete(k); }, 30000).unref();
  return (req, res, next) => {
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'x').toString().slice(0, 50);
    const now = Date.now();
    const e = hits.get(ip);
    if (!e || now - e.t > 60000) { hits.set(ip, { t: now, n: 1 }); return next(); }
    e.n += 1;
    if (e.n > 30) return res.status(429).json({ error: 'عدد كبير من الطلبات — حاول لاحقاً', code: 'RATE_LIMITED' });
    next();
  };
})();`
  );
  // وجّه الليمنتر على هذا المسار تحديداً داخل البوابة
  s = s.replace(
    "|| (req.method === 'POST' && PUBLIC_POST.includes(req.path));",
    `|| (req.method === 'POST' && PUBLIC_POST.includes(req.path));
  if (req.method === 'POST' && req.path === '/api/audit-log') return AUDIT_POST_LIMITER(req, res, () => {
    // قيود التدقيق العامة مسموحة حتى قبل الدخول (توثيق محاولات الاختراق) لكنها لا تتجاوز الليمنتر
    next();
  });`
  );
  fs.writeFileSync('server/index.js', s, 'utf8');
  console.log('server gate patched');
} else console.log('server already patched');

// ===== 2) الواجهة: إلحاق التوكن إن وُجد حتى تُنسب الأحداث لمالكها =====
let c = fs.readFileSync('src/app/utils/security.ts', 'utf8');
c = c.replace(
  `fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },`,
  `fetch('/api/audit-log', {
      method: 'POST',
      headers: (() => {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const raw = localStorage.getItem('us_session');
          if (raw) {
            const sess = JSON.parse(raw);
            if (sess?.token) h['Authorization'] = \`Bearer \${sess.token}\`;
          }
        } catch { /* لا جلسة */ }
        return h;
      })(),`
);
fs.writeFileSync('src/app/utils/security.ts', c, 'utf8');
console.log('client token attach:', c.includes("h['Authorization']") ? 'OK' : 'FAILED');
