// scripts/fix-security-center.mjs — تعريب مركز الأمان
import fs from 'fs';

const file = 'src/app/components/labor/SecurityCenter.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ['<span className="font-bold text-sm">مركز الأمان والموثوقية — Zero Trust</span>',
   '<span className="font-bold text-sm">مركز الأمان والموثوقية</span>'],
  ["{health?.status || 'فحص...'}",
   "{health ? (health.status==='healthy'?'يعمل بكفاءة':'أداء منخفض') : 'جارٍ الفحص...'}"],
  ['<div className="font-bold mt-1">MFA</div><div>عند اللزوم + Session Vault</div>',
   '<div className="font-bold mt-1">تحقق مزدوج</div><div>طبقة تحقق إضافية عند الحساسية</div>'],
  ['<div className="font-bold mt-1">RBAC/ABAC</div><div>صلاحية + نطاق جغرافي</div>',
   '<div className="font-bold mt-1">صلاحيات دقيقة</div><div>حسب الدور والنطاق الجغرافي</div>'],
  ['<div className="font-bold mt-1">Audit</div><div>before/after + IP + Hash</div>',
   '<div className="font-bold mt-1">سجل الحركة</div><div>قبل/بعد مع بصمة رقمية</div>'],
  ['<div className="font-bold mt-1">Evidence</div><div>سلسلة أدلة غير قابلة للعبث</div>',
   '<div className="font-bold mt-1">الأدلة الرقمية</div><div>سلسلة موثقة غير قابلة للعبث</div>'],
  ["{health?.checks?.db || '...'}",
   "{health ? (health.checks?.db==='up'?'متصل':'غير متصل') : 'جارٍ الفحص...'}"],
  ["{health?.checks?.cache || 'up'}",
   "{health && health.checks?.cache==='up' ? 'تعمل' : 'قيد التهيئة'}"],
  ['<Badge variant="outline">active</Badge>\n              <div className="flex justify-between"><span>سير العمل</span><Badge variant="outline">active</Badge></div>',
   '<Badge variant="outline">نشط</Badge></div>\n              <div className="flex justify-between"><span>سير العمل</span><Badge variant="outline">نشط</Badge></div>'],
  ['سجل التدقيق (آخر 5) — غير قابل للتزوير من العميل',
   'آخر الحركات المسجلة — محمية من التلاعب'],
  [">{a.action} • {a.resource_type}</span>",
   ">{String(a.action||'').replace(/_/g,' ')} • {String(a.resource_type||'').replace(/_/g,' ')}</span>"],
  ['أسرار الإنتاج لا تُخزن في الكود — تُدار عبر Environment Vault مع TLS verify-full وRateLimit وInput Validation وFile Scanning',
   'البيانات الحساسة محفوظة بعيداً عن الشيفرة، والاتصالات مشفرة بالكامل مع فحص تلقائي للمدخلات والملفات'],
];

let missing = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('NOT FOUND:', a.substring(0, 55)); missing++; continue; }
  s = s.replace(a, b);
}
fs.writeFileSync(file, s, 'utf8');
console.log(missing ? `${missing} missed` : 'SecurityCenter done');
