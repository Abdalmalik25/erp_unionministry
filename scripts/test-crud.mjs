import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env','utf8').split('\n');
env.forEach(l => { const t=l.trim(); if(!t||t.startsWith('#'))return; const i=t.indexOf('='); if(i===-1)return; const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().replace(/^['"]|['"]$/g,''); if(!process.env[k])process.env[k]=v; });
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:1});

// Get an entity_id for FK tests
const ent = await pool.query("SELECT entity_id FROM organizational_entities WHERE deleted_at IS NULL LIMIT 1");
const entId = ent.rows[0].entity_id;
console.log('Test entity_id:', entId);

// Test POST a new profession
try {
  const r = await fetch('http://localhost:4000/api/professions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name_ar: 'مهندس اختبار ' + Date.now(), code: 'test_' + Date.now(), isco_code: 'ISCO-9999', major_group_code: '99', major_group_name: 'test', sector: 'technology', family: 'test', status: 'معتمدة' })
  });
  const d = await r.text();
  console.log('POST /api/professions -> ' + r.status + ' ' + d.substring(0, 150));
} catch (e) { console.log('POST prof ERR: ' + e.message); }

// Test POST a new entity
try {
  const r = await fetch('http://localhost:4000/api/entities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name_ar: 'كيان اختبار ' + Date.now(), entity_type: 'union', status: 'active', governorate: 'صنعاء', compliance_status: 'compliant', risk_level: 'low', unified_code: 'TEST-' + Date.now(), registration_number: 'REG-TEST-' + Date.now(), classification: 'labor', geographic_scope: 'single_governorate', governance_level: 'governorate', legal_form: 'syndicate', establishment_date: '2020-01-01', registration_date: '2020-06-01', city: 'صنعاء' })
  });
  const d = await r.text();
  console.log('POST /api/entities -> ' + r.status + ' ' + d.substring(0, 150));
} catch (e) { console.log('POST ent ERR: ' + e.message); }

await pool.end();
