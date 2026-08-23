import pg from 'pg';
import { readFileSync } from 'fs';

const envPath = 'G:\\App25\\unionministry1\\.env';
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
} catch (e) { console.error('No .env'); }

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const tables = [
  'risk_assessments', 'compliance_matrices', 'maturity_assessments',
  'commercial_establishments', 'enterprise_occupation_links', 'entity_relationships',
  'worker_reduction_requests', 'labor_disputes', 'expatriate_licenses',
  'evaluation_certificates', 'services', 'isic4_classifications',
];

async function migrate() {
  for (const table of tables) {
    try {
      // Check if column exists
      const check = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'deleted_at'`,
        [table]
      );
      if (check.rows.length === 0) {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMPTZ`);
        await pool.query(`ALTER TABLE ${table} ADD COLUMN deleted_by UUID`);
        await pool.query(`CREATE INDEX idx_${table}_deleted ON ${table}(deleted_at) WHERE deleted_at IS NOT NULL`);
        console.log(`Added deleted_at to ${table}`);
      } else {
        console.log(` ${table} already has deleted_at`);
      }
    } catch (e) {
      console.error(`Error on ${table}:`, e.message);
    }
  }
  await pool.end();
  console.log('\nMigration complete!');
}

migrate();
