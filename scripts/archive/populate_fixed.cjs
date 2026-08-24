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
    // truncate first
    await pool.query('TRUNCATE TABLE profession_applicability CASCADE');
    console.log('Table truncated');

    const profs = await pool.query(`SELECT id, name_ar, hazard_level, is_active FROM professions WHERE is_active = true LIMIT 100`);
    const ents = await pool.query(`SELECT entity_id, sector FROM organizational_entities WHERE status = 'active' LIMIT 20`);
    const acts = await pool.query(`SELECT id, activity_name FROM activities WHERE deleted_at IS NULL LIMIT 10`);

    let created = 0;
    const errors = [];

    for (const prof of profs.rows) {
      // Link to enterprises in same sector, or all if sector null
      const matchingEnts = ents.rows.filter(e =>
        (!prof.sector || e.sector === prof.sector) && e.sector
      ).slice(0, 3);

      const actIds = acts.rows.slice(0, 2).map(a => a.id);

      for (const ent of matchingEnts) {
        for (const actId of actIds) {
          try {
            await pool.query(
              `INSERT INTO profession_applicability (id, profession_id, enterprise_id, activity_id, standard_version, is_active, risk_level, inspection_frequency) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
              [prof.id, ent.entity_id, actId, 'v1.0', true, prof.hazard_level || 'medium', 'annual']
            );
            created++;
          } catch (e) {
            errors.push({ profession: prof.name_ar, enterprise: ent.entity_id, error: e.message.split('\n')[0] });
          }
        }
      }
    }

    console.log(`Created: ${created}, Errors: ${errors.length}`);
    if (errors.length > 0) console.log('Sample errors:', errors.slice(0, 3));

    const count = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log(`Total rows now: ${count.rows[0].cnt}`);

    await pool.end();
  } catch (err) {
    console.error('Population Error:', err);
  }
}

populate();