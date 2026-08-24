import fs from 'fs';

// إسكات سجلات [Offline]/[PWA] في الإنتاج — تعمل في التطوير فقط
const files = [
  'src/app/contexts/OfflineContext.tsx',
  'src/app/utils/pwa.ts',
];

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  // غلّف كل استدعاءات console.* بشرط DEV
  s = s.replace(/console\.(log|info|warn|error)\(([^;]*?)\);/g,
    (m, lvl, args) => `if (import.meta.env.DEV) console.${lvl}(${args});`);
  fs.writeFileSync(file, s, 'utf8');
  const count = (s.match(/import\.meta\.env\.DEV/g) || []).length;
  console.log(file, '->', count, 'guarded');
}
