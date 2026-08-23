import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});
for (const t of ['worker_dispatches', 'worker_reduction_requests']) {
  const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${t}' AND column_name='status'`);
  console.log(t + ' has status column: ' + (r.rows.length > 0));
  if (r.rows.length === 0) {
    const r2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='${t}' ORDER BY ordinal_position LIMIT 10`);
    console.log('  first columns: ' + r2.rows.map(x=>x.column_name).join(', '));
  }
}
await pool.end();
