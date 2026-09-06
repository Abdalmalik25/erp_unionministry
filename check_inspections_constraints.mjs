import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

await c.connect();

const r = await c.query("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'inspections'::regclass AND contype IN ('u','p')");
console.log('inspections constraints:', r.rows);

await c.end();