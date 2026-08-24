import fs from 'fs';
const file = 'src/app/pages/WorkerPassport.tsx';
let s = fs.readFileSync(file, 'utf8');
s = s.replace('جواز العمل الرقمي — My Labor Passport', 'جواز العمل الرقمي');
s = s.replace('سجل الوظائف والعقود (Timeline)', 'سجل الوظائف والعقود الزمني');
fs.writeFileSync(file, s, 'utf8');
console.log('done:', !s.includes('Timeline') && !s.includes('My Labor'));
