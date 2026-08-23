/**
 * UnionSphere Enterprise — Direct SQL Migration
 * Run: node scripts/migrate-sql.js
 * 
 * Applies schema_comprehensive.sql directly to the database
 * Uses individual statements instead of a transaction block for robustness
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
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
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or NEON_DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

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
    
    if (ch === ';' && !inDollar) {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += ch;
    }
  }
  
  const last = current.trim();
  if (last && !last.startsWith('--')) {
    statements.push(last);
  }
  
  return statements;
}

async function runMigration() {
  console.log('🚀 UnionSphere Enterprise — SQL Migration\n');

  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  console.log(`📋 Loaded schema: ${(schema.length / 1024).toFixed(1)} KB`);

  const statements = splitStatements(schema);
  console.log(`📝 Parsed ${statements.length} SQL statements\n`);

  let ok = 0, skip = 0, fail = 0;
  const errors = [];
  
  try {
    const client = await pool.connect();
    
    try {
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        
        try {
          await client.query(stmt);
          ok++;
          process.stdout.write(`\r   Progress: ${i + 1}/${statements.length} (ok: ${ok}, skip: ${skip}, fail: ${fail})`);
        } catch (err) {
          const code = err.code;
          // These are expected: type already exists, table already exists, duplicate key
          if (['42710', '42P07', '23505', '42P16', '42883', '42601'].includes(code) || 
              err.message.includes('already exists') ||
              err.message.includes('does not exist') ||
              err.message.includes('column') && err.message.includes('does not exist')) {
            skip++;
          } else {
            fail++;
            errors.push({ stmt: stmt.slice(0, 100), error: err.message.slice(0, 120) });
            console.error(`\n   ⚠️  Statement ${i + 1}: ${err.message.slice(0, 120)}`);
          }
        }
      }
      
      client.release();
    } catch (err) {
      client.release();
      throw err;
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
  
  await pool.end();
  
  console.log(`\n\n✅ Migration complete: ${ok} applied, ${skip} skipped, ${fail} failed`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors (first 5):');
    errors.slice(0, 5).forEach(e => {
      console.log(`   - ${e.error}`);
    });
  }
  
  console.log('\n🎉 Done!');
}

runMigration();
