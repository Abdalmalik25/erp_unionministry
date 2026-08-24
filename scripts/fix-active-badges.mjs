import fs from 'fs';
const file = 'src/app/components/labor/SecurityCenter.tsx';
let s = fs.readFileSync(file, 'utf8');
const a = '<Badge variant="outline">active</Badge>';
s = s.split(a).join('<Badge variant="outline">نشط</Badge>');
fs.writeFileSync(file, s, 'utf8');
console.log('done, remaining active:', (s.match(/active/g) || []).length);
