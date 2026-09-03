// Test login against production API
const res = await fetch('https://erp-unionministry.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'minstry@yemen.gov.ye', password: 'Sector@2026' }),
});
const text = await res.text();
console.log('Status:', res.status);
console.log('Headers:', Object.fromEntries(res.headers.entries()));
console.log('Body:', text);
