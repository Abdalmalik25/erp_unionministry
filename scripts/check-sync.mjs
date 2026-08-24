import fs from 'fs';
import path from 'path';

let found = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f) && !p.includes('supabaseSync') && !p.endsWith('sync.ts')) {
      const s = fs.readFileSync(p, 'utf8');
      for (const l of s.split(/\r?\n/)) {
        if (/from\s+['"][^'"]*(\/sync|\/supabaseSync)['"]/.test(l)) found.push(p + ': ' + l.trim());
      }
    }
  }
}
walk('src');
console.log(found.length ? found.join('\n') : 'NO REAL IMPORTERS — sync.ts & supabaseSync.ts are DEAD');
