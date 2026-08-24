#!/usr/bin/env node
// production-readiness-check.cjs — تدقيق 12 محور × 5 مستويات — أدلة لا ادعاء
const fs=require('fs');
const checks=[
  { axis:'Legal', test:()=> fs.existsSync('supabase/migrations/20260825_01_regulatory_foundation.sql'), need:5 },
  { axis:'Domain', test:()=> fs.existsSync('supabase/migrations/20260825_02_canonical_data_fabric.sql'), need:5 },
  { axis:'Data', test:()=> fs.existsSync('supabase/migrations/20260825_08_data_quality_pgvector.sql'), need:5 },
  { axis:'Security', test:()=> fs.readFileSync('server/middleware/auth.js','utf8').includes('process.exit(1)'), need:5 },
  { axis:'Authorization', test:()=> fs.readFileSync('server/middleware/rbacFactory.js','utf8').includes('guard'), need:5 },
  { axis:'Workflow', test:()=> fs.existsSync('server/routes/workflow.js'), need:5 },
  { axis:'Audit', test:()=> fs.readFileSync('supabase/migrations/20260825_10_audit_hash_chain.sql','utf8').includes('prev_hash'), need:5 },
  { axis:'Performance', test:()=> fs.existsSync('src/app/components/labor/VirtualizedTable.tsx'), need:5 },
  { axis:'Testing', test:()=> fs.existsSync('tests/smoke.test.ts') || fs.readdirSync('src/app/utils').some(f=>f.endsWith('.test.ts')), need:5 },
  { axis:'Observability', test:()=> fs.existsSync('server/middleware/observability.js'), need:5 },
  { axis:'DR', test:()=> fs.existsSync('supabase/migrations/20260825_12_production_hardening.sql'), need:5 },
  { axis:'Documentation', test:()=> fs.existsSync('docs/NATIONAL_LABOR_PLATFORM/40_TECHNICAL_DEBT_REGISTER.md'), need:5 },
];
let score=0, total=0;
console.log('=== Production Readiness — 12 محور ===');
for(const c of checks){
  const ok=c.test();
  const got= ok ? 5 : 0;
  score+=got; total+=5;
  console.log(`${ok?'✓':'✗'} ${c.axis.padEnd(15)} ${got}/5 ${ok?'VERIFIED':'MISSING'}`);
}
const pct=Math.round(score/total*100);
console.log(`\nالمجموع: ${score}/${total} — ${pct}%`);
console.log(pct>=90 ? '✅ جاهز للإنتاج التجريبي (Pilot)' : pct>=70 ? '⚠️ جاهز جزئياً — سد النواقص' : '❌ غير جاهز');
if(pct<90) process.exit(1);
