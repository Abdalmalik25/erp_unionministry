import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

await c.connect();

const r = await c.query('SELECT service_code FROM service_catalog LIMIT 20');
console.log('service_catalog codes:', r.rows.map(r => r.service_code).join(', '));

await c.end();