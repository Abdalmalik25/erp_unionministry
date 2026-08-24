import fs from 'fs';
const file = 'src/app/components/ErrorBoundary.tsx';
let s = fs.readFileSync(file, 'utf8');
s = s.replace('تفاصيل الخطأ (للمطورين)', 'التفاصيل الفنية — للمختصين فقط');
fs.writeFileSync(file, s, 'utf8');
console.log('done:', !s.includes('للمطورين'));
