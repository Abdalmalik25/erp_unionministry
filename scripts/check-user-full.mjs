import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Check all columns for the user
const r = await pool.query("SELECT * FROM sector_users WHERE email = 'minstry@yemen.gov.ye'");
const u = r.rows[0];
console.log('All user columns:', JSON.stringify(u, null, 2));

// Check table schema
const schema = await pool.query(`
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'sector_users' 
  ORDER BY ordinal_position
`);
console.log('\nsector_users schema:');
for (const col of schema.rows) {
  console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
}

// Check if deleted_at is null
console.log('\ndeleted_at value:', u.deleted_at);

// Check login_attempts for recent failures
const attempts = await pool.query(`
  SELECT email_attempted, success, reason, created_at 
  FROM login_attempts 
  WHERE email_attempted = 'minstry@yemen.gov.ye' 
  ORDER BY created_at DESC 
  LIMIT 5
`);
console.log('\nRecent login attempts:');
for (const a of attempts.rows) {
  console.log(`  ${a.created_at} | success=${a.success} | reason=${a.reason}`);
}

await pool.end();
