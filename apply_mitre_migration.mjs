import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require";

const pool = new Pool({ 
  connectionString, 
  ssl: { rejectUnauthorized: false } 
});

async function applyMitreMigration() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    const migrationPath = path.resolve('G:\\App25\\unionministry1\\supabase\\migrations\\20260907_02_mitre_attack_detections.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying MITRE ATT&CK migration...');
    await client.query(migrationSQL);
    
    console.log('Migration applied successfully!');
    
    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('mitre_attack_detections', 'mitre_attack_chains', 'mitre_technique_catalog', 'mitre_tactic_catalog')
    `);
    console.log('Created tables:', tables.rows.map(r => r.table_name));
    
    // Verify technique catalog
    const techniques = await client.query('SELECT technique_id, name FROM mitre_technique_catalog ORDER BY technique_id');
    console.log('Techniques loaded:', techniques.rows.length);
    console.table(techniques.rows.slice(0, 10));
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

applyMitreMigration();