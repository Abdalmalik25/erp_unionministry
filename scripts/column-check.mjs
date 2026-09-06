import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await c.connect();
for (const t of ['labor_disputes', 'inspections', 'health_fitness_certificates', 'cases', 'insurance_records', 'documents']) {
  try {
    const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position`, [t]);
    console.log(`\n=== ${t} (${r.rowCount} cols) ===`);
    console.log(r.rows.map(x => x.column_name).join(', '));
  } catch (e) {
    console.log(`\n=== ${t}: NOT FOUND ===`);
  }
}
await c.end();