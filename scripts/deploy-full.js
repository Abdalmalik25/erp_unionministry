/**
 * Full schema deployment — applies schema_comprehensive.sql + schema_production.sql
 * Each statement runs independently to avoid transaction abort issues
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

function splitSQL(sql) {
  const stmts = [];
  let cur = '', inDollar = false, dTag = '';
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === '$') {
      const m = sql.slice(i).match(/^\$[a-zA-Z_]*\$/);
      if (m) {
        if (!inDollar) { inDollar = true; dTag = m[0]; }
        else if (m[0] === dTag) { inDollar = false; dTag = ''; }
        cur += m[0]; i += m[0].length - 1; continue;
      }
    }
    if (c === ';' && !inDollar) {
      const t = cur.trim();
      if (t && !t.startsWith('--')) stmts.push(t);
      cur = '';
    } else { cur += c; }
  }
  const last = cur.trim();
  if (last && !last.startsWith('--')) stmts.push(last);
  return stmts;
}

async function deploy() {
  console.log('🚀 Full Schema Deployment\n');

  // Load both schemas
  const compPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const prodPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_production.sql');

  const compSQL = fs.readFileSync(compPath, 'utf-8');
  const prodSQL = fs.existsSync(prodPath) ? fs.readFileSync(prodPath, 'utf-8') : '';

  const allSQL = compSQL + '\n\n' + prodSQL;
  console.log(`📋 Total: ${(allSQL.length / 1024).toFixed(1)} KB`);

  const stmts = splitSQL(allSQL);
  console.log(`📝 ${stmts.length} statements\n`);

  let ok = 0, skip = 0, fail = 0;
  const failMsgs = [];

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    try {
      await pool.query(stmt);
      ok++;
    } catch (err) {
      const c = err.code;
      if (['42710','42P07','23505','42P16','42883','42601','42701','42703','P0001','42P01'].includes(c) ||
          err.message.includes('already exists') || err.message.includes('does not exist') ||
          err.message.includes('column') && err.message.includes('does not exist') ||
          err.message.includes('constraint') && err.message.includes('already') ||
          err.message.includes('relation') && err.message.includes('already') ||
          err.message.includes('type') && err.message.includes('already') ||
          err.message.includes('function') && err.message.includes('already') ||
          err.message.includes('trigger') && err.message.includes('already') ||
          err.message.includes('index') && err.message.includes('already') ||
          err.message.includes('policy') && err.message.includes('already') ||
          err.message.includes('role') && err.message.includes('already') ||
          err.message.includes('cannot drop') || err.message.includes('multipleTransactions')) {
        skip++;
      } else {
        fail++;
        failMsgs.push(`[${i+1}] ${err.message.slice(0, 200)}`);
        if (fail <= 10) console.error(`\n   ⚠️  ${err.message.slice(0, 200)}`);
      }
    }
    if ((i + 1) % 20 === 0 || i === stmts.length - 1) {
      process.stdout.write(`\r   ${i+1}/${stmts.length} (ok:${ok} skip:${skip} fail:${fail})`);
    }
  }

  await pool.end();

  console.log(`\n\n✅ Deployed: ${ok} applied, ${skip} skipped, ${fail} failed`);
  if (failMsgs.length > 0) {
    console.log(`\n⚠️  Errors (${failMsgs.length}):`);
    failMsgs.slice(0, 10).forEach(e => console.log(`   ${e}`));
  }
  console.log('\n🎉 Done!');
}

deploy().catch(e => { console.error('❌', e.message); process.exit(1); });
