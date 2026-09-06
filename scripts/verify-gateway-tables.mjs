import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await c.connect();
const want = ['contracts','users','workers','unions','cross_portal_notifications','cross_portal_workflows','unified_registry_entries','unified_user_identities','cross_portal_audit_log','permission_grants','attachments','addresses','data_lineage','contract_amendments','contract_attachments','contract_signatures','dispute_parties','dispute_evidence','dispute_resolutions','dispute_timeline','inspection_violations','inspection_attachments','inspection_witnesses','inspection_reports','compliance_reviews'];
const r = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
const have = new Set(r.rows.map(x => x.table_name));
let all = true;
for (const t of want) {
  const ok = have.has(t);
  if (!ok) all = false;
  console.log(`${ok ? 'OK  ' : 'MISS'} ${t}`);
}
console.log(all ? '\nALL PRESENT' : '\nSOME MISSING');
await c.end();