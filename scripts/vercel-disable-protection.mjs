// scripts/vercel-disable-protection.mjs — تعطيل حماية النشر (SSO) لمشروع المنظومة
import fs from 'fs';
import path from 'path';
import os from 'os';

function findToken() {
  const candidates = [
    path.join(os.homedir(), '.local', 'share', 'com.vercel.cli', 'auth.json'),
    path.join(os.homedir(), 'AppData', 'Local', 'com.vercel.cli', 'auth.json'),
    path.join(os.homedir(), '.vercel', 'auth.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const j = JSON.parse(fs.readFileSync(c, 'utf8'));
      if (j.token) return j.token;
    }
  }
  return null;
}

const token = findToken();
if (!token) { console.error('no vercel token found'); process.exit(1); }

const TEAM = process.argv[2];
const PROJECT = process.argv[3];
if (!TEAM || !PROJECT) { console.error('usage: node scripts/vercel-disable-protection.mjs <teamIdOrSlug> <projectId>'); process.exit(1); }

const url = `https://api.vercel.com/v9/projects/${PROJECT}?teamId=${TEAM}`;
const res = await fetch(url, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ ssoMode: null }),
});
console.log('status:', res.status);
const t = await res.text();
try {
  const j = JSON.parse(t);
  console.log('ssoMode now:', j.ssoMode ?? '(disabled)');
  console.log('name:', j.name);
} catch {
  console.log(t.substring(0, 300));
}
