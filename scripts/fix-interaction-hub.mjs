// scripts/fix-interaction-hub.mjs — تعريب مركز التفاعل
import fs from 'fs';

const file = 'src/app/components/labor/InteractionHub.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ["text:'قيد المراجعة — SLA باقي 2 يوم'", "text:'قيد المراجعة — تبقى يومان من مدة الإنجاز المحددة'"],
  ['<span className="font-bold text-sm">تفاعل الأطراف — Interaction Hub</span>',
   '<span className="font-bold text-sm">تفاعل الأطراف</span>'],
  [">{m.from} • {m.role} • {new Date(m.at).toLocaleTimeString('ar-YE')}",
   ">{m.from} • { {labor_inspector:'مفتش عمل', employer:'صاحب العمل', compliance_officer:'مسؤول الرقابة', me:'أنت'}[m.role] || m.role } • {new Date(m.at).toLocaleTimeString('ar-YE')}"],
  ['كل رسالة تُسجل `audit + notification_event dedup_key` — لا تكرار، لا فقدان، مع `correlationId`',
   'كل رسالة موثقة في سجل الحركة الرسمي مع إشعار فوري — لا تكرار ولا فقدان'],
];

let missing = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('NOT FOUND:', a.substring(0, 55)); missing++; continue; }
  s = s.replace(a, b);
}
fs.writeFileSync(file, s, 'utf8');
console.log(missing ? `${missing} missed` : 'InteractionHub done');
