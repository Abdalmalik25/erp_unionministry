const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  try {
    // List tables
    const tablesRes = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' 
      ORDER BY table_name
    `);
    console.log('=== TABLES ===');
    tablesRes.rows.forEach(t => console.log(`- ${t.table_name} (type: ${t.table_type})`));
    
    // If there are tables, check first one's structure
    if (tablesRes.rows.length > 0) {
      const firstTable = tablesRes.rows[0].table_name;
      console.log(`\n=== STRUCTURE for ${firstTable} ===`);
        const colsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [firstTable]);
      colsRes.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));
      
      // Count rows
      const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM ${firstTable}`);
      console.log(`\nRow count for ${firstTable}: ${countRes.rows[0].cnt}`);
    }
    
    // Check professions if exists
    console.log('\n=== CHECK PROFESSIONS ===');
    const profRes = await pool.query(`SELECT * FROM professions LIMIT 5`);
    console.log('Professions sample:', profRes.rows);
    
    // Check inspections if exists
    console.log('\n=== CHECK INSPECTIONS ===');
    const inspRes = await pool.query(`SELECT * FROM inspections LIMIT 5`);
    console.log('Inspections sample:', inspRes.rows);
    
    // Check evaluation_certificates if exists
    console.log('\n=== CHECK EVALUATION_CERTIFICATES ===');
    const evalRes = await pool.query(`SELECT * FROM evaluation_certificates LIMIT 5`);
    console.log('Evaluation certificates sample:', evalRes.rows);
    
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await pool.end();
  }
}

audit();