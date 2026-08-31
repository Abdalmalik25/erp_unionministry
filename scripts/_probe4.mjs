// scripts/_probe4.mjs — Final focused probe
import '../server/lib/loadEnv.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const queries = {
  prof_columns: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='professions' ORDER BY ordinal_position`,
  prof_sample: `SELECT * FROM professions LIMIT 2`,
  prof_sector_dist: `SELECT sector, COUNT(*)::int AS n FROM professions WHERE deleted_at IS NULL GROUP BY sector ORDER BY n DESC`,
  prof_isco_dist: `SELECT major_group_code, COUNT(*)::int AS n FROM professions WHERE deleted_at IS NULL GROUP BY major_group_code ORDER BY major_group_code`,
  prof_yemen: `SELECT yemenization_priority, COUNT(*)::int AS n FROM professions WHERE deleted_at IS NULL GROUP BY yemenization_priority`,
  worker_profiles_cols: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='worker_profiles' ORDER BY ordinal_position`,
  worker_profiles_sample: `SELECT * FROM worker_profiles LIMIT 2`,
  worker_profiles_count: `SELECT COUNT(*)::int AS n FROM worker_profiles`,
  worker_registry_cols: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='worker_registry' ORDER BY ordinal_position`,
  worker_registry_count: `SELECT COUNT(*)::int AS n FROM worker_registry`,
  entities_cols: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='organizational_entities' ORDER BY ordinal_position`,
  entities_count: `SELECT COUNT(*)::int AS n FROM organizational_entities`,
  members_count: `SELECT COUNT(*)::int AS n FROM members`,
  members_cols: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='members' ORDER BY ordinal_position LIMIT 30`,
  professions_has_min_salary: `SELECT column_name FROM information_schema.columns WHERE table_name='professions' AND column_name IN ('min_salary','avg_salary','salary_range','typical_salary')`,
  service_catalog_sample: `SELECT * FROM service_catalog LIMIT 1`,
  system_settings_all: `SELECT key, value FROM system_settings LIMIT 20`,
};

for (const [name, sql] of Object.entries(queries)) {
  try {
    const r = await pool.query(sql);
    console.log(`\n=== ${name} ===`);
    if (r.rows.length === 0) { console.log('(empty)'); continue; }
    for (const row of r.rows) console.log(JSON.stringify(row));
  } catch (e) {
    console.log(`\n=== ${name} ERROR: ${e.message} ===`);
  }
}

await pool.end();
