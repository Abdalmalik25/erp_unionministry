const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function populateApplicability() {
  try {
    console.log('=== Populating profession_applicability table ===\n');

    // 1. Get all active professions
    console.log('1. Fetching active professions...');
    const profsRes = await pool.query(`SELECT * FROM professions WHERE is_active = true`);
    const professions = profsRes.rows;
    console.log(`   Found ${professions.length} active professions`);

    // 2. Get all active enterprises
    console.log('2. Fetching active enterprises...');
    const entsRes = await pool.query(`SELECT * FROM organizational_entities WHERE status = 'active'`);
    const enterprises = entsRes.rows;
    console.log(`   Found ${enterprises.length} active enterprises`);

    // 3. Get all activities
    console.log('3. Fetching activities...');
    const actsRes = await pool.query(`SELECT * FROM activities WHERE deleted_at IS NULL`);
    const activities = actsRes.rows;
    console.log(`   Found ${activities.length} activities`);

    // 4. Build activity lookup by keywords (for matching professions to activities)
    console.log('4. Building activity keyword map...');
    const activityMap = new Map();
    activities.forEach(a => {
      const keywords = [
        a.activity_name_ar,
        a.activity_name_en,
        a.description_ar,
        a.description_en
      ].filter(k => k && k.length > 0);
      keywords.forEach(k => {
        if (!activityMap.has(k)) activityMap.set(k, []);
        activityMap.get(k).push(a.id);
      });
    });
    console.log(`   Built map with ${activityMap.size} unique keywords`);

    // 5. For each profession, find matching enterprises (by sector) and activities (by keywords/hazards)
    let totalCreated = 0;
    const createdEntries = new Set();

    for (const prof of professions) {
      console.log(`   Processing: ${prof.name_ar} (${prof.isco_code}) - Sector: ${prof.sector}`);

      // Find enterprises in same sector
      const sectorMatchEnterprises = enterprises.filter(e =>
        e.sector && prof.sector && 
        (e.sector.includes(prof.sector) || prof.sector.includes(e.sector))
      );

      // Find matching activities using keyword map
      const matchingActivities = new Set();
      const profKeywords = [
        prof.name_ar,
        prof.name_en,
        prof.description_ar,
        prof.hazard_level,
        prof.isco_code
      ].filter(k => k && k.length > 0);

      for (const kw of profKeywords) {
        const matchingIds = activityMap.get(kw) || [];
        matchingIds.forEach(id => matchingActivities.add(id));
      }

      // Also match by hazard level
      if (prof.hazard_level) {
        activities.forEach(a => {
          if (a.description_ar && a.description_ar.includes(prof.hazard_level)) {
            matchingActivities.add(a.id);
          }
          if (a.description_en && a.description_en.includes(prof.hazard_level)) {
            matchingActivities.add(a.id);
          }
        });
      }

      // Create applicability entries: up to 4 enterprises × 3 activities each
      const enterprisesForProf = sectorMatchEnterprises.slice(0, 4);
      const activitiesArray = Array.from(matchingActivities).slice(0, 3);

      for (const ent of enterprisesForProf) {
        for (const actId of activitiesArray) {
          // Check if already created (unique constraint: profession_id + enterprise_id + activity_id + standard_version)
          const key = `${prof.id}-${ent.entity_id}-${actId}-v1.0`;
          if (createdEntries.has(key)) continue;
          createdEntries.add(key);

          // INSERT without id column - let DEFAULT gen_random_uuid() handle it
          // Provide the required NOT NULL columns and let others use their defaults
          await pool.query(
            `INSERT INTO profession_applicability 
            (profession_id, enterprise_id, activity_id, standard_version, is_active, risk_level, inspection_frequency)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              prof.id,           // profession_id (UUID, NOT NULL)
              ent.entity_id,     // enterprise_id (UUID, NOT NULL)
              actId,             // activity_id (UUID, can be null - but we have values)
              'v1.0',            // standard_version (VARCHAR, NOT NULL DEFAULT 'v1.0')
              true,              // is_active (BOOLEAN, DEFAULT true)
              prof.hazard_level || 'medium',  // risk_level (VARCHAR, DEFAULT 'medium')
              'annual'           // inspection_frequency (VARCHAR, DEFAULT 'annual')
            ]
          );
          totalCreated++;
        }
      }
    }

    console.log(`\n=== Population Complete ===`);
    console.log(`Total applicability entries created: ${totalCreated}`);

    // 6. Verification
    console.log('\n=== Verification ===');
    const countRes = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log(`profession_applicability row count: ${countRes.rows[0].cnt}`);

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
      console.log(`  - ${row.profession_name} → ${row.enterprise_name} | ${row.activity_name} | ${row.risk_level} | ${row.inspection_frequency}`);
    });

    // Check coverage
    const profCovered = await pool.query(`
      SELECT COUNT(DISTINCT profession_id) as covered FROM profession_applicability
    `);
    console.log(`Professions covered: ${profCovered.rows[0].covered} out of ${professions.length} (${((profCovered.rows[0].covered/professions.length)*100).toFixed(1)}%)`);

    const entCovered = await pool.query(`
      SELECT COUNT(DISTINCT enterprise_id) as covered FROM profession_applicability
    `);
    console.log(`Enterprises covered: ${entCovered.rows[0].covered} out of ${enterprises.length} (${((entCovered.rows[0].covered/enterprises.length)*100).toFixed(1)}%)`);

    // Verify unique constraint
    const uniqueCheck = await pool.query(`
      SELECT COUNT(*) as total, COUNT(DISTINCT profession_id || '-' || enterprise_id || '-' || activity_id || '-' || standard_version) as unique_count
      FROM profession_applicability
    `);
    console.log(`Unique constraint check: ${uniqueCheck.rows[0].total} total rows, ${uniqueCheck.rows[0].unique_count} unique combinations`);

  } catch (err) {
    console.error('Population Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

populateApplicability();