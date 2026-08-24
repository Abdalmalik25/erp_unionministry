import fs from 'fs';
import path from 'path';

const targets = ['ProgressBar', 'performance', 'separator', 'sheet', 'skeleton', 'toggle', 'tooltip', 'use-mobile'];
const hits = {};
for (const t of targets) hits[t] = [];

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|css)$/.test(f)) {
      const s = fs.readFileSync(p, 'utf8');
      for (const m of s.matchAll(/(?:import[^'";]*from\s*|import\(\s*)['"]([^'"]+)['"]/g)) {
        const spec = m[1];
        for (const t of targets) {
          const re = new RegExp(`(^|[\\./])${t}(\\.|\\.js|\\.ts|['"])`);
          if (re.test(spec)) hits[t].push(p.replace(/\\/g, '/') + ' <= ' + spec);
        }
      }
    }
  }
}
walk('src');
for (const t of targets) console.log(t + ': ' + (hits[t].length ? hits[t].join(' | ') : 'NONE'));
