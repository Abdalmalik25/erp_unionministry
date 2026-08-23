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

async function test() {
  console.log('Testing CREATE TABLE...');
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS test_deploy (id serial primary key, name text)');
    console.log('OK: table created');
    await pool.query('DROP TABLE test_deploy');
    console.log('OK: table dropped');
  } catch(e) {
    console.error('Error:', e.message);
  }
  
  // Check what the migration is actually doing
  console.log('\nChecking schema_comprehensive.sql parsing...');
  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Count CREATE TABLE statements
  const createTableCount = (schema.match(/CREATE TABLE /g) || []).length;
  console.log('CREATE TABLE statements in schema:', createTableCount);
  
  // Count tables in database
  const tables = await pool.query("SELECT COUNT(*) as count FROM pg_tables WHERE schemaname='public'");
  console.log('Tables currently in database:', tables.rows[0].count);
  
  await pool.end();
}

test().catch(e => { console.error('Error:', e.message); process.exit(1); });
