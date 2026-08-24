import fs from 'fs';

const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// dev:all بـ & لا يعمل على Windows — نفس السلوك عبر تسلسل مدعوم
p.scripts['dev:all'] = 'start cmd /c npm run server && start cmd /c npm run dev';
// clean متعدد المنصات
p.scripts['clean'] = 'node scripts/clean-build.mjs';
// إشارات لملفات محذوفة
delete p.scripts['db:seed-all'];
p.scripts['db:setup'] = 'node scripts/migrate-sql.js && node scripts/seed-professions.js';
// سكربت الإنتاج الرسمي
p.scripts['start:prod'] = 'node server/index.js';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(p.scripts, null, 1));
