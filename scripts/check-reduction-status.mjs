import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});
const r = await pool.query("SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='worker_reduction_requests' AND column_name='status'");
console.log('status column type:', r.rows);
if (r.rows.length > 0 && r.rows[0].udt_name.includes('enum')) {
  const e = await pool.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '${r.rows[0].udt_name}')`);
  console.log('valid values:', e.rows.map(x=>x.enumlabel));
}
await pool.end();
