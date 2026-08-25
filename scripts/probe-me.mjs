const l = await fetch('https://erp-unionministry.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
}).then(x => x.json());
const token = l.data?.token ?? l.token;
const me = await fetch('https://erp-unionministry.vercel.app/api/auth/me', {
  headers: { Authorization: 'Bearer ' + token },
}).then(x => x.json());
console.log('me.data =', JSON.stringify(me.data));
