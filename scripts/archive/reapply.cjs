const fs=require('fs'); const pg=require('pg');
(async()=>{
  const pool=new pg.Pool({connectionString:'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require', ssl:{rejectUnauthorized:false}});
  const sql=fs.readFileSync('supabase/migrations/20260825_10_audit_hash_chain.sql','utf8');
  await pool.query(sql);
  console.log('re-applied');
  const r=await pool.query('select * from verify_audit_chain()');
  console.log('verify rows', r.rows.length, JSON.stringify(r.rows).slice(0,300));
  await pool.end();
})();
