import pg from 'pg';
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const [r1, r2] = await Promise.all([
  p.query(`SELECT pg_enum.enumlabel FROM pg_type JOIN pg_enum ON pg_enum.enumtypid=pg_type.oid WHERE pg_type.typname='maturity_grade'`),
  p.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='compliance_matrices'`),
]);
console.log('grade enum:', JSON.stringify(r1.rows.map(r => r.enumlabel)));
console.log('compliance columns:', JSON.stringify(r2.rows.map(r => `${r.column_name}:${r.data_type}`)));

const r3 = await p.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='inspections'`);
console.log('inspections:', JSON.stringify(r3.rows.map(r => `${r.column_name}:${r.data_type}`)));
const r4 = await p.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='evaluation_certificates'`);
console.log('evaluation_certificates:', JSON.stringify(r4.rows.map(r => `${r.column_name}:${r.data_type}`)));
const r5 = await p.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='training_records'`);
console.log('training_records:', JSON.stringify(r5.rows.map(r => `${r.column_name}:${r.data_type}`)));
const r6 = await p.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='labor_disputes'`);
console.log('labor_disputes:', JSON.stringify(r6.rows.map(r => `${r.column_name}:${r.data_type}`)));
const r7 = await p.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='expatriate_licenses'`);
console.log('expatriate_licenses:', JSON.stringify(r7.rows.map(r => `${r.column_name}:${r.data_type}`)));
const r8 = await p.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='commercial_establishments'`);
console.log('commercial_establishments:', JSON.stringify(r8.rows.map(r => `${r.column_name}:${r.data_type}`)));
await p.end();
