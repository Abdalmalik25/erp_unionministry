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
  statement_timeout: 60000,
  query_timeout: 60000,
});

// Extract all INSERT statements from the comprehensive schema file
function extractInserts(sqlContent) {
  const inserts = [];
  const lines = sqlContent.split('\n');
  let current = '';
  let inInsert = false;
  
  for (const line of lines) {
    if (line.trim().toUpperCase().startsWith('INSERT INTO')) {
      inInsert = true;
      current = line;
    } else if (inInsert) {
      current += '\n' + line;
    }
    
    if (inInsert && line.trim().endsWith(';')) {
      inserts.push(current.trim());
      current = '';
      inInsert = false;
    }
  }
  
  if (inInsert && current.trim()) {
    inserts.push(current.trim());
  }
  
  return inserts;
}

// Add ON CONFLICT DO NOTHING to each INSERT
function addConflictHandling(sql) {
  if (sql.toUpperCase().includes('ON CONFLICT')) return sql;
  
  // Find the VALUES clause and add ON CONFLICT before the final semicolon
  const lastSemicolon = sql.lastIndexOf(';');
  if (lastSemicolon === -1) return sql;
  
  const before = sql.slice(0, lastSemicolon);
  const after = sql.slice(lastSemicolon);
  
  // Simple approach: add DO NOTHING after the last closing paren
  return before + ' ON CONFLICT DO NOTHING' + after;
}

async function main() {
  console.log('=== Seeding Cloud Database from Comprehensive Schema ===\n');

  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const inserts = extractInserts(content);
  
  console.log(`Found ${inserts.length} INSERT statements\n`);

  let ok = 0, skip = 0, fail = 0;

  for (let i = 0; i < inserts.length; i++) {
    const raw = inserts[i];
    // Extract table name for logging
    const tableMatch = raw.match(/INSERT INTO\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1] : `unknown_${i}`;
    
    const sql = addConflictHandling(raw);
    
    try {
      const result = await pool.query(sql);
      const rows = result.rowCount || 0;
      console.log(`  OK: ${tableName} (${rows} rows)`);
      ok++;
    } catch (err) {
      const msg = err.message;
      if (msg.includes('does not exist')) {
        console.log(`  SKIP: ${tableName} (table not in cloud)`);
        skip++;
      } else if (msg.includes('duplicate key') || msg.includes('UNIQUE') || msg.includes('already exists')) {
        console.log(`  SKIP: ${tableName} (data exists)`);
        skip++;
      } else {
        console.log(`  FAIL: ${tableName} -> ${msg.slice(0, 150)}`);
        fail++;
      }
    }
  }

  console.log(`\n=== Result: ${ok} OK, ${skip} skipped, ${fail} failed ===`);
  await pool.end();
  console.log('Done.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
