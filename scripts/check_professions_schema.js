import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function checkSchema() {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'professions' ORDER BY ordinal_position");
  console.log('Columns in professions table:', r.rows);
  await pool.end();
}

checkSchema().catch(console.error);
