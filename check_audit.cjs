const pg=require('pg');
(async()=>{
  const pool=new pg.Pool({connectionString:'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require', ssl:{rejectUnauthorized:false}});
  const r=await pool.query("select column_name from information_schema.columns where table_name='audit_log' order by ordinal_position");
  console.log(r.rows.map(x=>x.column_name).join(','));
  await pool.end();
})();
