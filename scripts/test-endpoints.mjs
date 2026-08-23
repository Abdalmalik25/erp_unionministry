const endpoints = [
  '/api/dashboard/enhanced-stats',
  '/api/dashboard/time-series',
  '/api/entities?limit=3',
  '/api/members?limit=3',
  '/api/violations?limit=3',
  '/api/inspections?limit=3',
  '/api/activities?limit=3',
  '/api/documents?limit=3',
  '/api/licenses?limit=3',
  '/api/compliance-alerts?limit=3',
  '/api/fee-payments?limit=3',
  '/api/training-records?limit=3',
  '/api/entity-relationships?limit=3',
  '/api/board-members?limit=3',
  '/api/legal-references?limit=3',
  '/api/professions?limit=3',
  '/api/isic4?limit=3',
  '/api/enterprise-occupation-links?limit=3',
  '/api/labor-disputes?limit=3',
  '/api/expatriate-licenses?limit=3',
  '/api/evaluation-certificates?limit=3',
  '/api/notifications?limit=3',
];

(async () => {
  let pass = 0, fail = 0;
  for (const ep of endpoints) {
    try {
      const resp = await fetch('http://localhost:4000' + ep);
      const txt = await resp.text();
      if (resp.status === 200) { pass++; console.log('OK  ' + ep + ' (' + txt.length + ' bytes)'); }
      else { fail++; console.log('FAIL ' + ep + ' -> ' + resp.status + ': ' + txt.substring(0, 150)); }
    } catch (e) { fail++; console.log('ERR ' + ep + ' -> ' + e.message); }
  }
  console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
})();
