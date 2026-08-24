import fs from 'fs';

const files = [
  'server/routes/accounts.js',
  'server/routes/dynamicFields.js',
  'server/routes/system.js',
];
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('loadEnv')) { console.log(f + ' already'); continue; }
  // أدرج الاستيراد قبل أول import موجود
  s = s.replace(/^(import[^\n]*\n)/m, "import '../lib/loadEnv.js';\n$1");
  fs.writeFileSync(f, s, 'utf8');
  console.log(f + ' patched');
}
