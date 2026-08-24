import { readFileSync } from 'fs';
const envContent = readFileSync('.env', 'utf8');
let count = 0;
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  if (k === 'JWT_SECRET') {
    count++;
    console.log('occurrence len:', v.length, '| first16:', JSON.stringify(v.substring(0, 16)));
  }
}
console.log('total JWT_SECRET lines:', count);
