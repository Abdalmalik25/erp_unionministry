// scripts/fix-remaining-jargon.mjs — تعريب بقية الشاشات من المصطلحات التقنية
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
  ['التميز العالمي — Beyond Nuclear', 'لوحة التميز المؤسسي'],
  ['SLOs • Golden Signals • أداء <100ms (cache)', 'مستهدفات الخدمة المعتمدة • قياس لحظي • استجابة فورية'],
  ['Golden Signals: Latency, Traffic, Errors, Saturation — من `observability.js`',
   'مؤشرات القياس الرسمية: سرعة الاستجابة، حجم الاستخدام، نسبة الأخطاء، درجة التحمول'],
  ['نموذج: {forecast?.model ?? \'exponential_smoothing\'}', 'طريقة التنبؤ: التحليل الإحصائي المعتمد'],
  ['التالي: RAG pgvector', 'المرحلة القادمة: البحث الذكي في المراجع'],
  ['<100ms مع cache + edge', 'استجابة فورية مع الذاكرة المؤقتة'],
]);

apply('src/app/pages/ministry/AccountAdministration.tsx', [
  ['آخر الأثر المروض (Audit Trail)', 'سجل الحركة الأخير'],
  ['<span className="font-mono">{a.action}</span>', '<span>{ {INSERT:\'إضافة\', UPDATE:\'تعديل\', DELETE:\'حذف\', LOGIN:\'دخول\', LOGOUT:\'خروج\'}[a.action] || a.action }</span>'],
  ['{a.table_name}', '{a.table_name ? a.table_name.replace(/_/g, \' \') : \'\'}'],
]);

apply('src/app/components/ErrorBoundary.tsx', [
  ['<summary>تفاصيل الخطأ (للمطورين)</summary>', '<summary>التفاصيل الفنية — للمختصين فقط</summary>'],
]);

apply('src/app/pages/NotFound.tsx', [
  ['404', 'غير موجود'],
]);

apply('src/app/components/labor/OfflineIndicator.tsx', [
  ['PWA • IndexedDB • Service Worker v4 • حل تعارض Last-Write-Wins',
   'يعمل دون اتصال بالإنترنت مع حفظ آمن تلقائي وحل ذكي للتعارضات عند العودة'],
]);

apply('src/app/components/labor/VirtualizedTable.tsx', [
  ['بحث سريع (debounced)', 'بحث فوري أثناء الكتابة'],
  ['Projection • Pagination • Virtualized (لا N+1)', 'عرض محسّن بتحميل تدريجي — أداء ثابت مهما كان حجم البيانات'],
]);

apply('src/app/components/labor/ComplianceScoreCard.tsx', [
  ['Explainable • Audit Trail', 'مبرهن • موثق في السجل الرسمي'],
  ['(Time-Machine)', '(استعراض تاريخي كامل)'],
]);

apply('src/app/components/labor/WorkforceCommand.tsx', [
  ['معزولة ومقنّعة حسب الصلاحية — RBAC + Jurisdiction',
   'محمية ومعروضة حسب الصلاحية والنطاق المصرح به فقط'],
]);
