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
  console.log('Debug: Testing individual CREATE TABLE statements\n');

  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const stmts = splitSQL(schema);

  // Find all CREATE TABLE statements
  const createTableStmts = stmts.filter(s => s.startsWith('CREATE TABLE'));
  console.log('Found', createTableStmts.length, 'CREATE TABLE statements');

  // Try first 3 CREATE TABLE statements
  for (let i = 0; i < Math.min(3, createTableStmts.length); i++) {
    const stmt = createTableStmts[i];
    const tableName = stmt.match(/CREATE TABLE (\w+)/)?.[1] || 'unknown';
    console.log(`\nTrying: ${tableName}`);
    console.log(`SQL (first 200 chars): ${stmt.slice(0, 200)}...`);
    
    try {
      await pool.query(stmt);
      console.log('  Result: SUCCESS');
    } catch (err) {
      console.log('  Result: ERROR -', err.message.slice(0, 200));
    }
  }

  // Check tables now
  const tables = await pool.query("SELECT COUNT(*) as count FROM pg_tables WHERE schemaname='public'");
  console.log('\nTables now:', tables.rows[0].count);

  await pool.end();
}

deploy().catch(e => { console.error('Error:', e.message); process.exit(1); });
