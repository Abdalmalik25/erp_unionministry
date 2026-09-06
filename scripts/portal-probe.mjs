const base = 'https://erp-unionministry.vercel.app';

async function login() {
  const r = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'minstry@yemen.gov.ye', password: 'Sector@2026' }),
  });
  const j = await r.json();
  if (r.ok && j.data?.token) return { token: j.data.token, session: j.data };
  console.log('login failed', r.status, JSON.stringify(j).slice(0, 200));
  return null;
}

const { token } = (await login()) || { token: null };
if (!token) { console.log('NO TOKEN'); process.exit(1); }
console.log('LOGIN OK\n');

const ZERO = '00000000-0000-0000-0000-000000000000';
const requests = [
  ['worker-passport (no persons)', 'GET', '/api/worker-portal/' + ZERO + '/passport'],
  ['worker-requests (no persons)', 'GET', '/api/worker-portal/' + ZERO + '/requests'],
  ['worker-dashboard (no persons)', 'GET', '/api/worker-portal/' + ZERO + '/dashboard'],
  ['worker-timeline (no persons)', 'GET', '/api/worker-portal/' + ZERO + '/timeline'],
  ['worker-alerts (no persons)', 'GET', '/api/worker-portal/' + ZERO + '/alerts'],
  ['cross registry worker/id', 'GET', '/api/cross-portal/registry/worker/' + ZERO],
  ['cross registry search worker q=a', 'GET', '/api/cross-portal/registry/worker/search?q=a'],
  ['cross notifications', 'GET', '/api/cross-portal/notifications'],
  ['cross analytics', 'GET', '/api/cross-portal/analytics'],
  ['contracts list', 'GET', '/api/contracts'],
  ['contracts statistics', 'GET', '/api/contracts/statistics'],
  ['disputes list', 'GET', '/api/disputes'],
  ['disputes statistics', 'GET', '/api/disputes/statistics'],
  ['inspections list', 'GET', '/api/inspections'],
  ['inspections statistics', 'GET', '/api/inspections/statistics'],
  ['dashboard stats', 'GET', '/api/dashboard/stats'],
  ['system branding', 'GET', '/api/system/branding'],
];

let fails = 0;
for (const [label, method, path, body] of requests) {
  try {
    const r = await fetch(base + path, {
      method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let text; try { text = await r.text(); } catch (e) { text = ''; }
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120);
    const status = String(r.status);
    if (!/^2/.test(status)) fails++;
    console.log(`${status} ${label.padEnd(50)} :: ${snippet}`);
  } catch (e) {
    fails++;
    console.log(`ERR ${label.padEnd(50)} :: ${e.message}`);
  }
}
console.log(`\nDone. ${fails} non-2xx.`);