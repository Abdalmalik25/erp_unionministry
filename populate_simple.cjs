const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function populate() {
  try {
    // truncate first to start fresh
    await pool.query('TRUNCATE TABLE profession_applicability CASCADE');
    console.log('Table truncated');

    // Get all active professions (limit for this run)
    const profs = await pool.query(`SELECT id, name_ar, hazard_level FROM professions WHERE is_active = true LIMIT 200`);
    const ents = await pool.query(`SELECT entity_id FROM organizational_entities WHERE status = 'active' LIMIT 30`);
    const acts = await pool.query(`SELECT id, activity_name FROM activities WHERE deleted_at IS NULL LIMIT 5`);

    const profsData = profs.rows;
    const entsData = ents.rows;
    const actsData = acts.rows;

    console.log(`Professions: ${profsData.length}, Enterprises: ${entsData.length}, Activities: ${actsData.length}`);

    let totalCreated = 0;
    const seen = new Set();

    for (const prof of profsData) {
      // Get first 3 enterprises for this profession
      const entsForProf = entsData.slice(0, 3);

      // Get first 2 activities
      const actsForProf = actsData.slice(0, 2);

      for (const ent of entsForProf) {
        for (const actId of actsForProf.map(a => a.id)) {
          // Create unique key: profession_id-enterprise_id-activity_id-standard_version
          const key = `${prof.id}-${ent.entity_id}-${actId}-v1`;
          if (seen.has(key)) continue;
          seen.add(key);

          try {
            await pool.query(
              `INSERT INTO profession_applicability (id, profession_id, enterprise_id, activity_id, standard_version, is_active, risk_level, inspection_frequency) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
              [prof.id, ent.entity_id, actId, 'v1.0', true, prof.hazard_level || 'medium', 'annual']
            );
            totalCreated++;
          } catch (e) {
            // Skip duplicates silently
          }
        }
      }
    }

    console.log(`Created: ${totalCreated} unique rows`);

    const count = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log(`Total rows in table: ${count.rows[0].cnt}`);

    // Show sample
    const sample = await pool.query(`
      SELECT pa.*, p.name_ar as prof_name, e.entity_id as ent_id, a.activity_name as act_name
      FROM profession_applicability pa
      JOIN professions p ON pa.profession_id = p.id
      JOIN organizational_entities e ON pa.enterprise_id = e.entity_id
      JOIN activities a ON pa.activity_id = a.id
      LIMIT 10
    `);
    console.log('Sample entries:');
    sample.rows.forEach(row => {
      console.log(`  - ${row.prof_name} → Ent${row.ent_id} | ${row.act_name} | ${row.risk_level}`);
    });

    await pool.end();
  } catch (err) {
    console.error('Population Error:', err);
  }
}

populate();