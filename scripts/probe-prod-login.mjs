import '../server/lib/loadEnv.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
const u = await pool.query(`SELECT email, is_active, left(password_hash, 12) ph FROM sector_users WHERE email = 'sys.admin@mosal.gov.ye'`);
console.log('local db admin:', JSON.stringify(u.rows[0] || null));
const n = await pool.query('SELECT count(*) c FROM sector_users WHERE deleted_at IS NULL');
console.log('active users total:', n.rows[0].c);
await pool.end();

// تجربة الدخول على الإنتاج بنفس بيانات المدير
const r = await fetch('https://erp-unionministry.vercel.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sys.admin@mosal.gov.ye', password: 'M0sal!Admin#2026' }),
});
console.log('prod login status:', r.status);
if (r.status === 200) {
  const j = await r.json();
  console.log('login OK — role:', j.user?.role);
} else {
  console.log('body:', (await r.text()).substring(0, 150));
}
