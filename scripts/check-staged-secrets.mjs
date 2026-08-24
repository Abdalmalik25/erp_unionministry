import { execSync } from 'child_process';
import fs from 'fs';

const files = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split(/\r?\n/);
const bad = [];
for (const f of files) {
  if (!/\.(mjs|js|ts|tsx|md|json|sql)$/.test(f)) continue;
  let s = '';
  try { s = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (/postgresql:\/\/[^\s'"]*:[^\s'"]+@/.test(s)) bad.push(`${f} (conn string)`);
  if (/sk-[A-Za-z0-9]{20}/.test(s)) bad.push(`${f} (api key)`);
}
console.log(bad.length ? 'SECRETS:\n' + bad.join('\n') : 'no secrets staged');
console.log('.env staged:', files.includes('.env'));
