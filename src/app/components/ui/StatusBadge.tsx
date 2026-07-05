/**
 * StatusBadge — شارات الحالة الموحّدة
 */

const STATUS_MAP: Record<string, { label: string; classes: string; dot?: string }> = {
  active:          { label: 'نشط',           classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  inactive:        { label: 'متوقف',         classes: 'bg-gray-100 text-gray-600 border-gray-200',          dot: 'bg-gray-400' },
  suspended:       { label: 'معلق',          classes: 'bg-amber-50 text-amber-700 border-amber-200',         dot: 'bg-amber-500' },
  dissolved:       { label: 'منحل',          classes: 'bg-red-50 text-red-700 border-red-200',               dot: 'bg-red-500' },
  under_review:    { label: 'تحت المراجعة', classes: 'bg-blue-50 text-blue-700 border-blue-200',             dot: 'bg-blue-400' },
  compliant:       { label: 'ملتزم',         classes: 'bg-green-50 text-green-700 border-green-200' },
  non_compliant:   { label: 'مخالف',         classes: 'bg-red-50 text-red-700 border-red-200' },
  warned:          { label: 'محذّر',         classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  sanctioned:      { label: 'معاقب',         classes: 'bg-red-100 text-red-800 border-red-300' },
  low:             { label: 'منخفض',         classes: 'bg-green-50 text-green-700 border-green-200' },
  medium:          { label: 'متوسط',         classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  high:            { label: 'عالٍ',           classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical:        { label: 'حرج',           classes: 'bg-red-100 text-red-800 border-red-300',              dot: 'bg-red-600' },
  draft:           { label: 'مسودة',         classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  submitted:       { label: 'مقدّم',         classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved:        { label: 'موافق عليه',    classes: 'bg-green-50 text-green-700 border-green-200' },
  rejected:        { label: 'مرفوض',         classes: 'bg-red-50 text-red-700 border-red-200' },
  archived:        { label: 'مؤرشف',         classes: 'bg-gray-50 text-gray-500 border-gray-100' },
  planned:         { label: 'مخطط',          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ongoing:         { label: 'جارٍ',           classes: 'bg-blue-50 text-blue-700 border-blue-200',            dot: 'bg-blue-500' },
  completed:       { label: 'منتهٍ',          classes: 'bg-green-50 text-green-700 border-green-200' },
  cancelled:       { label: 'ملغى',           classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  postponed:       { label: 'مؤجل',           classes: 'bg-purple-50 text-purple-700 border-purple-200' },
  open:            { label: 'مفتوحة',        classes: 'bg-red-50 text-red-700 border-red-200',               dot: 'bg-red-500' },
  resolved:        { label: 'محلولة',        classes: 'bg-green-50 text-green-700 border-green-200' },
  closed:          { label: 'مغلقة',         classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  appealed:        { label: 'مستأنفة',       classes: 'bg-purple-50 text-purple-700 border-purple-200' },
  valid:           { label: 'ساري',           classes: 'bg-green-50 text-green-700 border-green-200' },
  expired:         { label: 'منتهٍ',          classes: 'bg-red-50 text-red-700 border-red-200' },
  revoked:         { label: 'ملغى',           classes: 'bg-red-100 text-red-800 border-red-300' },
  pending_renewal: { label: 'قيد التجديد',   classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  pending:         { label: 'قيد الانتظار',  classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',      dot: 'bg-yellow-500' },
  processing:      { label: 'قيد المعالجة',  classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  minor:           { label: 'بسيطة',         classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  moderate:        { label: 'متوسطة',        classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  major:           { label: 'كبيرة',         classes: 'bg-red-50 text-red-700 border-red-200' },
  withdrawn:       { label: 'منسحب',         classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  deceased:        { label: 'متوفى',          classes: 'bg-gray-200 text-gray-500 border-gray-300' },
  current:         { label: 'محدّث',          classes: 'bg-green-50 text-green-700 border-green-200' },
  due_soon:        { label: 'قريب الانتهاء', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',      dot: 'bg-yellow-500' },
  overdue:         { label: 'متأخر',          classes: 'bg-red-50 text-red-700 border-red-200',               dot: 'bg-red-500' },
  in_process:      { label: 'قيد التجديد',   classes: 'bg-blue-50 text-blue-700 border-blue-200' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'sm', showDot = false }: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  if (!config) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-gray-50 text-gray-500 border-gray-200">
        {status}
      </span>
    );
  }
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${sizeClass} ${config.classes}`}>
      {(showDot && config.dot) && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  );
}
