// Full auth flow test against production
const BASE = 'https://erp-unionministry.vercel.app';

async function safeJson(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return { _raw: t.slice(0, 100) }; }
}

// Step 1: Login
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'minstry@yemen.gov.ye', password: 'Sector@2026' }),
});
const loginRaw = await login.text();
const loginBody = loginRaw ? JSON.parse(loginRaw) : {};
const data = loginBody.data ?? loginBody;
console.log('[1] LOGIN:', login.status, '| success:', data.success);
console.log('    user:', data.user?.email, '| role:', data.user?.role, '| type:', data.user?.userType);

const token = data.token;
if (!token || login.status !== 200) {
  console.log('    ABORT — no token. Response:', loginRaw.slice(0, 300));
  process.exit(1);
}
console.log('    token: present (' + token.split('.').length + ' parts)');
console.log('    sessionId:', data.sessionId?.slice(0, 8) + '...');

const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

// Step 2: Public endpoints
console.log('\n=== PUBLIC ENDPOINTS (no auth required) ===');
for (const ep of ['/api/health', '/api/version', '/api/system/branding', '/api/system/policy']) {
  const r = await fetch(`${BASE}${ep}`);
  const b = await safeJson(r);
  console.log(`  GET ${ep}: ${r.status} ${b.success === true ? 'OK' : (b.errors?.error || b.error || '').toString().slice(0, 50)}`);
}

// Step 3: Protected endpoints with token
console.log('\n=== PROTECTED ENDPOINTS (with token) ===');
for (const ep of ['/api/violations', '/api/inspections', '/api/admin/settings', '/api/role-permissions', '/api/dashboard', '/api/settings']) {
  const r = await fetch(`${BASE}${ep}`, { headers: authHeaders });
  const b = await safeJson(r);
  console.log(`  GET ${ep}: ${r.status} ${b.success === true ? 'OK' : (b.errors?.error || b.error || '').toString().slice(0, 60)}`);
}

// Step 4: Protected endpoints without token
console.log('\n=== PROTECTED ENDPOINTS (no token — expect 401) ===');
for (const ep of ['/api/violations', '/api/inspections', '/api/admin/settings', '/api/settings']) {
  const r = await fetch(`${BASE}${ep}`);
  console.log(`  GET ${ep}: ${r.status} ${r.status === 401 ? 'BLOCKED' : 'UNEXPECTED'}`);
}

// Step 5: Bad password
const bad = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'minstry@yemen.gov.ye', password: 'WrongPassword123!' }),
});
console.log('\n=== BAD PASSWORD ===');
console.log(`  POST /api/auth/login: ${bad.status} ${bad.status === 401 ? 'REJECTED' : 'UNEXPECTED'}`);

// Step 6: Logout
const lo = await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: authHeaders });
console.log('\n=== LOGOUT ===');
console.log(`  POST /api/auth/logout: ${lo.status}`);

console.log('\n=== DONE ===');
