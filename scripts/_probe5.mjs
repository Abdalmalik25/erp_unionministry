// scripts/_probe5.mjs — Final confirmation
import '../server/lib/loadEnv.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const q = {
  prof_sector: `SELECT sector, COUNT(*)::int AS n FROM professions WHERE deleted_at IS NULL AND sector IS NOT NULL GROUP BY sector ORDER BY n DESC`,
  prof_isco: `SELECT major_group_code, major_group_name, COUNT(*)::int AS n FROM professions WHERE deleted_at IS NULL AND major_group_code IS NOT NULL GROUP BY major_group_code, major_group_name ORDER BY major_group_code`,
  prof_yem_pol: `SELECT yemenization_policy, COUNT(*)::int AS n FROM professions WHERE deleted_at IS NULL AND yemenization_policy IS NOT NULL GROUP BY yemenization_policy ORDER BY n DESC LIMIT 20`,
  prof_hazard: `SELECT hazard_level, COUNT(*)::int AS n FROM professions WHERE deleted_at IS NULL GROUP BY hazard_level ORDER BY n DESC`,
  prof_sample: `SELECT name_ar, sector, major_group_code, hazard_level, min_salary, yemenization_policy, training_hours_required FROM professions LIMIT 5`,
  eel_all: `SELECT level_name, level_key, min_score, requirements, benefits FROM enterprise_evaluation_levels`,
  isic4_sectors: `SELECT sector::text, COUNT(*)::int AS n FROM isic4_classifications WHERE deleted_at IS NULL AND sector IS NOT NULL GROUP BY sector ORDER BY n DESC`,
  system_settings: `SELECT * FROM system_settings LIMIT 20`,
};

for (const [name, sql] of Object.entries(q)) {
  try {
    const r = await pool.query(sql);
    console.log(`\n=== ${name} ===`);
    for (const row of r.rows) console.log(JSON.stringify(row));
  } catch (e) {
    console.log(`ERROR ${name}: ${e.message}`);
  }
}

await pool.end();
