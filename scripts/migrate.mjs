/**
 * UnionSphere Database Migration Script
 * يُنفَّذ: node scripts/migrate.mjs [service_role_key]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

const PROJECT_URL = process.env.SUPABASE_PROJECT_URL || 'https://tnzlusiymgdvsqfufmme.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// قبول service_role key كمعامل أو من البيئة
const SERVICE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const KEY = SERVICE_KEY || ANON_KEY;

// ============================================================
// إنشاء العميل
// ============================================================
const supabase = createClient(PROJECT_URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db:   { schema: 'public' },
});

// ============================================================
// أدوات مساعدة
// ============================================================
const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', gray: '\x1b[90m',
};
const c = (col, txt) => `${colors[col]}${txt}${colors.reset}`;
const log  = (msg) => console.log(c('cyan',  '  ▸ ') + msg);
const ok   = (msg) => console.log(c('green', '  ✓ ') + msg);
const warn = (msg) => console.log(c('yellow','  ⚠ ') + msg);
const fail = (msg) => console.log(c('red',   '  ✗ ') + msg);
const hr   = ()    => console.log(c('gray', '  ' + '─'.repeat(60)));

// ============================================================
// تقسيم SQL إلى عبارات
// ============================================================
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let dollarDepth = 0;
  let inDollar = false;
  let dollarTag = '';

  const lines = sql.split('\n');
  for (const line of lines) {
    // تخطي التعليقات
    if (line.trim().startsWith('--')) { continue; }

    current += line + '\n';

    // معالجة Dollar Quoting (في LANGUAGE plpgsql)
    const dollarMatches = [...line.matchAll(/\$([^$]*)\$/g)];
    for (const m of dollarMatches) {
      if (!inDollar) {
        inDollar = true;
        dollarTag = m[0];
        dollarDepth++;
      } else if (m[0] === dollarTag) {
        dollarDepth--;
        if (dollarDepth === 0) inDollar = false;
      }
    }

    if (!inDollar && current.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 1) statements.push(stmt);
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(s => s.length > 0 && !s.match(/^--/));
}

// ============================================================
// تصنيف العبارات
// ============================================================
function classifyStatement(sql) {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('CREATE EXTENSION'))  return 'EXTENSION';
  if (upper.startsWith('CREATE TYPE'))       return 'TYPE';
  if (upper.startsWith('CREATE TABLE'))      return 'TABLE';
  if (upper.startsWith('CREATE INDEX'))      return 'INDEX';
  if (upper.startsWith('CREATE OR REPLACE FUNCTION')) return 'FUNCTION';
  if (upper.startsWith('CREATE FUNCTION'))   return 'FUNCTION';
  if (upper.startsWith('CREATE TRIGGER'))    return 'TRIGGER';
  if (upper.startsWith('ALTER TABLE'))       return 'ALTER';
  if (upper.startsWith('CREATE POLICY'))     return 'POLICY';
  if (upper.startsWith('CREATE OR REPLACE VIEW')) return 'VIEW';
  if (upper.startsWith('INSERT'))            return 'SEED';
  return 'OTHER';
}

// ============================================================
// تنفيذ عبارة واحدة عبر REST
// ============================================================
async function execStatement(sql) {
  // المحاولة الأولى: supabase rpc لو تم إنشاؤها مسبقاً
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (!error) return { ok: true, method: 'rpc' };
  } catch (_) {}

  // المحاولة الثانية: Supabase REST SQL endpoint (يحتاج service_role)
  try {
    const res = await fetch(`${PROJECT_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'X-Supabase-SQL': sql,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.status < 400) return { ok: true, method: 'rest' };
  } catch (_) {}

  // المحاولة الثالثة: Management API
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/tnzlusiymgdvsqfufmme/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (res.status < 400) return { ok: true, method: 'management_api' };
    return { ok: false, error: body.message || body.error || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ============================================================
// التحقق من الاتصال
// ============================================================
async function checkConnection() {
  console.log(c('bold', '\n  🔌 اختبار الاتصال بـ Supabase...\n'));

  const res = await fetch(`${PROJECT_URL}/rest/v1/profiles?select=count&limit=0`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` },
  });

  if (res.status === 200) {
    ok(`الاتصال ناجح — ${PROJECT_URL}`);
    return true;
  } else if (res.status === 404) {
    warn('قاعدة البيانات موجودة لكن جدول profiles غير موجود — السكيما لم تُطبَّق بعد');
    return true;
  } else {
    const txt = await res.text();
    if (txt.includes('service_role')) {
      warn('الاتصال يعمل لكن يحتاج service_role key لتنفيذ DDL');
      return true;
    }
    fail(`فشل الاتصال: ${res.status} — ${txt.slice(0, 100)}`);
    return false;
  }
}

// ============================================================
// التنفيذ الرئيسي
// ============================================================
async function main() {
  console.log(c('bold', '\n' + '═'.repeat(64)));
  console.log(c('bold', '  UnionSphere — Database Migration'));
  console.log(c('bold', '  وزارة الشؤون الاجتماعية والعمل'));
  console.log(c('bold', '═'.repeat(64)));
  console.log(c('gray', `\n  Project: ${PROJECT_URL}`));
  console.log(c('gray', `  Key type: ${SERVICE_KEY ? 'service_role ✓' : 'anon (DDL غير مدعوم)'}\n`));

  if (!SERVICE_KEY) {
    warn('لا يوجد service_role key — DDL سيفشل مع المفتاح العام.');
    warn('للتنفيذ الكامل: node scripts/migrate.mjs <service_role_key>\n');
  }

  // اختبار الاتصال
  const connected = await checkConnection();
  if (!connected) {
    fail('تعذّر الاتصال بقاعدة البيانات. تحقق من بيانات المشروع.');
    process.exit(1);
  }

  // قراءة ملف السكيما
  const schemaPath = join(__dir, '../src/app/utils/schema.sql');
  let schema;
  try {
    schema = readFileSync(schemaPath, 'utf-8');
    ok(`قُرئ ملف السكيما (${Math.round(schema.length / 1024)} KB)`);
  } catch (e) {
    fail(`فشل قراءة schema.sql: ${e.message}`);
    process.exit(1);
  }

  // تقسيم العبارات
  const statements = splitStatements(schema);
  log(`عدد العبارات: ${statements.length}`);
  hr();

  // إحصاء حسب النوع
  const types = {};
  statements.forEach(s => {
    const t = classifyStatement(s);
    types[t] = (types[t] || 0) + 1;
  });
  console.log(c('gray', '\n  الأنواع:'));
  Object.entries(types).forEach(([t, n]) => console.log(c('gray', `    ${t.padEnd(12)} ${n}`)));
  hr();

  // محاولة التنفيذ
  let passed = 0, failed = 0;
  const failedStatements = [];

  console.log(c('bold', '\n  🚀 بدء التنفيذ...\n'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const type = classifyStatement(stmt);
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 60);

    process.stdout.write(`  [${String(i+1).padStart(3)}/${statements.length}] ${type.padEnd(10)} ${c('gray', preview)}...`);

    if (!SERVICE_KEY) {
      // بدون service_role — لا ننفذ، نجمع فقط
      process.stdout.write(c('yellow', ' SKIP\n'));
      failedStatements.push({ type, sql: stmt });
      failed++;
      continue;
    }

    const result = await execStatement(stmt);

    if (result.ok) {
      process.stdout.write(c('green', ` OK (${result.method})\n`));
      passed++;
    } else {
      // بعض الأخطاء مقبولة (already exists)
      const acceptable = result.error?.includes('already exists') ||
                         result.error?.includes('duplicate') ||
                         result.error?.includes('42P07');
      if (acceptable) {
        process.stdout.write(c('yellow', ' EXISTS\n'));
        passed++;
      } else {
        process.stdout.write(c('red', ` FAIL: ${result.error?.slice(0, 50)}\n`));
        failedStatements.push({ type, sql: stmt, error: result.error });
        failed++;
      }
    }
  }

  // التقرير النهائي
  hr();
  console.log(c('bold', '\n  النتيجة:\n'));
  ok(`نجح:   ${passed}`);
  if (failed > 0) fail(`فشل:   ${failed}`);
  console.log('');

  if (failedStatements.length > 0 || !SERVICE_KEY) {
    console.log(c('bold', c('yellow', '\n  📋 العبارات التي تحتاج تنفيذاً يدوياً:\n')));
    console.log(c('gray', '  افتح: https://supabase.com/dashboard/project/tnzlusiymgdvsqfufmme/sql/new'));
    console.log(c('gray', '  والصق محتوى: src/app/utils/schema.sql\n'));

    // حفظ ملف الفشل
    const failPath = join(__dir, '../src/app/utils/schema_manual.sql');
    const content = failedStatements.map(f =>
      `-- ${f.type}${f.error ? ' [ERROR: ' + f.error.slice(0,60) + ']' : ''}\n${f.sql}\n`
    ).join('\n');

    if (content.trim()) {
      try {
        const { writeFileSync } = await import('fs');
        writeFileSync(failPath, '-- Manual execution required\n' + content);
        warn(`حُفِظت العبارات في: src/app/utils/schema_manual.sql`);
      } catch (_) {}
    }
  }

  if (!SERVICE_KEY && failed > 0) {
    console.log(c('bold', c('red', '\n  ⚠ مطلوب: service_role key\n')));
    console.log('  للحصول عليه:');
    console.log(c('cyan', '  https://supabase.com/dashboard/project/tnzlusiymgdvsqfufmme/settings/api'));
    console.log(c('gray', '  ثم: node scripts/migrate.mjs <service_role_key>\n'));
  }
}

main().catch(e => {
  fail(`خطأ غير متوقع: ${e.message}`);
  process.exit(1);
});
