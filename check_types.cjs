const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function checkTypes() {
  try {
    // Check organizational entities columns
    const cols = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'organizational_entities' 
      ORDER BY ordinal_position
    `);
    console.log('organizational_entities columns:', cols.rows.map(r => r.column_name + ':' + r.data_type));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkTypes();