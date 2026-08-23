import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});
const tables = ['violations','inspections','activities','documents','licenses','compliance_alerts','fee_payments','training_records','entity_relationships','board_members','legal_references'];
try {
  for (const t of tables) {
    const r = await pool.query(`SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='${t}' AND is_nullable='NO' AND column_default IS NULL ORDER BY ordinal_position`);
    const required = r.rows.filter(x => x.column_name !== 'id' && x.column_name !== 'entity_id' && x.column_name !== 'enterprise_id');
    if (required.length > 0) {
      console.log(t + ': ' + required.map(x=>x.column_name).join(', '));
    } else {
      console.log(t + ': (all have defaults)');
    }
  }
} catch(e) { console.error(e.message); }
await pool.end();
