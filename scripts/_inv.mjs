import pg from 'pg';
const CS = 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require&channel_binding=require';
const pool = new pg.Pool({ connectionString: CS, ssl: { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 15000 });
try {
  const c = await pool.connect();
  console.log('CONNECTION: OK');
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('TABLE COUNT:', tables.rows.length);
  for (const { table_name } of tables.rows) {
    try {
      const r = await c.query(`SELECT COUNT(*)::int AS n FROM "${table_name}"`);
      console.log(table_name.padEnd(36), r.rows[0].n);
    } catch (e) { console.log(table_name.padEnd(36), 'ERR', e.message.slice(0, 40)); }
  }
  await c.release();
} catch (e) {
  console.log('CONNECTION FAILED:', e.message);
} finally {
  await pool.end();
}
