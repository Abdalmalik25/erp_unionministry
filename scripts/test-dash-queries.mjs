import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});

const queries = [
  ['entities', `SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active FROM organizational_entities WHERE deleted_at IS NULL`],
  ['dispatches', `SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'جاري التنفيذ' OR status = 'تمت الموافقة' THEN 1 END)::int as active FROM worker_dispatches WHERE deleted_at IS NULL`],
  ['reductions', `SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'مسودة' OR status = 'قيد المراجعة' THEN 1 END)::int as pending FROM worker_reduction_requests`],
  ['evaluations', `SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'صالحة' THEN 1 END)::int as valid FROM evaluation_certificates`],
  ['services', `SELECT COUNT(*)::int as total FROM services`],
  ['openViolations', `SELECT COUNT(*)::int as total FROM violations WHERE deleted_at IS NULL AND status = 'open'`],
  ['overdueInspections', `SELECT COUNT(*)::int as total FROM inspections WHERE status = 'scheduled' AND inspection_date < NOW()`],
];

for (const [name, q] of queries) {
  try {
    const r = await pool.query(q);
    console.log('OK ' + name + ': ' + JSON.stringify(r.rows[0]));
  } catch (e) {
    console.log('FAIL ' + name + ': ' + e.message);
  }
}
await pool.end();
