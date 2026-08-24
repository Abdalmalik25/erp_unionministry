import fs from 'fs';
import path from 'path';

const imports = new Set();
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!p.includes('components\\ui') && !p.includes('components/ui')) walk(p); }
    else if (/\.(ts|tsx)$/.test(f)) {
      const s = fs.readFileSync(p, 'utf8');
      for (const m of s.matchAll(/from\s+['"]([^'"]*components\/ui[^'"]*)['"]/g)) imports.add(m[1]);
      for (const m of s.matchAll(/from\s+['"](\.\.?\/ui[^'"]*)['"]/g)) imports.add(m[1]);
    }
  }
}
walk('src');
console.log(imports.size ? [...imports].sort().join('\n') : 'NO UI IMPORTS');
