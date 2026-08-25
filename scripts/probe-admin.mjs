const l = await fetch('https://erp-unionministry.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
}).then(x => x.json());
console.log('admin login:', l.data?.token ? 'WORKS' : 'BROKEN');
console.log('user payload keys:', Object.keys(l.data?.user || {}).join(','));
