const fs = require('fs');
const path = require('path');
const NL = String.fromCharCode(10);

// تحميل .env يدوياً
const envPath = path.join(__dirname, '..', '.env');
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(NL).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const idx = t.indexOf('=');
    if (idx === -1) return;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  });
} catch (e) { /* ignore */ }

async function main() {
  const { Client } = await import('pg');
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) { console.error('NO_DATABASE_URL'); process.exit(1); }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'system_administration.sql'), 'utf8');
  try {
    await client.query(sql);
    console.log('ADMINISTRATION_SCHEMA_APPLIED');
    // تحقق سريع
    const r = await client.query(`SELECT COUNT(*)::int AS n FROM system_settings`);
    console.log('settings_count=' + r.rows[0].n);
    const p = await client.query(`SELECT COUNT(*)::int AS n FROM role_permissions`);
    console.log('permissions_count=' + p.rows[0].n);
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error('APPLY_FAILED:', e.message); process.exit(1); });