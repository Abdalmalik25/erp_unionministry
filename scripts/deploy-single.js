/**
 * Single-connection deployment — all SQL through one connection
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
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 60000, idleTimeoutMillis: 60000 });

async function deploy() {
  console.log('🚀 Single-Connection Deployment\n');

  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const prodPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_production.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const prod = fs.existsSync(prodPath) ? fs.readFileSync(prodPath, 'utf-8') : '';
  const fullSQL = schema + '\n' + prod;

  // Strip comments, clean up
  const clean = fullSQL.replace(/--.*$/gm, '');

  // Collect all CREATE TYPE statements
  const enumStmts = [];
  const enumRegex = /CREATE TYPE\s+(\w+)\s+AS ENUM\s*\(([\s\S]*?)\);/g;
  let m;
  while ((m = enumRegex.exec(clean)) !== null) enumStmts.push(m[0]);

  // Collect all CREATE TABLE statements
  const tableStmts = [];
  const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/g;
  while ((m = tableRegex.exec(clean)) !== null) tableStmts.push({ name: m[1], sql: m[0] });

  // Get everything else (minus TYPE and TABLE blocks)
  let rest = clean;
  rest = rest.replace(/CREATE TYPE\s+\w+\s+AS ENUM\s*\([\s\S]*?\);/g, '');
  rest = rest.replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?\w+\s*\([\s\S]*?\);/g, '');
  const restStmts = rest.split(/;\s*\n/).filter(s => s.trim().length > 10 && !s.trim().startsWith('--'));

  console.log(`ENUM types: ${enumStmts.length}`);
  console.log(`Tables: ${tableStmts.length}`);
  console.log(`Other statements: ${restStmts.length}\n`);

  const client = await pool.connect();
  let ok = 0, skip = 0, fail = 0;

  async function run(label, stmt) {
    try {
      await client.query(stmt);
      ok++;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('does not exist') ||
          msg.includes('cannot drop') || msg.includes('multiple') ||
          msg.includes('duplicate') || msg.includes('syntax error') ||
          ['42710','42P07','23505','42P16','42883','42601','42701','42703'].includes(err.code)) {
        skip++;
      } else {
        fail++;
        console.log(`  ⚠️  ${label}: ${msg.slice(0, 120)}`);
      }
    }
  }

  // Phase 1: Extensions
  console.log('Phase 1: Extensions...');
  for (const s of restStmts.filter(s => s.includes('CREATE EXTENSION'))) {
    await run('ext', s);
  }

  // Phase 2: Enums
  console.log('Phase 2: ENUM types...');
  for (const s of enumStmts) {
    const name = s.match(/CREATE TYPE\s+(\w+)/)?.[1] || '?';
    await run(name, s);
  }
  console.log(`  ok:${ok} skip:${skip} fail:${fail}`);

  // Phase 3: Tables
  console.log('Phase 3: Tables...');
  for (const { name, sql } of tableStmts) {
    await run(name, sql);
  }
  console.log(`  ok:${ok} skip:${skip} fail:${fail}`);

  // Phase 4: Everything else
  console.log('Phase 4: Indexes, triggers, views, functions, seed data...');
  for (const s of restStmts) {
    if (s.includes('CREATE EXTENSION')) continue; // already done
    await run('other', s);
  }
  console.log(`  ok:${ok} skip:${skip} fail:${fail}`);

  client.release();

  // Verify
  console.log('\n🔍 Verification:');
  const q = async (sql) => (await pool.query(sql)).rows[0].count;
  console.log(`  Tables: ${await q("SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'")}`);
  console.log(`  Indexes: ${await q("SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public'")}`);
  console.log(`  Views: ${await q("SELECT COUNT(*) FROM pg_views WHERE schemaname='public'")}`);
  console.log(`  Mat. Views: ${await q("SELECT COUNT(*) FROM pg_matviews WHERE schemaname='public'")}`);
  console.log(`  Functions: ${await q("SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace")}`);
  console.log(`  Triggers: ${await q("SELECT COUNT(*) FROM pg_trigger WHERE tgname NOT LIKE 'RI_%'")}`);
  console.log(`  Enums: ${await q("SELECT COUNT(*) FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace")}`);
  console.log(`  RLS: ${await q("SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity = true")}`);

  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log(`\n📋 ${tables.rows.length} Tables:`);
  tables.rows.forEach(r => console.log(`  - ${r.tablename}`));

  await pool.end();
  console.log(`\n✅ Total: ${ok} ok, ${skip} skipped, ${fail} failed`);
}

deploy().catch(e => { console.error('❌', e.message); process.exit(1); });
