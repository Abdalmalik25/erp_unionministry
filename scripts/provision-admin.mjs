#!/usr/bin/env node
// provision-admin.mjs — تزويد أول حساب مدير نظام رسمي بشكل آمن
// الاستخدام:
//   node scripts/provision-admin.mjs --name "الاسم الكامل" --email admin@gov.ye --password "كلمة_مرور_قوية"
// الخيارات:
//   --force    السماح بإنشاء مدير إضافي حتى لو وُجد مدير قائم
// الشروط الأمنية:
//   - كلمة المرور ≥ 10 خانات وتحتوي حرفاً كبيراً وصغيراً ورقماً ورمزاً
//   - يُرفض التنفيذ إن وُجد مدير نشط ما لم يُمرَّر --force
import pg from 'pg';
import fs from 'fs';
import { randomBytes, scryptSync } from 'crypto';

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const name = arg('name');
const email = String(arg('email') || '').toLowerCase().trim();
const password = arg('password');
const force = process.argv.includes('--force');

if (!name || !email || !password) {
  console.error('الاستخدام: node scripts/provision-admin.mjs --name "..." --email "..." --password "..." [--force]');
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('✗ البريد الإلكتروني غير صالح');
  process.exit(1);
}
const checks = [
  [password.length >= 10, 'طول كلمة المرور يجب أن يكون 10 خانات على الأقل'],
  [/[A-Z]/.test(password), 'يجب أن تحتوي كلمة المرور على حرف كبير'],
  [/[a-z]/.test(password), 'يجب أن تحتوي كلمة المرور على حرف صغير'],
  [/\d/.test(password), 'يجب أن تحتوي كلمة المرور على رقم'],
  [/[^A-Za-z0-9]/.test(password), 'يجب أن تحتوي كلمة المرور على رمز خاص'],
];
for (const [ok, msg] of checks) {
  if (!ok) { console.error('✗ ' + msg); process.exit(1); }
}

function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return { salt, hash };
}

const env = fs.readFileSync('.env', 'utf8');
const cs = env.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const c = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 30000 });
await c.connect();

const existing = await c.query(
  `SELECT COUNT(*)::int n FROM sector_users WHERE role = 'ministry_admin' AND is_active = true`);
if (existing.rows[0].n > 0 && !force) {
  console.error(`✗ يوجد ${existing.rows[0].n} مدير/مديري نظام نشطين بالفعل. استخدم --force لإضافة مدير آخر.`);
  await c.end();
  process.exit(1);
}
const dup = await c.query(`SELECT id FROM sector_users WHERE email = $1`, [email]);
if (dup.rows.length) {
  console.error('✗ هذا البريد مستخدم مسبقاً');
  await c.end();
  process.exit(1);
}

const { salt, hash } = hashPassword(password);
const r = await c.query(`
  INSERT INTO sector_users (id, name, email, password_hash, salt, role, user_type, is_active, created_at)
  VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ministry_admin', 'ministry', true, NOW())
  RETURNING id`, [name, email, hash, salt]);

console.log('✓ تم إنشاء حساب مدير النظام الرسمي:');
console.log('  المعرف: ' + r.rows[0].id);
console.log('  البريد: ' + email);
console.log('  الدور: ministry_admin (صلاحيات شاملة)');
await c.end();
