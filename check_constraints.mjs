import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

await c.connect();

const tables = ['unions', 'service_instances', 'contracts', 'inspections'];

for (const t of tables) {
  const r = await c.query("SELECT conname, contype FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('u','p')", [t]);
  console.log(`${t}:`, r.rows.map(r => r.conname + ' (' + r.contype + ')').join(', '));
}

await c.end();