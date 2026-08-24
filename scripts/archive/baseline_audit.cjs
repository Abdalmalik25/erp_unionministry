const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function baseline() {
  try {
    // 1. Total table count (user tables)
    const tables = await pool.query(`SELECT table_name, table_type FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_name NOT LIKE 'pg_%' ORDER BY table_name`);
    const userTables = tables.rows.filter(t => !t.table_name.startsWith('pg_'));
    console.log('=== USER TABLES ===');
    console.log(`Total user tables: ${userTables.length}`);
    userTables.forEach(t => console.log(`  - ${t.table_name}`));

    // 2. Key tables status
    const keyTables = ['professions', 'inspections', 'evaluation_certificates', 'profession_applicability'];
    console.log('\n=== KEY TABLES STATUS ===');
    for (const t of keyTables) {
      const res = await pool.query(`SELECT COUNT(*) as cnt FROM ${t}`);
      console.log(`  ${t}: ${res.rows[0].cnt} rows`);
    }

    // 3. Professions detail
    console.log('\n=== PROFESSIONS SAMPLE ===');
    const prof = await pool.query(`SELECT id, name_ar, name_en, is_active, status, "performance_standards_version" FROM professions LIMIT 3`);
    prof.rows.forEach(p => console.log(`  - ${p.name_ar} (id: ${p.id.substring(0,8)}...): active=${p.is_active}, status=${p.status}, perf_standards=${p['performance_standards_version']}`));

    // 4. Inspections detail
    console.log('\n=== INSPECTIONS SAMPLE ===');
    const insp = await pool.query(`SELECT id, enterprise_id, inspection_number, overall_score, compliance_status, inspection_type, evaluation_model, evaluation_level FROM inspections LIMIT 3`);
    insp.rows.forEach(i => console.log(`  - ${i.inspection_number}: score=${i.overall_score}, compliance=${i.compliance_status}, type=${i.inspection_type}, model=${i.evaluation_model}, level=${i.evaluation_level}`));

    // 5. Evaluation certificates
    console.log('\n=== EVALUATION CERTIFICATES SAMPLE ===');
    const eval = await pool.query(`SELECT id, certificate_number, overall_score, status, assessed_against_standards, "standard_version", profession_id FROM evaluation_certificates LIMIT 3`);
    eval.rows.forEach(e => console.log(`  - ${e.certificate_number}: score=${e.overall_score}, status=${e.status}, assessed=${e.assessed_against_standards}, std_version=${e['standard_version']}, prof_id=${e.profession_id}`));

    // 6. Profession-applicability
    console.log('\n=== PROFESSION_APPLICABILITY ===');
    const pa = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log(`  Total rows: ${pa.rows[0].cnt}`);

    // 7. Check for orphan data
    console.log('\n=== ORPHAN DATA CHECK ===');
    const orphanInsp = await pool.query(`SELECT COUNT(*) as cnt FROM inspections i WHERE NOT EXISTS (SELECT 1 FROM organizational_entities e WHERE e.entity_id = i.enterprise_id)`);
    console.log(`  Inspections with orphan enterprise_id: ${orphanInsp.rows[0].cnt}`);

    const orphanProf = await pool.query(`SELECT COUNT(*) as cnt FROM professions p WHERE NOT EXISTS (SELECT 1 FROM profession_applicability pa WHERE pa.profession_id = p.id)`);
    console.log(`  Professions with NO applicability: ${orphanProf.rows[0].cnt}`);

    await pool.end();
  } catch (err) {
    console.error('Baseline Error:', err);
  }
}

baseline();