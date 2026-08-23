import fs from 'fs';
const s = fs.readFileSync('src/app/utils/schema_comprehensive.sql','utf-8');
const matches = s.match(/CREATE TABLE\s+\w+/g);
console.log('CREATE TABLE count:', matches ? matches.length : 0);
if (matches) matches.forEach(m => console.log(' ', m));
