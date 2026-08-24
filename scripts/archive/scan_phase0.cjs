const pg = require('pg');
const fs = require('fs');
async function main(){
  const conn = 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require';
  const pool = new pg.Pool({connectionString: conn, ssl:{rejectUnauthorized:false}});
  try{
    const c1 = await pool.query('select count(*)::int as c from service_catalog');
    console.log('CATALOG', c1.rows[0].c);
    const c2 = await pool.query('select status, count(*)::int as c from regulatory_rules group by status');
    console.log('RULES', JSON.stringify(c2.rows));
    const c3 = await pool.query('select workflow_key, version from workflow_definitions');
    console.log('WORKFLOWS', JSON.stringify(c3.rows));
    const c4 = await pool.query('select count(*)::int as c from audit_log');
    console.log('AUDIT', c4.rows[0].c);
    const c5 = await pool.query("select tablename from pg_tables where schemaname='public' and tablename like '%persons%' or tablename like '%legal_entities%'");
    console.log('CANONICAL', JSON.stringify(c5.rows));
    const c6 = await pool.query('select count(*)::int as c from employment_contracts');
    console.log('CONTRACTS', c6.rows[0].c);
  }catch(e){ console.error(e.message); }
  await pool.end();
}
main();
