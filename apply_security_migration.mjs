import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require";

const pool = new Pool({ 
  connectionString, 
  ssl: { rejectUnauthorized: false } 
});

async function applySecurityMigration() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    const migrationPath = path.resolve('G:\\App25\\unionministry1\\supabase\\migrations\\20260907_01_security_enhancements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying security migration as single statement...');
    
    // Execute the entire migration as one statement
    await client.query(migrationSQL);
    
    console.log('Migration applied successfully!');
    
    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('security_events', 'ip_management', 'country_blocking', 'account_lockout')
    `);
    console.log('Created tables:', tables.rows.map(r => r.table_name));
    
    // Verify country_blocking data
    const countries = await client.query('SELECT country_code, country_name, action, is_active FROM country_blocking');
    console.log('Country blocking rules:', countries.rows);
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

applySecurityMigration();