// scripts/_probe_db.mjs — Quick probe of real DB schema
import '../server/lib/loadEnv.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const QUERIES = {
  isic4_columns: `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'isic4_classifications'
    ORDER BY ordinal_position`,
  isic4_sample: `SELECT * FROM isic4_classifications LIMIT 5`,
  isic4_count: `SELECT COUNT(*)::int AS n FROM isic4_classifications`,
  prof_columns: `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'professions'
    ORDER BY ordinal_position`,
  prof_sample: `SELECT * FROM professions LIMIT 3`,
  eel_columns: `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'enterprise_evaluation_levels'
    ORDER BY ordinal_position`,
  eel_all: `SELECT * FROM enterprise_evaluation_levels ORDER BY level`,
  insp_columns: `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'inspections'
    ORDER BY ordinal_position`,
  insp_sample: `SELECT * FROM inspections LIMIT 3`,
  haz_columns: `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'hazardous_occupations'
    ORDER BY ordinal_position`,
  haz_count: `SELECT COUNT(*)::int AS n FROM hazardous_occupations`,
  eval_fw_exists: `
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='evaluation_frameworks') AS ok`,
  eval_fw_cols: `
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name='evaluation_frameworks' ORDER BY ordinal_position`,
  fw_dim_exists: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='framework_dimensions') AS ok`,
  fw_ind_exists: `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='framework_indicators') AS ok`,
  eol_count: `SELECT COUNT(*)::int AS n FROM enterprise_occupation_links`,
  eol_columns: `
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name='enterprise_occupation_links' ORDER BY ordinal_position`,
  eol_sample: `SELECT * FROM enterprise_occupation_links LIMIT 3`,
  sector_count: `SELECT COUNT(*)::int AS n FROM sectors`,
  sector_sample: `SELECT * FROM sectors LIMIT 3`,
  occ_count: `SELECT COUNT(*)::int AS n FROM occupations`,
};

for (const [name, sql] of Object.entries(QUERIES)) {
  try {
    const r = await pool.query(sql);
    console.log(`\n=== ${name} ===`);
    if (Array.isArray(r.rows) && r.rows.length > 0 && typeof r.rows[0] === 'object') {
      const cols = Object.keys(r.rows[0]);
      console.log('columns:', cols.join(','));
      for (const row of r.rows) {
        console.log(JSON.stringify(row, null, 0));
      }
    } else {
      console.log(JSON.stringify(r.rows));
    }
  } catch (e) {
    console.log(`\n=== ${name} ERROR: ${e.message} ===`);
  }
}

await pool.end();
