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
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}

loadEnv();
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  statement_timeout: 30000,
  query_timeout: 30000,
});

async function main() {
  console.log('=== Cloud Database Audit ===\n');

  // List all tables
  const tables = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  console.log(`Tables (${tables.rows.length}):`);
  for (const r of tables.rows) {
    const count = await pool.query(`SELECT COUNT(*) FROM "${r.tablename}"`);
    const n = parseInt(count.rows[0].count);
    if (n > 0) console.log(`  ${r.tablename}: ${n} rows`);
  }
  console.log(`  (showing only tables with data)\n`);

  // List all views
  const views = await pool.query(`SELECT viewname FROM pg_views WHERE schemaname='public' ORDER BY viewname`);
  console.log(`Views (${views.rows.length}):`);
  for (const r of views.rows) console.log(`  ${r.viewname}`);

  // List materialized views
  const matviews = await pool.query(`SELECT matviewname FROM pg_matviews WHERE schemaname='public'`);
  console.log(`\nMaterialized Views (${matviews.rows.length}):`);
  for (const r of matviews.rows) console.log(`  ${r.matviewname}`);

  // Check seed data
  console.log('\n=== Seed Data Status ===');
  const seedTables = [
    ['governorates', 'governorate_id'],
    ['regions', 'region_id'],
    ['zones', 'zone_id'],
    ['services', 'service_id'],
    ['hazard_types', 'id'],
    ['violation_types', 'id'],
  ];
  for (const [t, pk] of seedTables) {
    try {
      const r = await pool.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`  ${t}: ${r.rows[0].count} rows`);
    } catch (e) {
      console.log(`  ${t}: TABLE MISSING`);
    }
  }

  // Check professions (should have 3590)
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM professions`);
    console.log(`  professions: ${r.rows[0].count} rows`);
  } catch (e) {
    console.log(`  professions: TABLE MISSING`);
  }

  await pool.end();
  console.log('\nDone.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
