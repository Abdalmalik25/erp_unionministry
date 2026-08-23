const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function populateApplicabilityBasic() {
  try {
    console.log('=== Basic Population of profession_applicability ===\n');

    // Get ALL active professions
    const profsRes = await pool.query(`SELECT * FROM professions WHERE is_active = true`);
    const professions = profsRes.rows;
    console.log(`Found ${professions.length} active professions`);

    // Get ALL active enterprises
    const entsRes = await pool.query(`SELECT * FROM organizational_entities WHERE status = 'active'`);
    const enterprises = entsRes.rows;
    console.log(`Found ${enterprises.length} active enterprises`);

    // Get ALL activities
    const actsRes = await pool.query(`SELECT * FROM activities WHERE deleted_at IS NULL`);
    const activities = actsRes.rows;
    console.log(`Found ${activities.length} activities`);

    let totalCreated = 0;
    const createdEntries = new Set();

    // Simple strategy: link each profession to enterprises and activities
    for (const prof of professions) {
      // Get first 3 enterprises
      const entsForProf = enterprises.slice(0, 3);
      // Get first 2 activities
      const actsForProf = activities.slice(0, 2);

      for (const ent of entsForProf) {
        for (const actId of actsForProf.map(a => a.id)) {
          // Check unique constraint: profession_id + enterprise_id + activity_id + standard_version
          const key = `${prof.id}-${ent.entity_id}-${actId}-v1.0`;
          if (createdEntries.has(key)) continue;
          createdEntries.add(key);

          // INSERT with explicit gen_random_uuid() for id column
          // Since the table has NOT NULL constraint on id but no working DEFAULT
          await pool.query(
            `INSERT INTO profession_applicability 
            (id, profession_id, enterprise_id, activity_id, standard_version, is_active, risk_level, inspection_frequency)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
            [prof.id, ent.entity_id, actId, 'v1.0', true, prof.hazard_level || 'medium', 'annual']
          );
          totalCreated++;
        }
      }
    }

    console.log(`\nCreated ${totalCreate} applicability entries`);
    console.log(`Unique combinations: ${createdEntries.size}`);

    // Verify
    const countRes = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log(`Total rows in profession_applicability: ${countRes.rows[0].cnt}`);

    // Show sample
    const sampleRes = await pool.query(`
      SELECT pa.*, p.name_ar as profession_name, e.name_ar as enterprise_name, a.activity_name_ar as activity_name
      FROM profession_applicability pa
      JOIN professions p ON pa.profession_id = p.id
      JOIN organizational_entities e ON pa.enterprise_id = e.entity_id
      JOIN activities a ON pa.activity_id = a.id
      LIMIT 10
    `);
    console.log('\nSample entries:');
    sampleRes.rows.forEach(row => {
      console.log(`  - ${row.profession_name} → ${row.enterprise_name} | ${row.activity_name} | ${row.risk_level}`);
    });

    // Coverage percentages
    const profCovered = await pool.query(`
      SELECT COUNT(DISTINCT profession_id) as covered FROM profession_applicability
    `);
    console.log(`Professions covered: ${profCovered.rows[0].covered} out of ${professions.length}`);

    const entCovered = await pool.query(`
      SELECT COUNT(DISTINCT enterprise_id) as covered FROM profession_applicability
    `);
    console.log(`Enterprises covered: ${entCovered.rows[0].covered} out of ${enterprises.length}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

populateApplicabilityBasic();