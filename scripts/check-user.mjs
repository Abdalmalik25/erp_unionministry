import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
const r = await pool.query("SELECT id, email, name, role, is_active, length(password_hash) as pw_len, length(salt) as salt_len FROM sector_users ORDER BY created_at");
console.log('All users:');
for (const u of r.rows) {
  console.log(`  ${u.email} | role=${u.role} | active=${u.is_active} | pw_hash_len=${u.pw_len} | salt_len=${u.salt_len}`);
}

// Now verify the password for minstry@yemen.gov.ye
import { scryptSync, timingSafeEqual } from 'crypto';
const userRow = await pool.query("SELECT * FROM sector_users WHERE email = 'minstry@yemen.gov.ye'");
if (userRow.rows.length === 0) {
  console.log('\nUser not found!');
} else {
  const u = userRow.rows[0];
  console.log(`\nUser: ${u.email} | name: ${u.name} | role: ${u.role}`);
  console.log(`  password_hash: ${u.password_hash}`);
  console.log(`  salt: ${u.salt}`);
  console.log(`  is_active: ${u.is_active}`);
  console.log(`  mfa_enabled: ${u.mfa_enabled}`);
}

// Check all users count
const count = await pool.query('SELECT COUNT(*)::int as n FROM sector_users');
console.log(`\nTotal users: ${count.rows[0].n}`);

await pool.end();
