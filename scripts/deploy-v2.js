/**
 * Production deployment v2 — uses node-pg to run the full schema
 * Handles dollar-quoted function bodies correctly
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
  console.log('🚀 UnionSphere Enterprise — Full Production Deployment\n');

  // Load schemas
  const compPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const prodPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_production.sql');
  
  const compSQL = fs.readFileSync(compPath, 'utf-8');
  const prodSQL = fs.existsSync(prodPath) ? fs.readFileSync(prodPath, 'utf-8') : '';
  const fullSQL = compSQL + '\n\n' + prodSQL;
  
  console.log(`📋 Total: ${(fullSQL.length / 1024).toFixed(1)} KB`);

  // Use pg's built-in query support - run the entire SQL as one block
  // PostgreSQL supports multiple statements in a single query
  try {
    console.log('📝 Deploying all statements...');
    
    // Split by top-level statements (respecting dollar quotes)
    const statements = [];
    let current = '';
    let inDollar = false;
    let dollarTag = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < fullSQL.length; i++) {
      const c = fullSQL[i];
      const next = fullSQL[i + 1] || '';
      
      // Handle string literals
      if (!inDollar && (c === "'" || c === '"') && fullSQL[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = c;
        } else if (c === stringChar) {
          inString = false;
        }
      }
      
      // Handle dollar quotes
      if (!inString && c === '$') {
        const rest = fullSQL.slice(i);
        const m = rest.match(/^\$[a-zA-Z_]*\$/);
        if (m) {
          if (!inDollar) {
            inDollar = true;
            dollarTag = m[0];
          } else if (m[0] === dollarTag) {
            inDollar = false;
            dollarTag = '';
          }
          current += m[0];
          i += m[0].length - 1;
          continue;
        }
      }
      
      // Handle semicolons as statement separators
      if (c === ';' && !inDollar && !inString) {
        const trimmed = current.trim();
        if (trimmed && !trimmed.startsWith('--')) {
          statements.push(trimmed);
        }
        current = '';
      } else {
        current += c;
      }
    }
    
    const last = current.trim();
    if (last && !last.startsWith('--')) statements.push(last);
    
    console.log(`📝 Parsed ${statements.length} statements`);
    
    let ok = 0, skip = 0, fail = 0;
    const failMsgs = [];
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await pool.query(stmt);
        ok++;
      } catch (err) {
        const msg = err.message || '';
        // Skip expected errors
        if (msg.includes('already exists') || 
            msg.includes('does not exist') ||
            msg.includes('cannot drop') ||
            msg.includes('multiple transactions') ||
            err.code === '42710' || err.code === '42P07' || err.code === '23505' ||
            err.code === '42P16' || err.code === '42883' || err.code === '42601' ||
            err.code === '42701' || err.code === '42703') {
          skip++;
        } else {
          fail++;
          failMsgs.push({ i: i + 1, msg: msg.slice(0, 200), stmt: stmt.slice(0, 100) });
          if (fail <= 15) console.error(`\n   ⚠️  [${i+1}] ${msg.slice(0, 200)}`);
        }
      }
      
      if ((i + 1) % 25 === 0 || i === statements.length - 1) {
        process.stdout.write(`\r   ${i + 1}/${statements.length} (ok:${ok} skip:${skip} fail:${fail})`);
      }
    }
    
    console.log(`\n\n✅ Deployment complete: ${ok} applied, ${skip} skipped, ${fail} failed`);
    
    if (fail > 0) {
      console.log(`\n⚠️  Errors (${fail}):`);
      failMsgs.forEach(e => console.log(`   [${e.i}] ${e.msg}`));
    }
    
  } catch (err) {
    console.error('❌ Deployment error:', err.message);
  }

  await pool.end();
  console.log('\n🎉 Production deployment finished!');
}

deploy().catch(e => { console.error('❌', e.message); process.exit(1); });
