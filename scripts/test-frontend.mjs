const tests = [
  { url: 'http://localhost:5173/', name: 'Main page', check: (t) => t.includes('root') && t.includes('UnionSphere') },
  { url: 'http://localhost:5173/api/health', name: 'API health via proxy', check: (t) => t.includes('ok') },
  { url: 'http://localhost:5173/api/entities?limit=2', name: 'Entities API', check: (t) => t.includes('data') },
];

(async () => {
  for (const t of tests) {
    try {
      const resp = await fetch(t.url);
      const txt = await resp.text();
      const ok = t.check(txt);
      console.log((ok ? 'OK  ' : 'FAIL ') + t.name + ' -> status=' + resp.status + ' len=' + txt.length);
    } catch (e) {
      console.log('ERR ' + t.name + ' -> ' + e.message);
    }
  }
})();
