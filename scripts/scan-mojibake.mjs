import fs from 'fs';
import path from 'path';

const out = [];
const MOJ = /[\u00d8\u00d9][\u0080-\u00bf]|\u00e2\u20ac/; // Ø/Ù + continuation byte أو â€
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f)) {
      const s = fs.readFileSync(p, 'utf8');
      const hasAr = /[\u0600-\u06FF]{3}/.test(s);
      const hasMoj = MOJ.test(s);
      if (hasMoj) out.push(`${p.replace(/\\/g, '/')} mojibake=${hasMoj} arabic=${hasAr}`);
    }
  }
}
walk('src');
console.log(out.length ? out.join('\n') : 'NO MOJIBAKE FOUND');
