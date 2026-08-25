import fs from 'node:fs';
const out = [];
const targets = [
  ['src/app/components/guide/UserGuideModal.tsx', [2]],
  ['src/app/pages/NationalPlatformHome.tsx', [3, 20]],
  ['server/routes/system.js', []],
];
for (const [f] of targets) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (/للعمل النقابي|المنصة الوطنية|نظام قطاع العمل/.test(ln)) out.push(`${f}:${i + 1}: ${ln.trim().slice(0, 120)}`);
  });
}
for (const f of ['server/index.js', 'api/index.js']) {
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (/للعمل النقابي|المنصة الوطنية|نظام قطاع العمل/.test(ln)) out.push(`${f}:${i + 1}: ${ln.trim().slice(0, 120)}`);
  });
}
fs.writeFileSync('scripts/probe-out.txt', '\ufeff' + (out.join('\n') || 'CLEAN'), 'utf8');
console.log('written', out.length, 'hits');
