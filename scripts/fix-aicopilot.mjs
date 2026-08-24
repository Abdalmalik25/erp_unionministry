// scripts/institutional-language-aicopilot.mjs — تعريب واجهة المساعد الذكي
import fs from 'fs';

const file = 'src/app/components/labor/AICopilot.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ["AICopilot — مساعد وطني مع RAG قانوني وحوكمة صارمة", "AICopilot — المساعد الذكي الوطني للعمل مع الاستناد للمراجع القانونية"],
  ["AI Assists — Law Governs — Human Decides", "يساند النظام القرار — والقانون يحكم — والإنسان يقرر"],
  ["عقد مهيكلاً مع التحقق القانوني والـ hash", "عقد مهيكلاً مع التحقق القانوني والبصمة الرقمية الموثقة"],
  [">المساعد الوطني للعمل — Labor AI Copilot<", ">المساعد الذكي الوطني للعمل<"],
  [">RAG • Governed • Human-in-loop<", ">مرجعي • خاضع للحوكمة • بإشراف بشري<"],
  [">Model: labor-copilot-v1<", ">الإصدار الرسمي الأول<"],
  [">Task: legal_qa<", ">استشارة نظامية<"],
  [">Human Review: مطلوب للقرارات الحساسة<", ">مراجعة بشرية للقرارات الحساسة<"],
  ["INSUFFICIENT_LEGAL_BASIS — لا إجابة قانونية حاسمة بدون مصدر موثق", "لا توجد إجابة حاسمة دون مرجع نظامي موثق — سيُحال السؤال إلى المختصين"],
  ["AI Governance: كل استدعاء يُسجل (Model/Version/Input/Sources/Output/Confidence/User/Timestamp/HumanReview/FinalDecision) — لا توليد قرار غير قابل للمراجعة",
   "ضمانات الحوكمة: كل استفسار يُسجل كاملاً في سجل الحركة الرسمي — لا يصدر أي قرار آلي غير قابل للمراجعة"],
];

let missing = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('NOT FOUND:', a.substring(0, 60)); missing++; continue; }
  s = s.replace(a, b);
}
fs.writeFileSync(file, s, 'utf8');
console.log(missing ? `${missing} replacements missed` : 'AICopilot done');
