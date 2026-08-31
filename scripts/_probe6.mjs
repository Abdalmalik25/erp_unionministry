// scripts/_probe6.mjs — Check tables for evaluation
import '../server/lib/loadEnv.js';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const tables = ['worker_profiles', 'worker_procedures', 'worker_registry', 'maturity_assessments', 'worker_training', 'worker_certifications', 'training_programs', 'members'];
for (const t of tables) {
  const r = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [t]);
  if (r.rows.length === 0) {
    console.log(`\n${t}: NOT FOUND`);
  } else {
    console.log(`\n${t}:`);
    for (const c of r.rows) console.log('  ', c.column_name, c.data_type);
  }
}
await pool.end();
