import pg from 'pg';
import { scryptSync, timingSafeEqual } from 'crypto';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const r = await pool.query("SELECT * FROM sector_users WHERE email = 'minstry@yemen.gov.ye'");
const u = r.rows[0];

console.log('User:', u.email);
console.log('Stored hash:', u.password_hash);
console.log('Stored salt:', u.salt);

// Test with the exact same algorithm as auth.js: scryptSync(password, salt, 64)
const testHash = scryptSync('Sector@2026', u.salt, 64).toString('hex');
console.log('\nComputed hash for Sector@2026:', testHash);
console.log('Match:', testHash === u.password_hash);

// Also test with nuclearHashPassword parameters
const nuclearHash = scryptSync('Sector@2026', u.salt, 64, {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
}).toString('hex');
console.log('\nNuclear hash for Sector@2026:', nuclearHash);
console.log('Nuclear match:', nuclearHash === u.password_hash);

// Check if hash length is correct
console.log('\nHash length (hex chars):', u.password_hash.length);
console.log('Expected length for scrypt(64 bytes):', 128);

await pool.end();
