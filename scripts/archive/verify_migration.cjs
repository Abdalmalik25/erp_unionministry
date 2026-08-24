const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    // Check profession_applicability table
    const tableRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'profession_applicability'
    `);
    console.log('profession_applicability table exists:', tableRes.rows.length > 0);
    
    // Check new columns on evaluation_certificates
    const colsRes = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'evaluation_certificates' 
      AND column_name IN ('profession_id', 'standard_version', 'assessed_against_standards', 'evaluation_criteria')
      ORDER BY ordinal_position
    `);
    console.log('evaluation_certificates new columns:', colsRes.rows.map(r => r.column_name + ': ' + r.data_type));
    
    // Check new columns on professions
    const profColsRes = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'professions' 
      AND column_name IN ('performance_standards_version', 'standards_effective_from', 'is_active')
      ORDER BY ordinal_position
    `);
    console.log('professions new columns:', profColsRes.rows.map(r => r.column_name + ': ' + r.data_type));
    
    // Count rows in profession_applicability
    const countRes = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log('profession_applicability row count:', countRes.rows[0].cnt);
    
    // Show sample data from profession_applicability if any
    const sampleRes = await pool.query('SELECT * FROM profession_applicability LIMIT 3');
    console.log('profession_applicability sample:', sampleRes.rows);
    
  } catch (err) {
    console.error('Verification Error:', err);
  } finally {
    await pool.end();
  }
}

verify();