import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

await c.connect();

const r = await c.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='inspections'");
console.log('inspections columns:', r.rows.map(r => r.column_name + ' (' + r.is_nullable + ')').join(', '));

await c.end();