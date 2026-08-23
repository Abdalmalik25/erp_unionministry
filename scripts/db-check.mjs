#!/usr/bin/env node
/**
 * db-check.mjs - فحص الاتصال بقاعدة البيانات الحقيقية (Supabase REST)
 * آمن: لا يطبع أي قيم من ملف البيئة على الإطلاق.
 * الاستخدام: node scripts/db-check.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

function loadEnv() {
  const vars = {};
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    console.error('✗ لم يُعثر على ملف .env');
    process.exit(1);
  }
  return vars;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('✗ متغيرات VITE_SUPABASE_URL أو VITE_SUPABASE_ANON_KEY غير معرّفة');
  process.exit(1);
}

const TABLES = ['unions', 'members', 'activities', 'documents', 'services', 'organizations', 'audit_logs'];

async function probeTable(name) {
  try {
    const res = await fetch(`${url}/rest/v1/${name}?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    });
    const range = res.headers.get('content-range');
    const count = range && range.includes('/') ? range.split('/')[1] : '?';
    if (res.ok) {
      return `✓ متاحة — صفوف: ${count}`;
    }
    if (res.status === 404) return '· غير موجودة (لا جدول)';
    return `✗ HTTP ${res.status}`;
  } catch (err) {
    return `✗ ${err.message}`;
  }
}

async function run() {
  const host = new URL(url).host;
  console.log(`فحص قاعدة البيانات على ${host} ...`);
  const probe = await probeTable('unions');
  if (probe.startsWith('✗') && !probe.startsWith('✗ HTTP')) {
    console.error('✗ لا يمكن الوصول إلى قاعدة البيانات:', probe);
    process.exit(1);
  }
  for (const name of TABLES) {
    const result = await probeTable(name);
    console.log(`  ${name.padEnd(14)} ${result}`);
  }
  console.log('— اكتمل الفحص —');
}

run().catch((err) => {
  console.error('✗ فشل غير متوقع:', err.message);
  process.exit(1);
});