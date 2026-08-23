import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});
const r = await pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name='organizational_entities' AND is_nullable='NO' ORDER BY ordinal_position");
console.log('NOT NULL columns:');
r.rows.forEach(x => console.log('  ' + x.column_name + ' default=' + (x.column_default || 'NONE')));
await pool.end();
