import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});
const r = await pool.query(`SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='inspections' AND (column_name LIKE '%status%' OR column_name LIKE '%date%' OR column_name LIKE '%compliance%') ORDER BY ordinal_position`);
console.log('inspections relevant columns:', r.rows.map(x=>x.column_name+'('+x.udt_name+')').join(', '));
await pool.end();
