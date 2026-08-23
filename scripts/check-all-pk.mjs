import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});

const tables = ['organizational_entities','members','professions','violations','inspections','activities','documents','licenses','compliance_alerts','fee_payments','training_records','entity_relationships','board_members','legal_references'];
for (const t of tables) {
  const pk = await pool.query(`SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '${t}'::regclass AND i.indisprimary`);
  console.log(t + ': PK=' + pk.rows.map(x=>x.attname).join(','));
}
await pool.end();
