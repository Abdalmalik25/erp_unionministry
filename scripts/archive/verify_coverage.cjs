const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Check row count
    const cntRes = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log('Total rows in profession_applicability:', cntRes.rows[0].cnt);
    
    // Check profession coverage
    const profRes = await pool.query('SELECT COUNT(DISTINCT profession_id) as prof_covered FROM profession_applicability');
    console.log('Professions covered:', profRes.rows[0].prof_covered);
    
    // Check enterprise coverage
    const entRes = await pool.query('SELECT COUNT(DISTINCT enterprise_id) as ent_covered FROM profession_applicability');
    console.log('Enterprises covered:', entRes.rows[0].ent_covered);
    
    // Check activity coverage
    const actRes = await pool.query('SELECT COUNT(DISTINCT activity_id) as act_covered FROM profession_applicability');
    console.log('Activities covered:', actRes.rows[0].act_covered);
    
    // Show sample with names
    const sampleRes = await pool.query(`
      SELECT pa.*, p.name_ar as prof_name, e.name_ar as ent_name, a.activity_name_ar as act_name
      FROM profession_applicability pa
      JOIN professions p ON pa.profession_id = p.id
      JOIN organizational_entities e ON pa.enterprise_id = e.entity_id
      JOIN activities a ON pa.activity_id = a.id
      LIMIT 5
    `);
    console.log('\\nSample entries:');
    sampleRes.rows.forEach(row => {
      console.log(' -', row.prof_name, '->', row.ent_name, '|', row.act_name);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();