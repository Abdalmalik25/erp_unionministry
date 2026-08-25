// تنزيل الخطوط الرسمية ذاتياً — لا اعتماد خارجي وقت تشغيل المنظومة
// IBM Plex Sans Arabic (متن) + Cairo (عناوين) + JetBrains Mono (أرقام)
import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const OUT = 'public/fonts';
fs.mkdirSync(OUT, { recursive: true });

const FAMILIES = [
  { q: 'family=IBM+Plex+Sans+Arabic:wght@400;500;600;700', keep: ['arabic', 'latin'], prefix: 'IBMPlexSansArabic' },
  { q: 'family=Cairo:wght@700;800;900', keep: ['arabic', 'latin'], prefix: 'Cairo' },
  { q: 'family=JetBrains+Mono:wght@400;600', keep: ['latin'], prefix: 'JetBrainsMono' },
];

const faces = [];
for (const fam of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?${fam.q}&display=swap`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  // كتل الشكل: /* subset */ @font-face { ... }
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*{[^}]+})/g)];
  for (const [, subset, face] of blocks) {
    if (!fam.keep.includes(subset)) continue;
    const weight = face.match(/font-weight:\s*(\d+)/)[1];
    const src = face.match(/url\((https:[^)]+\.woff2)\)/)[1];
    const range = face.match(/unicode-range:\s*([^;]+);/)[1];
    const fname = `${fam.prefix}-${weight}-${subset}.woff2`;
    const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
    fs.writeFileSync(path.join(OUT, fname), buf);
    faces.push({ fname, weight, range, size: buf.length });
    console.log(`${fname}  ${(buf.length / 1024).toFixed(1)} KB`);
  }
}

// توليد قواعد @font-face جاهزة للصق في fonts.css
const css = faces.map(f => `@font-face {
  font-family: '${f.fname.startsWith('Cairo') ? 'Cairo' : f.fname.startsWith('IBM') ? 'IBM Plex Sans Arabic' : 'JetBrains Mono'}';
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url('/fonts/${f.fname}') format('woff2');
  unicode-range: ${f.range};
}`).join('\n\n');
fs.writeFileSync('scripts/fonts-faces.out.css', '\ufeff' + css, 'utf8');
const total = faces.reduce((a, f) => a + f.size, 0);
console.log(`\n${faces.length} ملفاً، ${(total / 1024).toFixed(0)} KB إجمالاً → scripts/fonts-faces.out.css`);
