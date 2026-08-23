/**
 * Targeted deployment — creates missing tables by extracting CREATE TABLE statements
 * from schema_comprehensive.sql and running them in dependency order
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
if (!DATABASE_URL) { console.error('❌ DATABASE_URL required'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

async function deploy() {
  console.log('🚀 Targeted Table Deployment\n');

  // Get list of existing tables
  const existing = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  const existingTables = new Set(existing.rows.map(r => r.tablename));
  console.log(`📋 Existing tables: ${existingTables.size}`);

  // Load schema
  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Extract CREATE TABLE statements (respecting dollar quotes)
  const createTableStmts = [];
  let cur = '', inDollar = false, dTag = '', inString = false, strCh = '';

  for (let i = 0; i < schema.length; i++) {
    const c = schema[i];
    if (!inDollar && (c === "'" || c === '"') && schema[i - 1] !== '\\') {
      if (!inString) { inString = true; strCh = c; }
      else if (c === strCh) { inString = false; }
    }
    if (!inString && c === '$') {
      const m = schema.slice(i).match(/^\$[a-zA-Z_]*\$/);
      if (m) {
        if (!inDollar) { inDollar = true; dTag = m[0]; }
        else if (m[0] === dTag) { inDollar = false; dTag = ''; }
        cur += m[0]; i += m[0].length - 1; continue;
      }
    }
    if (c === ';' && !inDollar && !inString) {
      const t = cur.trim();
      if (t.startsWith('CREATE TABLE ')) {
        const tableName = t.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/)?.[1];
        if (tableName && !existingTables.has(tableName)) {
          createTableStmts.push({ name: tableName, sql: t });
        }
      }
      cur = '';
    } else { cur += c; }
  }

  console.log(`📝 Missing tables to create: ${createTableStmts.length}\n`);

  // Create tables in order (they should already be in dependency order in the schema)
  let ok = 0, fail = 0;
  for (const { name, sql } of createTableStmts) {
    try {
      await pool.query(sql);
      console.log(`  ✅ ${name}`);
      ok++;
    } catch (err) {
      console.log(`  ⚠️  ${name}: ${err.message.slice(0, 100)}`);
      fail++;
    }
  }

  // Now create indexes, views, triggers, etc.
  console.log('\n📝 Creating indexes, views, triggers...');

  // Extract non-CREATE-TABLE statements
  const otherStmts = [];
  cur = ''; inDollar = false; dTag = ''; inString = false;

  for (let i = 0; i < schema.length; i++) {
    const c = schema[i];
    if (!inDollar && (c === "'" || c === '"') && schema[i - 1] !== '\\') {
      if (!inString) { inString = true; strCh = c; }
      else if (c === strCh) { inString = false; }
    }
    if (!inString && c === '$') {
      const m = schema.slice(i).match(/^\$[a-zA-Z_]*\$/);
      if (m) {
        if (!inDollar) { inDollar = true; dTag = m[0]; }
        else if (m[0] === dTag) { inDollar = false; dTag = ''; }
        cur += m[0]; i += m[0].length - 1; continue;
      }
    }
    if (c === ';' && !inDollar && !inString) {
      const t = cur.trim();
      if (t && !t.startsWith('--') && !t.startsWith('CREATE TABLE ')) {
        otherStmts.push(t);
      }
      cur = '';
    } else { cur += c; }
  }

  let ok2 = 0, skip2 = 0, fail2 = 0;
  for (const stmt of otherStmts) {
    try {
      await pool.query(stmt);
      ok2++;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('does not exist') ||
          msg.includes('cannot drop') || msg.includes('multiple') ||
          ['42710','42P07','23505','42P16','42883','42601','42701','42703'].includes(err.code)) {
        skip2++;
      } else {
        fail2++;
        if (fail2 <= 5) console.log(`  ⚠️  ${msg.slice(0, 120)}`);
      }
    }
  }

  // Deploy production schema
  console.log('\n📝 Deploying production enhancements...');
  const prodPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_production.sql');
  if (fs.existsSync(prodPath)) {
    const prodSQL = fs.readFileSync(prodPath, 'utf-8');
    const prodStmts = [];
    cur = ''; inDollar = false; dTag = ''; inString = false;

    for (let i = 0; i < prodSQL.length; i++) {
      const c = prodSQL[i];
      if (!inDollar && (c === "'" || c === '"') && prodSQL[i - 1] !== '\\') {
        if (!inString) { inString = true; strCh = c; }
        else if (c === strCh) { inString = false; }
      }
      if (!inString && c === '$') {
        const m = prodSQL.slice(i).match(/^\$[a-zA-Z_]*\$/);
        if (m) {
          if (!inDollar) { inDollar = true; dTag = m[0]; }
          else if (m[0] === dTag) { inDollar = false; dTag = ''; }
          cur += m[0]; i += m[0].length - 1; continue;
        }
      }
      if (c === ';' && !inDollar && !inString) {
        const t = cur.trim();
        if (t && !t.startsWith('--')) prodStmts.push(t);
        cur = '';
      } else { cur += c; }
    }

    let ok3 = 0, skip3 = 0, fail3 = 0;
    for (const stmt of prodStmts) {
      try {
        await pool.query(stmt);
        ok3++;
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('already exists') || msg.includes('does not exist') ||
            msg.includes('cannot drop') || msg.includes('multiple') ||
            ['42710','42P07','23505','42P16','42883','42601','42701','42703'].includes(err.code)) {
          skip3++;
        } else {
          fail3++;
          if (fail3 <= 5) console.log(`  ⚠️  ${msg.slice(0, 120)}`);
        }
      }
    }
    console.log(`  Production: ${ok3} applied, ${skip3} skipped, ${fail3} failed`);
  }

  // Final verification
  console.log('\n🔍 Final Verification:');
  const finalTables = await pool.query("SELECT COUNT(*) as count FROM pg_tables WHERE schemaname='public'");
  const finalIndexes = await pool.query("SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname='public'");
  const finalViews = await pool.query("SELECT COUNT(*) as count FROM pg_views WHERE schemaname='public'");
  const finalMV = await pool.query("SELECT COUNT(*) as count FROM pg_matviews WHERE schemaname='public'");
  const finalFuncs = await pool.query("SELECT COUNT(*) as count FROM pg_proc WHERE pronamespace = 'public'::regnamespace");
  const finalTriggers = await pool.query("SELECT COUNT(*) as count FROM pg_trigger WHERE tgname NOT LIKE 'RI_%'");
  const finalRLS = await pool.query("SELECT COUNT(*) as count FROM pg_tables WHERE schemaname='public' AND rowsecurity = true");

  console.log(`  Tables: ${finalTables.rows[0].count}`);
  console.log(`  Indexes: ${finalIndexes.rows[0].count}`);
  console.log(`  Views: ${finalViews.rows[0].count}`);
  console.log(`  Materialized Views: ${finalMV.rows[0].count}`);
  console.log(`  Functions: ${finalFuncs.rows[0].count}`);
  console.log(`  Triggers: ${finalTriggers.rows[0].count}`);
  console.log(`  RLS Tables: ${finalRLS.rows[0].count}`);

  await pool.end();
  console.log('\n✅ Deployment complete!');
}

deploy().catch(e => { console.error('❌', e.message); process.exit(1); });
