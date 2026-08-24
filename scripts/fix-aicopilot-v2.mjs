// scripts/fix-aicopilot-v2.mjs — تعريب المساعد الذكي الإصدار الثاني
import fs from 'fs';

const file = 'src/app/components/labor/AICopilotV2.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ["AICopilotV2 — Streaming + Tool-use + Governed (beyond nuclear)",
   "AICopilotV2 — مسلسل فوري مع أدوات بحث نظامية وخاضع للحوكمة"],
  ['{ t:400, tool:"regulatory.search", text:"أبحث في التشريعات..." }',
   '{ t:400, tool:"البحث في اللوائح", text:"أبحث في التشريعات..." }'],
  ['{ t:900, tool:"workflow.lookup", text:"أطابق سير العمل..." }',
   '{ t:900, tool:"مطابقة الإجراءات", text:"أطابق سير العمل..." }'],
  ['{ t:1400, text:"النظر في النزاعات: شكوى → تصنيف (registry_officer) → صلح (legal_counsel) → جلسة → تسوية/تحكيم → قرار → استئناف." }',
   '{ t:1400, text:"النظر في النزاعات: شكوى ← تصنيف (موظف السجل) ← صلح (المستشار النظامي) ← جلسة ← تسوية أو تحكيم ← قرار ← استئناف." }'],
  [">AI Copilot V2 — Streaming Agentic<", ">المساعد الذكي المتقدم — إجابات فورية<"],
  [">Beyond Nuclear</Badge>", ">أداء متقدم</Badge>"],
  [">Tool-use • Streaming • Governed</Badge>", ">بحث موثق • إجابة فورية • خاضع للحوكمة</Badge>"],
  ['احسب SLA...', 'تحقق من مدة الإنجاز...'],
  [">{t}</Badge>", ">{t}</Badge>"], // أسماء الأدوات عُرّبت أعلاه
  [">Human Review مطلوب</Badge>", ">تتطلب مراجعة بشرية</Badge>"],
  [">Model: labor-copilot-v2 • Confidence 0.86</Badge>", ">الإصدار الرسمي الثاني — درجة الموثوقية 86%</Badge>"],
  ["V2: يخطط → يستدعي أدوات (regulatory/workflow/SLA) → يبث تدريجياً → يوثق `Model/Tools/Input/Sources/Output/Confidence/HumanReview` — لا قرار نهائي آلي",
   "المساعد المتقدم: يخطط الإجابة ← يستعلم السجلات الرسمية ← يعرضها فورياً ← ويوثق كل خطوة في سجل الحركة — لا قرار نهائي آلي"],
];

let missing = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('NOT FOUND:', a.substring(0, 55)); missing++; continue; }
  s = s.replace(a, b);
}
fs.writeFileSync(file, s, 'utf8');
console.log(missing ? `${missing} missed` : 'AICopilotV2 done');
