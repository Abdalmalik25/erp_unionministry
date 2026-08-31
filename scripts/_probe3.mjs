// scripts/_probe3.mjs — Find tables & counts
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
    (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL) AS entities_active,
    (SELECT COUNT(*)::int FROM violations WHERE deleted_at IS NULL) AS violations_active
`);
console.log('COUNTS:', JSON.stringify(r.rows[0], null, 2));

// Find worker-like tables
const t = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name ILIKE '%worker%'
  ORDER BY table_name
`);
console.log('\nWorker tables:', t.rows.map(r => r.table_name));

// Find member-like tables
const m = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name ILIKE '%member%'
  ORDER BY table_name
`);
console.log('Member tables:', m.rows.map(r => r.table_name));

// Sample all tables with 1+ rows
const all = await pool.query(`
  SELECT t.table_name,
         (xpath('/row/cnt/text()', xml_count))[1]::text::int AS cnt
  FROM (
    SELECT table_name, query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name), false, true, '') AS xml_count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  ) t
  WHERE (xpath('/row/cnt/text()', xml_count))[1]::text::int > 0
  ORDER BY cnt DESC
  LIMIT 50
`).catch(e => ({ rows: [], error: e.message }));
console.log('\nAll tables with data:');
for (const row of all.rows) console.log('  ', row.table_name, '=', row.cnt);

const eel = await pool.query(`SELECT * FROM enterprise_evaluation_levels LIMIT 10`);
console.log('\n=== enterprise_evaluation_levels ===');
console.log(JSON.stringify(eel.rows, null, 2));

await pool.end();
