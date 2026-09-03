import pg from 'pg';
import { scryptSync, timingSafeEqual } from 'crypto';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const r = await pool.query("SELECT * FROM sector_users WHERE email = 'minstry@yemen.gov.ye'");
const u = r.rows[0];

// Try common passwords
const passwords = ['Sector@2026', 'Ministry@2024', 'Admin@2024', 'Password123!', 'ministry123', 'Ministry123!', 'Yemen@2024', 'Test1234!'];

console.log(`Testing passwords for ${u.email}:`);
for (const pw of passwords) {
  const h = scryptSync(pw, u.salt, 64).toString('hex');
  const match = timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(u.password_hash, 'hex'));
  if (match) {
    console.log(`  MATCH: ${pw}`);
  }
}

// Also test the actual scrypt output for Sector@2026
const testHash = scryptSync('Sector@2026', u.salt, 64).toString('hex');
console.log(`\nExpected hash: ${u.password_hash}`);
console.log(`Computed hash for Sector@2026: ${testHash}`);
console.log(`Match: ${testHash === u.password_hash}`);

await pool.end();
