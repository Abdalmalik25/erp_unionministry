const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function populateMinimal() {
  try {
    console.log('=== Minimal Population Test ===\n');

    // VERY LIMITED: just 5 professions, 5 enterprises, test that linking works
    const profsRes = await pool.query(`SELECT * FROM professions WHERE is_active = true LIMIT 5`);
    const professions = profsRes.rows;
    console.log(`${professions.length} professions`);

    const entsRes = await pool.query(`SELECT * FROM organizational_entities WHERE status = 'active' LIMIT 5`);
    const enterprises = entsRes.rows;
    console.log(`${enterprises.length} enterprises`);

    const actsRes = await pool.query(`SELECT * FROM activities WHERE deleted_at IS NULL LIMIT 5`);
    const activities = actsRes.rows;
    console.log(`${activities.length} activities`);

    let totalCreated = 0;

    // Very simple: each profession → first enterprise → first activity
    for (const prof of professions) {
      const ent = enterprises[0]; // first enterprise only
      const act = activities[0];   // first activity only

      await pool.query(
        `INSERT INTO profession_applicability 
        (id, profession_id, enterprise_id, activity_id, standard_version, is_active, risk_level, inspection_frequency)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
        [prof.id, ent.entity_id, act.id, 'v1.0', true, prof.hazard_level || 'medium', 'annual']
      );
      totalCreated++;
      console.log(`  Created: ${prof.name_ar.substring(0, 20)} → ${ent.name_ar.substring(0, 20)}`);
    }

    console.log(`\nCreated ${totalCreated} entries`);

    // Verify
    const countRes = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log(`Total rows: ${countRes.rows[0].cnt}`);

    // Show all
    const allRes = await pool.query(`
      SELECT pa.*, p.name_ar as prof, e.name_ar as ent, a.activity_name_ar as act
      FROM profession_applicability pa
      JOIN professions p ON pa.profession_id = p.id
      JOIN organizational_entities e ON pa.enterprise_id = e.entity_id
      JOIN activities a ON pa.activity_id = a.id
    `);
    console.log('\nAll entries:');
    allRes.rows.forEach(row => {
      console.log(`  - ${row.prof} → ${row.ent} | ${row.act} | ${row.risk_level}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

populateMinimal();