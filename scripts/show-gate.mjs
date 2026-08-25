import fs from 'fs';

const s = fs.readFileSync('server/index.js', 'utf8');
console.log('limiter defined:', s.includes('AUDIT_POST_LIMITER'));
const j = s.indexOf("/api/audit-log'");
console.log(s.substring(j - 300, j + 380));
