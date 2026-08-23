const base = 'http://localhost:4000';
const endpoints = [
  '/api/dashboard/enhanced-stats',
  '/api/entities?limit=3',
  '/api/members?limit=3',
  '/api/inspections?limit=3',
  '/api/violations?limit=3',
  '/api/licenses?limit=3',
  '/api/expatriate-licenses?limit=3',
  '/api/professions?limit=3',
  '/api/isic4?limit=3',
  '/api/compliance-alerts?limit=3',
  '/api/training-records?limit=3',
  '/api/legal-references?limit=3',
  '/api/labor-disputes?limit=3',
  '/api/activities?limit=3',
  '/api/services?limit=3',
  '/api/service-requests?limit=3',
  '/api/documents?limit=3',
  '/api/elections?limit=3',
  '/api/board-members?limit=3',
  '/api/reduction-requests?limit=3',
  '/api/dispatches?limit=3',
  '/api/fee-payments?limit=3',
  '/api/worker-profiles?limit=3',
  '/api/commercial?limit=3',
];

(async () => {
  for (const ep of endpoints) {
    try {
      const r = await fetch(base + ep);
      const txt = await r.text();
      let info = '';
      try {
        const j = JSON.parse(txt);
        if (Array.isArray(j)) info = `array len=${j.length}`;
        else if (j && Array.isArray(j.data)) info = `data len=${j.data.length}`;
        else if (j && typeof j === 'object') info = `obj keys=${Object.keys(j).slice(0,6).join(',')}`;
        else info = typeof j;
      } catch { info = 'non-json len=' + txt.length; }
      console.log((r.ok ? 'OK  ' : 'FAIL') + ` [${r.status}] ${ep} -> ${info}`);
    } catch (e) {
      console.log('ERR  ' + ep + ' -> ' + e.message);
    }
  }
})();
