// scripts/_probe2.mjs — Focused schema probe
import '../server/lib/loadEnv.js';
import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const r = await pool.query(`
  SELECT
    (SELECT COUNT(*)::int FROM isic4_classifications WHERE deleted_at IS NULL) AS isic4_active,
    (SELECT COUNT(*)::int FROM isic4_classifications) AS isic4_total,
    (SELECT COUNT(*)::int FROM professions WHERE deleted_at IS NULL) AS prof_active,
    (SELECT COUNT(*)::int FROM professions) AS prof_total,
    (SELECT COUNT(*)::int FROM enterprise_evaluation_levels) AS eel_total,
    (SELECT COUNT(*)::int FROM inspections WHERE deleted_at IS NULL) AS insp_active,
    (SELECT COUNT(*)::int FROM inspections) AS insp_total,
    (SELECT COUNT(*)::int FROM workers WHERE deleted_at IS NULL) AS workers_active,
    (SELECT COUNT(*)::int FROM workers) AS workers_total,
    (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL) AS entities_active,
    (SELECT COUNT(*)::int FROM violations WHERE deleted_at IS NULL) AS violations_active
`);
console.log('COUNTS:', JSON.stringify(r.rows[0], null, 2));

const cols = await pool.query(`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('professions','enterprise_evaluation_levels','inspections','isic4_classifications','workers','organizational_entities','enterprise_occupation_links')
    AND table_schema = 'public'
  ORDER BY table_name, ordinal_position
`);
fs.writeFileSync('scripts/_schema_dump.json', JSON.stringify(cols.rows, null, 2));
console.log('Schema dump written to scripts/_schema_dump.json');

const eel = await pool.query(`SELECT * FROM enterprise_evaluation_levels LIMIT 10`);
console.log('\n=== enterprise_evaluation_levels ===');
console.log(JSON.stringify(eel.rows, null, 2));

await pool.end();
