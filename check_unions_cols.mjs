import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

await c.connect();

const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='unions'");
console.log('unions:', r.rows.map(r => r.column_name).join(', '));

await c.end();