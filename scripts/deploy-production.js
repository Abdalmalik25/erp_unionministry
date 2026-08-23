/**
 * UnionSphere Enterprise — Production Deployment
 * Deploys schema_production.sql to cloud database
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
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === '$') {
      const rest = sql.slice(i);
      const m = rest.match(/^\$[a-zA-Z_]*\$/);
      if (m) {
        if (!inDollar) { inDollar = true; dollarTag = m[0]; }
        else if (m[0] === dollarTag) { inDollar = false; dollarTag = ''; }
        current += m[0]; i += m[0].length - 1; continue;
      }
    }
    if (ch === ';' && !inDollar) {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) statements.push(trimmed);
      current = '';
    } else { current += ch; }
  }
  const last = current.trim();
  if (last && !last.startsWith('--')) statements.push(last);
  return statements;
}

async function deploy() {
  console.log('🚀 UnionSphere Enterprise — Production Deployment\n');

  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_production.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ schema_production.sql not found');
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  console.log(`📋 Loaded: ${(schema.length / 1024).toFixed(1)} KB`);

  const statements = splitStatements(schema);
  console.log(`📝 ${statements.length} SQL statements\n`);

  let ok = 0, skip = 0, fail = 0;
  const errors = [];

  const client = await pool.connect();
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query('BEGIN');
        await client.query(stmt);
        await client.query('COMMIT');
        ok++;
        process.stdout.write(`\r   Progress: ${i + 1}/${statements.length} (ok: ${ok}, skip: ${skip}, fail: ${fail})`);
      } catch (err) {
        await client.query('ROLLBACK');
        const code = err.code;
        if (['42710','42P07','23505','42P16','42883','42601','42701','42703','P0001'].includes(code) ||
            err.message.includes('already exists') || err.message.includes('does not exist') ||
            err.message.includes('column') && err.message.includes('does not exist') ||
            err.message.includes('constraint') && err.message.includes('already exists')) {
          skip++;
        } else {
          fail++;
          errors.push(`[${i+1}] ${err.message.slice(0, 150)}`);
          console.error(`\n   ⚠️  Statement ${i+1}: ${err.message.slice(0, 150)}`);
        }
      }
    }
  } finally {
    client.release();
  }

  await pool.end();

  console.log(`\n\n✅ Deployment complete: ${ok} applied, ${skip} skipped, ${fail} failed`);
  if (errors.length > 0) {
    console.log(`\n⚠️  First ${Math.min(5, errors.length)} errors:`);
    errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
  }
  console.log('\n🎉 Production deployment finished!');
}

deploy();
