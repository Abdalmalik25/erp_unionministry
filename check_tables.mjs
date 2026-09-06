import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

await c.connect();

const tables = [
  'persons', 'workers', 'commercial_establishments', 'contracts', 
  'labor_disputes', 'inspections', 'service_instances', 'service_catalog',
  'unions', 'users', 'sectors', 'professions'
];

for (const t of tables) {
  try {
    const r = await c.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`${t}: ${r.rows[0].count}`);
  } catch (e) {
    console.log(`${t}: ERROR - ${e.message.slice(0, 100)}`);
  }
}

await c.end();