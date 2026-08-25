import fs from 'node:fs';
const out = [];
const files = [
  'src/app/pages/public/PublicPages.tsx',
  'src/app/pages/NationalPlatformHome.tsx',
];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (/الضمانات الحكومية|لا يصدر حكماً|لا عقوبة إلا/.test(ln)) out.push(`${f.split('/').pop()}:${i + 1}: ${ln.trim().slice(0, 90)}`);
  });
}
fs.writeFileSync('scripts/probe-out.txt', '\ufeff' + out.join('\n'), 'utf8');
console.log(out.length);
