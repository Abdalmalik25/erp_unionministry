import fs from 'fs';
import path from 'path';

const files = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f)) files.push(p);
  }
}
walk('src');

const allSrc = new Map();
for (const f of files) {
  allSrc.set(f, fs.readFileSync(f, 'utf8'));
}

// Entry points and test files are always "used"
const ENTRY = new Set(['src/main.tsx', 'src/App.tsx', 'src/app/App.tsx', 'src/vite-env.d.ts']);
const isTest = (f) => /\.test\.(ts|tsx)$/.test(f) || f.includes('__tests__');

const dead = [];
for (const [f, content] of allSrc) {
  if (ENTRY.has(f.replace(/\\/g, '/')) || isTest(f)) continue;
  if (/\.d\.ts$/.test(f)) continue;
  const base = path.basename(f).replace(/\.(ts|tsx)$/, '');
  // skip index barrels resolved by directory
  let imported = false;
  for (const [other, oc] of allSrc) {
    if (other === f) continue;
    // import ... from '.../base' or './base' etc.
    const re = new RegExp(`['"]([^'"]*\\/)?${base}(['"]|\\.js['"]|\\.ts['"])`);
    if (re.test(oc)) { imported = true; break; }
  }
  if (!imported) dead.push(f.replace(/\\/g, '/'));
}
console.log(dead.length ? dead.join('\n') : 'NO DEAD MODULES');
