// scripts/fix-worker-passport.mjs — تعريب جواز العمل (بوابة المواطن)
import fs from 'fs';

const file = 'src/app/pages/WorkerPassport.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ['WorkerPassport — جواز العمل (My Labor Identity)', 'WorkerPassport — جواز العمل الرقمي للمواطن'],
  ["hash:'a3f1…9c2e'", "hash:''"],
  [">{c.status}</Badge>", ">{c.status}</Badge>"], // القيم عربية أصلاً
  ["<span className=\"text-[10px] font-mono text-slate-500\">hash: {c.hash}</span>",
   "<span className=\"text-[10px] text-slate-500\">{c.hash ? 'موسوم ببصمة رقمية موثقة' : ''}</span>"],
  ['لا توجد شكاوى — يمكنك تقديم بلاغ/شكوى وسيُنشأ Case مع CaseNumber وSLA وتتبع',
   'لا توجد شكاوى — يمكنك تقديم بلاغ أو شكوى وستحصل على رقم مرجعي مع مهلة إنجاز وتتبع كامل'],
  ["{ n:'عقد العمل الحالي', s:'موثق', d:'hash a3f1…9c2e' }",
   "{ n:'عقد العمل الحالي', s:'موثق', d:'ببصمة رقمية رسمية' }"],
  ['رفع وثيقة (مع Hash)', 'رفع وثيقة رسمية'],
  ['بياناتك الشخصية معزولة — لا يراها إلا المخولون حسب Jurisdiction والغرض.',
   'بياناتك الشخصية محمية بالكامل — لا يطّلع عليها إلا المخولون رسمياً وللغرض الرسمي فقط.'],
  ['Public • Restricted • Personal • Sensitive Employment • Confidential Case',
   'تصنيفات السرية المعتمدة: عام • مقيّد • خاص • حساس • سري'],
];

let missing = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('NOT FOUND:', a.substring(0, 55)); missing++; continue; }
  s = s.replace(a, b);
}
fs.writeFileSync(file, s, 'utf8');
console.log(missing ? `${missing} missed` : 'WorkerPassport done');
