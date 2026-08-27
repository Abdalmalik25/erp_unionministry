// Extract static imports (named + namespace) from built entry chunk
const fs = require('fs');
const path = require('path');
const dir = 'dist/assets';
const entry = fs.readdirSync(dir).filter(f => /^index-[A-Za-z0-9_-]+\.js$/.test(f))
  .map(f => ({ f, s: fs.statSync(path.join(dir, f)).size }))
  .sort((a, b) => b.s - a.s)[0];
console.log('ENTRY=' + entry.f);
const src = fs.readFileSync(path.join(dir, entry.f), 'utf8');
// match: import ... from "./assets/x.js" and import"./assets/x.js"
const imps = [...src.matchAll(/from\s*"\.\/([A-Za-z0-9_-]+\.js)"|import\s*"\.\/([A-Za-z0-9_-]+\.js)"/g)]
  .map(m => m[1] || m[2]);
console.log('ENTRY_STATIC_IMPORTS:');
for (const i of [...new Set(imps)]) console.log('  ' + i);

// which chunks each heavy vendor is statically referenced from (all chunks)
console.log('\nWHO_STATICALLY_IMPORTS_HEAVY_VENDORS:');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  const deps = [...s.matchAll(/from\s*"\.\/(vendor-(?:pdf|charts|supabase)-[A-Za-z0-9_-]+\.js)"|import\s*"\.\/(vendor-(?:pdf|charts|supabase)-[A-Za-z0-9_-]+\.js)"/g)]
    .map(m => m[1] || m[2]);
  const uniq = [...new Set(deps)];
  if (uniq.length) console.log('  ' + f + '  ->  ' + uniq.join(', '));
}
