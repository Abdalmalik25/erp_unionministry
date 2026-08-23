import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function checkEnum() {
  const r = await pool.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'profession_status'");
  console.log('profession_status values:', r.rows.map(x => x.enumlabel));
  await pool.end();
}

checkEnum().catch(console.error);
