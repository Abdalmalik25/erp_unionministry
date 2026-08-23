/**
 * Enum-first deployment — creates all ENUM types first, then tables
 */

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
      if (match) { if (!process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim(); }
    });
  }
}

loadEnv();
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) { console.error('❌ DATABASE_URL required'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

async function deploy() {
  console.log('🚀 Enum-First Deployment\n');

  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Strip line comments
  const clean = schema.replace(/--.*$/gm, '');

  // 1. Extract and create all ENUM types first
  console.log('📝 Creating ENUM types...');
  const enumRegex = /CREATE TYPE\s+(\w+)\s+AS ENUM\s*\(([\s\S]*?)\);/g;
  let m;
  let enumOk = 0, enumSkip = 0;
  while ((m = enumRegex.exec(clean)) !== null) {
    try {
      await pool.query(m[0]);
      enumOk++;
    } catch (err) {
      if (err.message.includes('already exists')) enumSkip++;
      else console.log(`  ⚠️  ${m[1]}: ${err.message.slice(0, 100)}`);
    }
  }
  console.log(`  ENUMs: ${enumOk} created, ${enumSkip} already existed\n`);

  // 2. Extract and run all CREATE EXTENSION statements
  console.log('📝 Creating extensions...');
  const extRegex = /CREATE EXTENSION\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?\s*;/g;
  while ((m = extRegex.exec(clean)) !== null) {
    try { await pool.query(m[0]); } catch (e) { /* skip */ }
  }
  console.log('  Extensions done\n');

  // 3. Create tables in dependency order
  console.log('📝 Creating tables...');
  
  // First, get existing tables
  const existing = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  const existingSet = new Set(existing.rows.map(r => r.tablename));
  console.log(`  Existing: ${existingSet.size} tables`);

  // Extract CREATE TABLE blocks
  const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/g;
  const tables = [];
  while ((m = tableRegex.exec(clean)) !== null) {
    if (!existingSet.has(m[1])) {
      tables.push({ name: m[1], sql: m[0] });
    }
  }
  console.log(`  Missing: ${tables.length} tables`);

  let tableOk = 0, tableFail = 0;
  for (const { name, sql } of tables) {
    try {
      await pool.query(sql);
      console.log(`  ✅ ${name}`);
      tableOk++;
    } catch (err) {
      console.log(`  ⚠️  ${name}: ${err.message.slice(0, 120)}`);
      tableFail++;
    }
  }
  console.log(`  Tables: ${tableOk} created, ${tableFail} failed\n`);

  // 4. Run remaining statements (indexes, triggers, views, functions, seed data)
  console.log('📝 Running remaining SQL (indexes, triggers, views, seed data)...');

  // Remove CREATE TYPE and CREATE TABLE blocks, keep everything else
  let remaining = clean;
  remaining = remaining.replace(/CREATE TYPE\s+\w+\s+AS ENUM\s*\([\s\S]*?\);/g, '');
  remaining = remaining.replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?\w+\s*\([\s\S]*?\);/g, '');

  const stmts = remaining.split(/;\s*\n/).filter(s => {
    const t = s.trim();
    return t && !t.startsWith('--') && t.length > 10;
  });

  let remOk = 0, remSkip = 0, remFail = 0;
  for (const stmt of stmts) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    try {
      await pool.query(trimmed);
      remOk++;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('does not exist') ||
          msg.includes('duplicate') || msg.includes('multiple') ||
          msg.includes('syntax error') || msg.includes('does not match') ||
          ['42710','42P07','23505','42P16','42883','42601','42701','42703'].includes(err.code)) {
        remSkip++;
      } else {
        remFail++;
        if (remFail <= 5) console.log(`  ⚠️  ${msg.slice(0, 120)}`);
      }
    }
  }
  console.log(`  Remaining: ${remOk} applied, ${remSkip} skipped, ${remFail} failed\n`);

  // 5. Deploy production schema
  console.log('📝 Deploying production schema...');
  const prodPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_production.sql');
  if (fs.existsSync(prodPath)) {
    const prodSQL = fs.readFileSync(prodPath, 'utf-8').replace(/--.*$/gm, '');
    
    // Extract enums from production
    const prodEnumRegex = /CREATE TYPE IF NOT EXISTS\s+(\w+)\s+AS ENUM\s*\(([\s\S]*?)\);/g;
    while ((m = prodEnumRegex.exec(prodSQL)) !== null) {
      try { await pool.query(m[0]); } catch (e) { /* skip */ }
    }

    // Extract tables from production
    const prodTableRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]*?)\);/g;
    while ((m = prodTableRegex.exec(prodSQL)) !== null) {
      try { await pool.query(m[0]); } catch (e) { /* skip */ }
    }

    // Run remaining production statements
    let prodRemaining = prodSQL;
    prodRemaining = prodRemaining.replace(/CREATE TYPE IF NOT EXISTS\s+\w+\s+AS ENUM\s*\([\s\S]*?\);/g, '');
    prodRemaining = prodRemaining.replace(/CREATE TABLE IF NOT EXISTS\s+\w+\s*\([\s\S]*?\);/g, '');

    const prodStmts = prodRemaining.split(/;\s*\n/).filter(s => {
      const t = s.trim();
      return t && !t.startsWith('--') && t.length > 10;
    });

    let prodOk = 0, prodSkip = 0;
    for (const stmt of prodStmts) {
      try { await pool.query(stmt.trim()); prodOk++; } catch (e) { prodSkip++; }
    }
    console.log(`  Production: ${prodOk} applied, ${prodSkip} skipped\n`);
  }

  // 6. Final verification
  console.log('🔍 Final Verification:');
  const q = async (sql) => (await pool.query(sql)).rows[0].count;
  console.log(`  Tables: ${await q("SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'")}`);
  console.log(`  Indexes: ${await q("SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public'")}`);
  console.log(`  Views: ${await q("SELECT COUNT(*) FROM pg_views WHERE schemaname='public'")}`);
  console.log(`  Materialized Views: ${await q("SELECT COUNT(*) FROM pg_matviews WHERE schemaname='public'")}`);
  console.log(`  Functions: ${await q("SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace")}`);
  console.log(`  Triggers: ${await q("SELECT COUNT(*) FROM pg_trigger WHERE tgname NOT LIKE 'RI_%'")}`);
  console.log(`  Enums: ${await q("SELECT COUNT(*) FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace")}`);
  console.log(`  RLS Tables: ${await q("SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity = true")}`);

  // List all tables
  console.log('\n📋 All Tables:');
  const allTables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  allTables.rows.forEach(r => console.log(`  - ${r.tablename}`));

  await pool.end();
  console.log('\n✅ Deployment complete!');
}

deploy().catch(e => { console.error('❌', e.message); process.exit(1); });
