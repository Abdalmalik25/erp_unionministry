import fs from 'fs';
import path from 'path';

const uiDir = 'src/app/components/ui';
const uiFiles = fs.readdirSync(uiDir).filter(f => /\.(ts|tsx)$/.test(f));

// collect ALL imports in the whole src (excluding node_modules)
const allImports = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f)) {
      const s = fs.readFileSync(p, 'utf8');
      for (const m of s.matchAll(/from\s+['"]([^'"]+)['"]/g)) allImports.push({ file: p, spec: m[1] });
      for (const m of s.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) allImports.push({ file: p, spec: m[1] });
    }
  }
}
walk('src');

// resolve which ui files are imported
const usedUi = new Set();
for (const { file, spec } of allImports) {
  let resolved = null;
  if (spec.includes('components/ui/')) {
    resolved = path.basename(spec);
  } else if (/(^|\/)ui$/.test(spec)) {
    resolved = 'index.ts'; // barrel
  } else {
    // relative intra-dir import: ./X or ../ui/X
    const m = spec.match(/(?:^\.\/|\/ui\/)([^/']+)$/);
    if (m) resolved = m[1];
  }
  if (resolved) usedUi.add(resolved);
}

// barrel re-exports count as using
const barrel = fs.existsSync(path.join(uiDir, 'index.ts')) ? fs.readFileSync(path.join(uiDir, 'index.ts'), 'utf8') : '';
const barrelExports = [...barrel.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)].map(m => m[1]);

console.log('=== USED UI FILES ===');
for (const u of [...usedUi].sort()) console.log(u);
console.log('=== BARREL EXPORTS (only used if barrel itself is used) ===');
console.log('barrel used: ' + usedUi.has('index.ts'));
console.log('=== DEAD UI FILES ===');
for (const f of uiFiles.sort()) {
  const bare = f.replace(/\.tsx?$/, '');
  const usedDirect = [...usedUi].some(u => u.replace(/\.tsx?$/, '') === bare);
  const usedViaBarrel = usedUi.has('index.ts') && barrelExports.some(e => e.replace(/\.tsx?$/, '') === bare);
  const isBarrelSelfImport = barrelExports.some(e => e.replace(/\.tsx?$/, '') === bare); // internal wiring only
  if (!usedDirect && !(usedViaBarrel)) console.log(f + (isBarrelSelfImport ? '  (barrel-only)' : ''));
}
