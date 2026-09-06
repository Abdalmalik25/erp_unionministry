import pg from 'pg';
import crypto from 'crypto';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000
});

await c.connect();

console.log('=== Seeding Real Data ===\n');

// Unions
console.log('1. Seeding unions...');
const unionNames = ['الاتحاد العام لنقابات عمال اليمن', 'نقابة عمال النقل', 'نقابة عمال البناء', 'نقابة عمال الصحة', 'نقابة المعلمين'];
const unionNumbers = ['UN-0001', 'UN-0002', 'UN-0003', 'UN-0004', 'UN-0005'];
for (let i = 0; i < unionNames.length; i++) {
  await c.query(`
    INSERT INTO unions (id, version, created_at, updated_at, structure, establish_date, province, district, license_number, license_date, phone, email, address, status, union_number, name_ar, name_en, type)
    VALUES (gen_random_uuid(), 1, NOW(), NOW(), 'national', NOW(), 'صنعاء', 'الصافية', $1, NOW(), $2, $3, $4, 'active', $1, $1, $1, 'national')
  `, [unionNumbers[i], '712345678', `union${i}@union.ye`, 'صنعاء - شارع الزبيري']);
  console.log('Union ' + (i+1) + ' OK');
}
console.log('Seeded 5 unions');

// Service Instances
console.log('2. Seeding service_instances...');
const ppl = await c.query('SELECT id FROM persons LIMIT 30');
const services = ['SVC-GEN-001', 'SVC-GEN-002', 'SVC-EST-001', 'SVC-EST-002', 'SVC-EST-003'];
for (let i = 0; i < ppl.rows.length; i++) {
  const p = ppl.rows[i];
  await c.query(
    `INSERT INTO service_instances (id, instance_number, service_code, applicant_type, applicant_id, payload, documents, status, sla_deadline, created_by, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'person', $3, $4, $5, 'submitted', $6, $3, NOW(), NOW())
     ON CONFLICT (instance_number) DO NOTHING`,
    ['SI-' + String(i+1).padStart(8,'0'), ['SVC-GEN-001', 'SVC-GEN-002', 'SVC-EST-001', 'SVC-EST-002', 'SVC-EST-003'][i % 5], ppl.rows[i].id, JSON.stringify({requested_at: new Date().toISOString()}), JSON.stringify([]), new Date(Date.now() + 7*24*60*60*1000)]
  );
}
console.log('Seeded ' + ppl.rows.length + ' service_instances');

// Contracts
console.log('3. Seeding contracts...');
const estRes = await c.query('SELECT id FROM commercial_establishments LIMIT 500');
const ppl2 = await c.query('SELECT id FROM persons LIMIT 20');
const profRes = await c.query('SELECT id FROM professions LIMIT 50');
const professionIds = profRes.rows.map(r => r.id);
const contractTypes = ['fixed_term', 'indefinite', 'seasonal', 'part_time'];
for (let i = 0; i < ppl2.rows.length; i++) {
  await c.query(
    `INSERT INTO contracts (id, contract_number, employer_entity_id, worker_id, type, status, start_date, end_date, wages, profession_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (contract_number) DO NOTHING`,
    ['CNT-' + String(i+1).padStart(8,'0'), estRes.rows[i % 500].id, ppl2.rows[i].id, ['fixed_term', 'indefinite', 'seasonal', 'part_time'][i % 4], '2023-01-01', '2025-12-31', 50000 + i*1000, professionIds[i % professionIds.length]]
  );
}
console.log('Seeded 20 contracts');

// Inspections - include inspection_number
console.log('4. Seeding inspections...');
const estRes2 = await c.query('SELECT id, name_ar FROM commercial_establishments LIMIT 15');
const inspTypes = ['routine', 'complaint', 'follow_up', 'targeted'];
const inspStatus = ['scheduled', 'in_progress', 'completed', 'cancelled'];
for (let i = 0; i < estRes2.rows.length; i++) {
  const est = estRes2.rows[i];
  await c.query(
    `INSERT INTO inspections (id, inspection_number, case_number, type, status, priority, entity_id, entity_name, entity_type, address, governorate, scheduled_date, assigned_inspector, enterprise_id, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, 'normal', $4, $5, 'establishment', 'عنوان المنشأة', 'صنعاء', $6, gen_random_uuid(), $7, NOW(), NOW())
    ON CONFLICT (inspection_number) DO NOTHING`,
    ['INSP-' + String(i+1).padStart(6,'0'), ['routine', 'complaint', 'follow_up', 'targeted'][i % 4], ['scheduled', 'in_progress', 'completed', 'cancelled'][i % 4], estRes2.rows[i].id, estRes2.rows[i].name_ar, 'صنعاء', new Date(Date.now() + (i*3)*24*60*60*1000).toISOString().split('T')[0], estRes2.rows[i].id]
  );
}
console.log('Seeded 15 inspections');

console.log('\n=== Seeding Complete ===');
process.exit(0);