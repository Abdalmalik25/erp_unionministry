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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  statement_timeout: 30000,
});

async function main() {
  const r = await pool.query(`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns
    WHERE table_name = 'professions' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log('professions columns:');
  for (const c of r.rows) {
    console.log(`  ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'} ${c.column_default ? 'DEFAULT: ' + c.column_default : ''}`);
  }
  await pool.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
