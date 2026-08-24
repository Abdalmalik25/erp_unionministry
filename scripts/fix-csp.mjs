import fs from 'fs';

let s = fs.readFileSync('index.html', 'utf8');
const before = (s.match(/supabase/gi) || []).length;
// إزالة بقايا supabase من CSP — المنصة تستخدم واجهتها الرسمية فقط
s = s.replace(/ https:\/\/\*\.supabase\.co/g, '');
fs.writeFileSync('index.html', s, 'utf8');
console.log(`removed ${before} supabase refs, left: ${(s.match(/supabase/gi) || []).length}`);
