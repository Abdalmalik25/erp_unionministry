import fs from 'fs';
const file = 'src/app/components/labor/SmartChronology.tsx';
let s = fs.readFileSync(file, 'utf8');
// took لم يعد معروضاً بعد التعريب — نزيل الحالة والتعيين
s = s.replace('  const [took,setTook]=useState<number>(0);\n', '');
s = s.replace('      setTook(d.took_ms||0);\n', '');
fs.writeFileSync(file, s, 'utf8');
console.log('took removed:', !s.includes('setTook'));
