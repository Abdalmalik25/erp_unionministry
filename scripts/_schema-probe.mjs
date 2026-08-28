import pg from 'pg';
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (t) => (await p.query(
  "SELECT column_name,data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position",
  [t]
)).rows.map(r => r.column_name + ':' + r.data_type).join(', ');
for (const t of ['external_integrations', 'sector_users', 'legal_articles']) {
  console.log(t, '=>', await q(t));
}
const ext = await p.query("SELECT extname FROM pg_extension WHERE extname IN ('vector','pgcrypto')");
console.log('extensions:', ext.rows.map(r => r.extname).join(',') || 'none');
await p.end();