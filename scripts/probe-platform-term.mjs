import fs from 'node:fs';
const lines = fs.readFileSync('src/app/components/employer/EmployerJourney.tsx', 'utf8').split('\n');
const out = [];
lines.forEach((ln, i) => { if (/المنصة/.test(ln)) out.push(`${i + 1}: ${ln.trim().slice(0, 130)}`); });
fs.writeFileSync('scripts/probe-out.txt', '\ufeff' + (out.join('\n') || 'CLEAN'), 'utf8');
console.log(out.length);
