/**
 * designSystem.ts — نظام التصميم الموحّد
 * مركز واحد للثوابت والألوان والأنماط المشتركة
 * لضمان ترابط جميع المكوّنات والشاشات
 */

// ============================================================
// الثوابت الأساسية
// ============================================================

export const DESIGN_TOKENS = {
  /** لون الوزارة الأساسي */
  primary: '#0A2540',
  /** اللون الأساسي الفاتح */
  primaryLight: '#1A4B8C',
  /** اللون الأساسي الساطح (للتركيز والحالات النشطة) */
  primaryBright: '#1D4ED8',
  /** اللون الذهبي (للتكريم والتميز) */
  gold: '#C9A84C',
  /** لون النجاح */
  success: '#16A34A',
  /** لون التحذير */
  warning: '#F59E0B',
  /** لون الخطأ */
  error: '#DC2626',
  /** لون المعلومات */
  info: '#1D4ED8',
} as const;

// ============================================================
// أصناف متكررة (Classes)
// ============================================================

export const COMMON = {
  /** حاوية بطاقة قياسية */
  card: 'bg-card rounded-xl border border-border shadow-sm',
  /** حاوية حقل نصي قياس */
  input: 'w-full px-3 py-2 text-sm bg-input-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
  /** زر ثانوي (خط تفصيلي) */
  buttonGhost: 'flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors',
  /** زر أساسي */
  buttonPrimary: 'flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary-bright transition-colors font-medium',
  /** حاوية جدول */
  table: 'bg-card rounded-xl border border-border shadow-sm overflow-hidden',
  /** ترويسة جدول */
  tableHeader: 'bg-muted border-b border-border',
  /** صف جدول */
  tableRow: 'hover:bg-accent/50 transition-colors border-b',
  /** حشوة خلية */
  cell: 'px-4 py-3',
  /** حالة فارغة */
  emptyState: 'bg-card rounded-xl border border-border shadow-sm py-16 text-center',
  /** شريط ترقيم */
  pagination: 'flex items-center justify-between px-4 py-3 border-t border-border',
} as const;

// ============================================================
// حالات النصائح القياسية
// ============================================================

export const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot?: string }> = {
  active:         { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  inactive:       { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
  suspended:      { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  dissolved:      { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  under_review:   { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
  approved:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected:       { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  draft:          { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  submitted:      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  archived:       { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100' },
  planned:        { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ongoing:        { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  completed:      { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled:      { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  postponed:      { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  open:           { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  resolved:       { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  closed:         { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  appealed:       { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  low:            { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  medium:         { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high:           { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical:       { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-600' },
  active_member:  { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  pending:        { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  expiring:       { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  expired:        { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  processing:     { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
} as const;

// ============================================================
// أنواع الأيقونات البيانية للأزرار
// ============================================================

export type ActionType = 'view' | 'edit' | 'delete' | 'export' | 'approve' | 'reject' | 'archive';

export const ACTION_BUTTON_STYLES: Record<ActionType, { color: string; hover: string }> = {
  view:    { color: 'text-blue-600',     hover: 'hover:bg-blue-50' },
  edit:    { color: 'text-green-600',    hover: 'hover:bg-green-50' },
  delete:  { color: 'text-red-500',      hover: 'hover:bg-red-50' },
  export:  { color: 'text-emerald-600',  hover: 'hover:bg-emerald-50' },
  approve: { color: 'text-green-600',    hover: 'hover:bg-green-50' },
  reject:  { color: 'text-red-600',      hover: 'hover:bg-red-50' },
  archive: { color: 'text-gray-500',     hover: 'hover:bg-gray-100' },
};

// ============================================================
// وظائف مساعدة
// ============================================================

/** تنسيق الأرقام بالعربية */
export function formatNumber(num: number | undefined | null): string {
  if (num == null) return '—';
  return num.toLocaleString('ar-YE');
}

/** تاريخ اليوم بصيغة عربية */
export function formatDate(date: string | Date, locale: 'ar-YE' | 'en-US' = 'ar-YE'): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** ترتيب فهرس الحجم */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** عدد الصفحات الكلي */
export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

/** دالة الحصول على فهرس الألوان الصحيح للدولة حسب القيمة */
export function getStatusClasses(status: string): { bg: string; text: string; border: string; dot?: string } {
  return STATUS_STYLES[status] || STATUS_STYLES.inactive;
}

/** تحويل الحالة الإنجليزية إلى عربي */
export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    active: 'نشط',
    inactive: 'متوقف',
    suspended: 'معلق',
    dissolved: 'منحل',
    under_review: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
    draft: 'مسودة',
    submitted: 'مقدّم',
    archived: 'مؤرشف',
    planned: 'مخطط',
    ongoing: 'جارٍ',
    completed: 'منتهٍ',
    cancelled: 'ملغى',
    open: 'مفتوح',
    resolved: 'محلول',
    closed: 'مغلق',
    appealed: 'مستأنف',
    low: 'منخفض',
    medium: 'متوسط',
    high: 'عالٍ',
    critical: 'حرج',
    pending: 'قيد الانتظار',
    active_member: 'عضو نشط',
    expiring: 'قريب الانتهاء',
    expired: 'منتهي',
    processing: 'قيد الإنجاز',
    valid: 'صالحة',
    conditional: 'شرطية',
    revoked: 'ملغاة',
    compliant: 'ملتزم',
    non_compliant: 'غير ملتزم',
    not_assessed: 'غير مُقيّمة',
  };
  return map[status] || status;
}
