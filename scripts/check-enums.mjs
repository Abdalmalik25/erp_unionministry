import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});
const checks = ['compliance_status','risk_level','violation_type','violation_severity_enum','violation_status_enum','inspection_status','member_status_enum','license_type_enum','license_status_enum','payment_method_enum','payment_status_enum','training_status_enum','membership_type_enum'];
for (const c of checks) {
  const r = await pool.query(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = '${c}' ORDER BY enumsortorder`);
  if (r.rows.length > 0) console.log(c + ': ' + r.rows.map(x=>x.enumlabel).join(', '));
}
// Also check column udt_names for key tables
const cols = await pool.query(`SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE table_name IN ('organizational_entities','members','violations','inspections') AND udt_name LIKE '%enum%' OR udt_name IN ('status_enum','type_enum') ORDER BY table_name`);
console.log('\nEnum columns:', cols.rows.map(x=>x.table_name+'.'+x.column_name+'='+x.udt_name).join('\n'));
await pool.end();
