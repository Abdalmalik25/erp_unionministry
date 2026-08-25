// مسح ديون مصطلحية نهائي — كل ما يجب ألا يوجد
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'server', 'public', 'index.html'];
const SKIP = new Set(['node_modules', '.vercel', 'dist', 'backups', '.git']);
const hits = [];
const patterns = [
  [/منصة أصحاب العمل/g, 'بوابة أصحاب العمل'],
  [/المنصة الوطنية/g, 'المنظومة الوطنية'],
  [/للعمل النقابي/g, 'لإدارة قطاع العمل'],
  [/National Labor Platform Core API/g, 'الاسم العربي'],
  [/UnionSphere Ministry/g, 'الاسم الرسمي'],
];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.has(e.name)) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|js|mjs|html|json|xml|md)$/.test(e.name)) {
      const c = fs.readFileSync(p, 'utf8');
      for (const [re] of patterns) {
        const m = c.match(re);
        if (m) hits.push(`${p}: ${m.length}× ${m[0]}`);
      }
    }
  }
}
for (const r of ROOTS) {
  if (!fs.existsSync(r)) continue;
  if (fs.statSync(r).isFile()) {
    const c = fs.readFileSync(r, 'utf8');
    for (const [re] of patterns) { const m = c.match(re); if (m) hits.push(`${r}: ${m.length}× ${m[0]}`); }
  } else walk(r);
}

console.log(hits.length ? hits.join('\n') : 'CLEAN ✓ — صفر بقايا مصطلحية');
