import pg from 'pg';
import { readFileSync } from 'fs';

const env = readFileSync('G:\\App25\\unionministry1\\.env', 'utf8').split('\n');
env.forEach(l => {
  const t = l.trim();
  if (!t || t.startsWith('#')) return;
  const i = t.indexOf('=');
  if (i === -1) return;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!process.env[k]) process.env[k] = v;
});

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

const tables = [
  'organizational_entities', 'members', 'professions', 'violations', 'inspections',
  'activities', 'documents', 'licenses', 'compliance_alerts', 'fee_payments',
  'training_records', 'entity_relationships', 'board_members', 'legal_references'
];

for (const t of tables) {
  try {
    const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${t}' ORDER BY ordinal_position`);
    console.log(t + ': ' + r.rows.map(x => x.column_name).join(', '));
  } catch (e) {
    console.log(t + ': ERROR - ' + e.message);
  }
}

await pool.end();
