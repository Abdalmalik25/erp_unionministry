// scripts/fix-ministry-workspace.mjs — تعريب مساحة عمل الوزارة
import fs from 'fs';

const file = 'src/app/pages/MinistryWorkspace.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ["{c.case_type} • {c.case_number} • {c.status}",
   "{c.case_type} • {c.case_number}"],
  [">{c.priority}</Badge>",
   ">{ {urgent:'عاجلة', high:'عالية', medium:'متوسطة', low:'منخفضة'}[c.priority] || c.priority }</Badge>"],
  [">{c.sla_status}</Badge>",
   ">{ {on_track:'داخل المهلة', at_risk:'قارب الانتهاء', overdue:'تجاوز المهلة'}[c.sla_status] || c.sla_status }</Badge>"],
  ['تفتيش — Risk-Based', 'التفتيش المبني على المخاطر'],
  ['Risk ≠ حكم قانوني — للترتيب فقط ما لم ينص القانون خلاف ذلك • الأدلة تُرفع مع Hash',
   'درجة المخاطرة للترتيب والتخطيط فقط وليست حكماً قانونياً • الأدلة تُرفع ببصمة رقمية موثقة'],
  ['تنبيهات SLA', 'تنبيهات مهل الإنجاز'],
  [">at_risk</Badge>", ">قارب الانتهاء</Badge>"],
  [">overdue</Badge>", ">تجاوز المهلة</Badge>"],
  [">on_track</Badge>", ">داخل المهلة</Badge>"],
];

let missing = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('NOT FOUND:', a.substring(0, 55)); missing++; continue; }
  s = s.replace(a, b);
}
// عرّبة باقي قيم الحالة الإنجليزية إن ظهرت
s = s.split('{c.status}').join("{ {hearing:'جلسة محددة', open:'مفتوحة', closed:'مغلقة', in_progress:'قيد التنفيذ'}[c.status] || '' }");
fs.writeFileSync(file, s, 'utf8');
console.log(missing ? `${missing} missed` : 'MinistryWorkspace done');
