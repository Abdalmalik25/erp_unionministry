import { readFileSync } from 'fs';
const lines = readFileSync('.env', 'utf-8').split('\n');
const urlLine = lines.find(l => l.startsWith('DATABASE_URL='));
const url = urlLine.split('=').slice(1).join('=');
const { default: pg } = await import('pg');
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const tables = [
  'members', 'activities', 'documents', 'violations', 'inspections',
  'licenses', 'training_records', 'worker_profiles', 'fee_payments',
  'worker_dispatches', 'board_members', 'elections', 'service_requests',
  'compliance_alerts', 'notifications', 'professions',
];

let added = 0;
for (const t of tables) {
  try {
    const check = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name='deleted_at'`, [t]
    );
    if (check.rows.length === 0) {
      await pool.query(`ALTER TABLE ${t} ADD COLUMN deleted_at TIMESTAMPTZ`);
      await pool.query(`ALTER TABLE ${t} ADD COLUMN deleted_by UUID`);
      console.log(`OK: ${t} — added deleted_at, deleted_by`);
      added++;
    } else {
      console.log(`SKIP: ${t} — already has deleted_at`);
    }
  } catch (e) {
    console.log(`ERROR: ${t} — ${e.message}`);
  }
}
console.log(`\nDone. Added soft deletes to ${added} tables.`);
await pool.end();
