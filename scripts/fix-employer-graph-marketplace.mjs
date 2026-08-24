// scripts/fix-employer-graph-marketplace.mjs — تعريب بوابة صاحب العمل والرسم البياني وسوق الخدمات
import fs from 'fs';

function apply(file, reps) {
  let s = fs.readFileSync(file, 'utf8');
  let missing = 0;
  for (const [a, b] of reps) {
    if (!s.includes(a)) { console.error(file.split('/').pop(), 'NOT FOUND:', a.substring(0, 55)); missing++; continue; }
    s = s.replace(a, b);
  }
  fs.writeFileSync(file, s, 'utf8');
  console.log(file.split('/').pop(), missing ? `${missing} missed` : 'done');
}

apply('src/app/pages/EmployerOS.tsx', [
  ['لا توجد قضايا مفتوحة — سيظهر هنا أي شكوى/نزاع/اعتراض مع الـ SLA والتنبيه قبل التأخر',
   'لا توجد قضايا مفتوحة — ستظهر هنا أي شكوى أو نزاع أو اعتراض مع مهلة الإنجاز والتنبيه قبل التأخر'],
  ['🔒 Zero Trust • RBAC/ABAC + Jurisdiction • كل إجراء يُسجل مع before/after وIP وEvidence Hash • الأداء: pagination + caching • Offline Field Mode للمفتش • مزمنة دقيقة 100%',
   'حماية قصوى بصلاحيات دقيقة حسب الدور والنطاق • كل إجراء موثق بالتفاصيل الكاملة وببصمة رقمية • أداء فوري مع حفظ تلقائي • يعمل دون اتصال في الزيارات الميدانية'],
]);

apply('src/app/components/labor/NationalLaborGraph.tsx', [
  ['<div className="text-[10px] font-mono text-slate-400">{n.id}</div>',
   '<div className="text-[10px] text-slate-400">{ {persons:"الأشخاص", establishments:"المنشآت", workers:"العاملون", contracts:"العقود", inspections:"التفتيش", cases:"القضايا", unions:"النقابات"}[n.id] || n.id }</div>'],
]);

apply('src/app/components/labor/ServiceMarketplace.tsx', [
  ['المستخدم يقول "أريد نقل عامل" → النظام يحدد الأهلية والوثائق والرسوم والـ SLA',
   'المستخدم يقول "أريد نقل عامل" ← فيحدد النظام الأهلية والمستندات المطلوبة والرسوم ومدة الإنجاز'],
  [">Eligibility • Documents • Fees • SLA • Office</Badge>",
   ">شروط الاستحقاق • المستندات • الرسوم • مدة الإنجاز • مكان التقديم</Badge>"],
  ['كل خدمة تمر عبر Workflow Engine الموحد (Eligibility → Documents → Payment → Review',
   'كل خدمة تمر عبر مسار إجرائي موحد ومعتمد (استحقاق ← مستندات ← رسوم ← مراجعة'],
]);
