import fs from 'node:fs';
const out = [];
// 1) عنوان الأدوار في صفحة عن المنظومة
const pp = fs.readFileSync('src/app/pages/public/PublicPages.tsx', 'utf8');
pp.split('\n').forEach((ln, i) => { if (/من يخدمه|النظام الحكومي/.test(ln)) out.push(`PublicPages:${i + 1}: ${ln.trim().slice(0, 100)}`); });
// 2) قائمة السجلات المكررة يدوياً في بوابة الوزارة
const np = fs.readFileSync('src/app/pages/NationalPlatformHome.tsx', 'utf8');
np.split('\n').forEach((ln, i) => { if (/سجل الأشخاص/.test(ln)) out.push(`NationalPlatformHome:${i + 1}: ${ln.trim().slice(0, 90)}...`); });
// 3) هل لائحة حوادث العمل موجودة في المرجع القانوني؟
const inst = fs.readFileSync('src/app/content/institutional.ts', 'utf8');
out.push(`LEGAL has حوادث: ${inst.includes('حوادث')}`);
fs.writeFileSync('scripts/probe-out.txt', '\ufeff' + out.join('\n'), 'utf8');
console.log(out.length);
