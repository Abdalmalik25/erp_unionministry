const BASE = 'http://localhost:4000';

async function test(name, url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(url, opts);
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text.substring(0, 200); }
    console.log(`[${r.status}] ${name}:`, JSON.stringify(json).substring(0, 200));
  } catch (e) {
    console.log(`[ERR] ${name}:`, e.message);
  }
}

// Test CRUD
await test('GET entities', `${BASE}/api/entities?limit=2`);
await test('GET members', `${BASE}/api/members?limit=2`);
await test('GET activities', `${BASE}/api/activities?limit=2`);
await test('GET documents', `${BASE}/api/documents?limit=2`);
await test('GET professions', `${BASE}/api/professions?limit=2`);
await test('GET violations', `${BASE}/api/violations?limit=2`);
await test('GET inspections', `${BASE}/api/inspections?limit=2`);
await test('GET licenses', `${BASE}/api/licenses?limit=2`);
await test('GET dispatches', `${BASE}/api/dispatches?limit=2`);
await test('GET notifications', `${BASE}/api/notifications?limit=2`);
await test('GET legal-references', `${BASE}/api/legal-references?limit=1`);
await test('GET risk-assessments', `${BASE}/api/risk-assessments?limit=2`);
await test('GET compliance-matrices', `${BASE}/api/compliance-matrices?limit=2`);
await test('GET maturity-assessments', `${BASE}/api/maturity-assessments?limit=2`);
await test('GET dashboard stats', `${BASE}/api/dashboard/stats`);
await test('GET enhanced-stats', `${BASE}/api/dashboard/enhanced-stats?period=month`);
await test('GET fee-payments', `${BASE}/api/fee-payments?limit=2`);
await test('GET board-members', `${BASE}/api/board-members?limit=2`);
await test('GET compliance-alerts', `${BASE}/api/compliance-alerts?limit=2`);
await test('GET worker-profiles', `${BASE}/api/worker-profiles?limit=2`);
await test('GET training-records', `${BASE}/api/training-records?limit=2`);
await test('GET labor-disputes', `${BASE}/api/labor-disputes?limit=2`);
await test('GET expatriate-licenses', `${BASE}/api/expatriate-licenses?limit=2`);
await test('GET evaluation-certificates', `${BASE}/api/evaluation-certificates?limit=2`);
await test('GET reduction-requests', `${BASE}/api/reduction-requests?limit=2`);
await test('GET audit-log', `${BASE}/api/audit-log?limit=2`);
await test('GET isic4', `${BASE}/api/isic4?limit=2`);
await test('GET commercial-establishments', `${BASE}/api/commercial-establishments?limit=2`);

// Test POST
await test('POST risk-assessment', `${BASE}/api/risk-assessments`, 'POST', {
  entity_id: '39dff46c-4e6f-41bb-887d-9d9900b1aefe',
  risk_type: 'مالية',
  risk_description: 'تأخر في تسليم الأرباح',
  likelihood: 3, impact: 4,
  mitigation_plan: 'مراجعة الإجراءات المالية',
  responsible_person: 'أحمد محمد',
  review_date: '2026-09-01',
  status: 'active'
});

await test('POST compliance-matrix', `${BASE}/api/compliance-matrices`, 'POST', {
  enterprise_id: '39dff46c-4e6f-41bb-887d-9d9900b1aefe',
  article_number: 'المادة 10',
  article_title: 'الإجازات',
  compliance_status: 'compliant',
  notes: 'ملتزم بجميع أحكام المادة',
  checked_by: 'محمد علي',
  checked_at: '2026-08-20'
});

await test('POST maturity-assessment', `${BASE}/api/maturity-assessments`, 'POST', {
  entity_id: '39dff46c-4e6f-41bb-887d-9d9900b1aefe',
  overall_score: 75, grade: 'B',
  identity_score: 8, description_score: 7, tasks_score: 8,
  competencies_score: 7, safety_score: 6, career_score: 8, governance_score: 9,
  missing_count: 2, red_flags: 0,
  recommendations: 'تحسين معايير السلامة',
  assessment_date: '2026-08-20',
  assessed_by: 'د. سعيد أحمد'
});

console.log('\n=== All tests complete ===');
