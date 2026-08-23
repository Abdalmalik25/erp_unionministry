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
  statement_timeout: 30000,
  query_timeout: 30000,
});

async function main() {
  // Check legal_form enum values
  console.log('legal_form enum values:');
  const r1 = await pool.query(`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typname = 'legal_form' ORDER BY e.enumsortorder`);
  for (const row of r1.rows) console.log(`  ${row.enumlabel}`);

  // Check isic4_classifications level check constraint
  console.log('\nisic4_classifications level check constraint:');
  const r2 = await pool.query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'isic4_classifications'::regclass AND conname LIKE '%level%'`);
  for (const row of r2.rows) console.log(`  ${row.pg_get_constraintdef}`);

  await pool.end();
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
