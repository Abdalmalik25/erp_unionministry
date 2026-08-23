import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});
const tables = ['professions','members','violations','inspections','activities','documents','licenses','compliance_alerts','fee_payments','training_records','entity_relationships','board_members','legal_references'];
for (const t of tables) {
  const r = await pool.query(`SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name='${t}' AND is_nullable='NO' ORDER BY ordinal_position`);
  console.log('\n' + t + ' NOT NULL:');
  r.rows.forEach(x => console.log('  ' + x.column_name + (x.column_default ? ' default=' + x.column_default : '')));
}
await pool.end();
