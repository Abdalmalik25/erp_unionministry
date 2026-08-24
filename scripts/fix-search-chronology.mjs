// scripts/fix-search-chronology.mjs — تعريب البحث الموحد والمزمنة الذكية
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

apply('src/app/components/labor/UnifiedSearch.tsx', [
  ['UnifiedSearch — بحث وطني موحد مع CorrelationId وتتبع', 'UnifiedSearch — البحث الوطني الموحد'],
  [">CorrelationId • Audit</Badge>", ">بحث موثق ومسجل</Badge>"],
  ["{meta && <span className=\"text-[11px] text-muted-foreground\">— {meta.took}ms • {meta.correlationId}</span>}",
   "{meta && <span className=\"text-[11px] text-muted-foreground\">— استجابة فورية ({meta.took} من الثانية)</span>}"],
  ["{h.subtitle || h.type}", "{h.subtitle || ''}"],
  [">{h.type}</Badge>", ">{ {establishment:'منشأة', worker:'عامل', union:'نقابة', case:'قضية', legal:'مرجع نظامي'}[h.type] || h.type }</Badge>"],
  ['بحث موحد عبر جميع السجلات مع تتبع CorrelationId وتسجيل تدقيقي',
   'بحث موحد عبر جميع السجلات الوطنية — كل عملية بحث موثقة في سجل الحركة'],
]);

apply('src/app/components/labor/SmartChronology.tsx', [
  ['SmartChronology — مزمنة ذكية دقيقة آمنة موثوقة سريعة\n * كل حدث: at (UTC) + actor + hash + type — لا تعديل صامت',
   'SmartChronology — السجل الزمني الموثق للمعاملة\n * كل حدث موثق بالتاريخ والوقت والمستخدم والبصمة الرقمية — لا تعديل صامت'],
  ['<span className="font-bold text-sm">المزمنة الذكية — {type} / {id.slice(0,8)}</span>',
   '<span className="font-bold text-sm">السجل الزمني الموثق</span>'],
  [">موثقة • {took}ms</Badge>", ">موثقة رقمياً • استجابة فورية</Badge>"],
  ["<Hash className=\"w-3 h-3 mr-2\"/>{e.hash}",
   "<Hash className=\"w-3 h-3 mr-2\"/><span title={e.hash}>بصمة رقمية موثقة</span>"],
  ['كل حدث بختم UTC + hash + actor — يُحفظ في `workflow_transitions_log + audit_log` — لا تعديل صامت — قابل للتدقيق القضائي',
   'كل حدث موثق بالتاريخ والوقت والمستخدم وبصمة رقمية غير قابلة للتغيير — محفوظ في السجلات الرسمية وقابل للتدقيق القضائي'],
]);
