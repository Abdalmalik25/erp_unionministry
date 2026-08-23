import { readFileSync } from 'fs';
const lines = readFileSync('.env', 'utf-8').split('\n');
const urlLine = lines.find(l => l.startsWith('DATABASE_URL='));
const url = urlLine.split('=').slice(1).join('=');

const { default: pg } = await import('pg');
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const endpoints = [
  'labor-disputes',
  'expatriate-licenses',
  'commercial-establishments',
];

for (const ep of endpoints) {
  const r = await pool.query(`SELECT COUNT(*)::int FROM ${ep === 'expatriate-licenses' ? 'expatriate_licenses' : ep === 'labor-disputes' ? 'labor_disputes' : 'commercial_establishments'}`);
  console.log(`${ep}: ${r.rows[0].count} rows in DB`);
}
await pool.end();
