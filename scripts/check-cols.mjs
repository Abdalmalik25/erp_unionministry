import { readFileSync } from 'fs';
const lines = readFileSync('.env', 'utf-8').split('\n');
const urlLine = lines.find(l => l.startsWith('DATABASE_URL='));
const url = urlLine.split('=').slice(1).join('=');

const { default: pg } = await import('pg');
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const tables = ['organizational_entities', 'expatriate_licenses', 'labor_disputes', 'commercial_establishments'];
for (const t of tables) {
  const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`, [t]);
  console.log(`=== ${t} ===`);
  r.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
}
await pool.end();
