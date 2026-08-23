import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

async function verify() {
  console.log('🔍 UnionSphere Enterprise — Cloud Database Verification\n');

  const checks = [
    { name: 'Tables', sql: "SELECT COUNT(*) as count FROM pg_tables WHERE schemaname='public'" },
    { name: 'Indexes', sql: "SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname='public'" },
    { name: 'Views', sql: "SELECT COUNT(*) as count FROM pg_views WHERE schemaname='public'" },
    { name: 'Materialized Views', sql: "SELECT COUNT(*) as count FROM pg_matviews WHERE schemaname='public'" },
    { name: 'Functions', sql: "SELECT COUNT(*) as count FROM pg_proc WHERE pronamespace = 'public'::regnamespace" },
    { name: 'Triggers', sql: "SELECT COUNT(*) as count FROM pg_trigger WHERE tgname NOT LIKE 'RI_%'" },
    { name: 'Enums', sql: "SELECT COUNT(*) as count FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace" },
    { name: 'RLS Tables', sql: "SELECT COUNT(*) as count FROM pg_tables WHERE schemaname='public' AND rowsecurity = true" },
    { name: 'Constraints', sql: "SELECT COUNT(*) as count FROM pg_constraint WHERE connamespace = 'public'::regnamespace" },
  ];

  for (const check of checks) {
    const r = await pool.query(check.sql);
    console.log(`  ${check.name}: ${r.rows[0].count}`);
  }

  // List all tables
  console.log('\n📋 All Tables:');
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  tables.rows.forEach(r => console.log(`  - ${r.tablename}`));

  // List materialized views
  console.log('\n📊 Materialized Views:');
  const mvs = await pool.query("SELECT matviewname FROM pg_matviews WHERE schemaname='public' ORDER BY matviewname");
  mvs.rows.forEach(r => console.log(`  - ${r.matviewname}`));

  // Verify schema_migrations
  console.log('\n📦 Schema Migrations:');
  try {
    const migrations = await pool.query("SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5");
    migrations.rows.forEach(r => console.log(`  - ${r.version}: ${r.description} (${r.applied_at})`));
  } catch (e) {
    console.log('  - Not available');
  }

  // Run schema health check
  console.log('\n🏥 Schema Health Check:');
  try {
    const health = await pool.query("SELECT * FROM validate_schema_health()");
    health.rows.forEach(r => console.log(`  - ${r.check_name}: ${r.status} (${r.details})`));
  } catch (e) {
    console.log('  - Health check not available');
  }

  await pool.end();
  console.log('\n✅ Verification complete!');
}

verify().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
