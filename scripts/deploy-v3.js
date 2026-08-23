/**
 * Production deployment v3 — efficient batch deployment
 * Uses smaller batches and reconnection
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

function createPool() {
  return new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  });
}

function splitSQL(sql) {
  const stmts = [];
  let cur = '', inDollar = false, dTag = '', inString = false, strCh = '';
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (!inDollar && (c === "'" || c === '"') && sql[i - 1] !== '\\') {
      if (!inString) { inString = true; strCh = c; }
      else if (c === strCh) { inString = false; }
    }
    if (!inString && c === '$') {
      const m = sql.slice(i).match(/^\$[a-zA-Z_]*\$/);
      if (m) {
        if (!inDollar) { inDollar = true; dTag = m[0]; }
        else if (m[0] === dTag) { inDollar = false; dTag = ''; }
        cur += m[0]; i += m[0].length - 1; continue;
      }
    }
    if (c === ';' && !inDollar && !inString) {
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
  console.log('🚀 UnionSphere Enterprise — Production Deployment v3\n');

  const compPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const prodPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_production.sql');
  
  const compSQL = fs.readFileSync(compPath, 'utf-8');
  const prodSQL = fs.existsSync(prodPath) ? fs.readFileSync(prodPath, 'utf-8') : '';
  const fullSQL = compSQL + '\n\n' + prodSQL;
  
  const stmts = splitSQL(fullSQL);
  console.log(`📝 ${stmts.length} statements to deploy\n`);

  let ok = 0, skip = 0, fail = 0;
  const BATCH_SIZE = 10;
  
  for (let batch = 0; batch < stmts.length; batch += BATCH_SIZE) {
    const chunk = stmts.slice(batch, batch + BATCH_SIZE);
    let pool;
    
    try {
      pool = createPool();
      const client = await pool.connect();
      
      try {
        for (const stmt of chunk) {
          try {
            await client.query(stmt);
            ok++;
          } catch (err) {
            const msg = err.message || '';
            if (msg.includes('already exists') || msg.includes('does not exist') ||
                msg.includes('cannot drop') || msg.includes('multiple') ||
                ['42710','42P07','23505','42P16','42883','42601','42701','42703'].includes(err.code)) {
              skip++;
            } else {
              fail++;
              if (fail <= 10) console.error(`   ⚠️  [${batch + chunk.indexOf(stmt) + 1}] ${msg.slice(0, 150)}`);
            }
          }
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`   ❌ Batch ${Math.floor(batch/BATCH_SIZE) + 1} connection error: ${err.message.slice(0, 100)}`);
      fail += chunk.length;
    } finally {
      if (pool) await pool.end().catch(() => {});
    }
    
    const pct = Math.round(((batch + chunk.length) / stmts.length) * 100);
    process.stdout.write(`\r   ${batch + chunk.length}/${stmts.length} (${pct}%) ok:${ok} skip:${skip} fail:${fail}`);
  }

  console.log(`\n\n✅ Complete: ${ok} applied, ${skip} skipped, ${fail} failed`);
  console.log('\n🎉 Done!');
}

deploy().catch(e => { console.error('❌', e.message); process.exit(1); });
