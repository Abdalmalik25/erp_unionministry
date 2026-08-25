import { execSync } from 'node:child_process';
const FILES = [
  'src/app/pages/NationalPlatformHome.tsx',
  'src/app/components/guide/UserGuideModal.tsx',
  'server/routes/system.js',
];
for (const f of FILES) {
  const good = execSync(`git show 331d7176:${f}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const m1 = /Ø[§™„-]/.test(good);
  const m2 = /â€/.test(good);
  const m3 = /Ù[ˆ„Œ]/.test(good);
  const markers = ['المنظومة', 'الوزارة', 'قانون'].map(k => `${k}:${good.includes(k)}`).join(' ');
  console.log(`${f}\n  Ø-class:${m1} â€:${m2} Ù-class:${m3} | ${markers}`);
}
