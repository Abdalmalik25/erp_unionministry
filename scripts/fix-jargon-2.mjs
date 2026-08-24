// scripts/fix-jargon-2.mjs — الجولة الثانية للتعريب
import fs from 'fs';

function apply(file, reps) {
  let s = fs.readFileSync(file, 'utf8');
  let missing = 0;
  for (const [a, b] of reps) {
    if (!s.includes(a)) { console.error(file.split('/').pop(), 'NOT FOUND:', a.substring(0, 60)); missing++; continue; }
    s = s.replace(a, b);
  }
  fs.writeFileSync(file, s, 'utf8');
  console.log(file.split('/').pop(), missing ? `${missing} missed` : 'done');
}

apply('src/app/pages/ExcellenceDashboard.tsx', [
  ['SLOs + Golden Signals + Maturity + Predictive', 'مستهدفات الخدمة + مؤشرات القياس + النضج المؤسسي + التنبؤ'],
  ['SLOs • Golden Signals • نضج مؤسسي • تنبؤ • حوكمة • أداء &lt;100ms (cache)',
   'مستهدفات خدمة معتمدة • قياس لحظي • نضج مؤسسي • تنبؤ • حوكمة • استجابة فورية'],
  [">SLO 99.9%</Badge>", ">جاهزية 99.9%</Badge>"],
  ['SLOs — أهداف مستوى الخدم', 'مستهدفات مستوى الخدمة المعتمدة'],
  ["{maturity?.next ?? 'RAG pgvector'}", "{maturity?.next ?? 'البحث الذكي في المراجع'}"],
]);

apply('src/app/pages/ministry/AccountAdministration.tsx', [
  ['<span className="font-mono font-bold text-primary">{a.action}</span>',
   '<span className="font-bold text-primary">{ {INSERT:"إضافة", UPDATE:"تعديل", DELETE:"حذف", LOGIN:"تسجيل دخول", LOGOUT:"تسجيل خروج"}[a.action] || String(a.action||"").replace(/_/g," ") }</span>'],
  ['<span className="text-muted-foreground truncate">{a.table_name || \'\'} {a.notes || \'\'}</span>',
   '<span className="text-muted-foreground truncate">{a.table_name ? "في سجل " + a.table_name.replace(/_/g," ") : ""} {a.notes || ""}</span>'],
]);

apply('src/app/components/ErrorBoundary.tsx', [
  ['<summary className="text-sm text-muted-foreground cursor-pointer">', '<summary className="text-sm text-muted-foreground cursor-pointer">'],
]);
