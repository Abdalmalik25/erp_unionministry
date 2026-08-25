import fs from 'fs';

const s = fs.readFileSync('src/app/routes.tsx', 'utf8');
const re = /path="([^"]+)"/g;
let m;
const out = [];
while ((m = re.exec(s)) !== null) out.push(m[1]);
console.log(out.join('\n'));
