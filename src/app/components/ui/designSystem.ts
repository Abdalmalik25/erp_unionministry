/**
 * designSystem.ts — نظام التصميم الموحّد
 * مركز واحد للثوابت والألوان والأنماط المشتركة
 * لضمان ترابط جميع المكوّنات والشاشات
 */

// ============================================================
// الثوابت الأساسية
// ============================================================
// ملاحظة: هذه القيم مرآةٌ لرموز CSS الدلالية في src/styles/index.css
// (مصدر الحقيقة الفعلي للعرض — light-dark()). تُستخدم هنا للتوثيق
// والقيم البرمجية الخالصة فقط، ولم يعد يُعتمد عليها في التلوين.

export const DESIGN_TOKENS = {
  /** لون الوزارة الأساسي (كحلي) */
  primary: '#0a2540',
  /** اللون الأساسي الفاتح */
  primaryLight: '#1a4b8c',
  /** اللون الأساسي الساطح (للتركيز والحالات النشطة) */
  primaryBright: '#1d4ed8',
  /** اللون الذهبي (للتكريم والتميز) */
  gold: '#c9a84c',
  /** لون النجاح */
  success: '#16a34a',
  /** لون التحذير */
  warning: '#f59e0b',
  /** لون الخطأ */
  error: '#dc2626',
  /** لون المعلومات */
  info: '#1d4ed8',
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
// حالات النصائح القياسية — دلالية (Semantic) بالكامل
// ============================================================
// التمييز لا يعتمد على اللون وحده: كل حالة تحمل نصاً + نقطة لونية
// (dot) تُعرض افتراضياً داخل StatusBadge. الألوان مشتقة من رموز
// CSS الدلالية (--color-success/-warning/-error/-info) فتتكيف
// تلقائياً مع الوضع الفاتح/المظلم.

const SEMANTIC = {
  success:  { bg: 'bg-success/10',        text: 'text-success dark:text-success-light',        border: 'border-success/30',   dot: 'bg-success' },
  warning:  { bg: 'bg-warning/10',        text: 'text-warning-dark dark:text-warning-light',   border: 'border-warning/40',   dot: 'bg-warning' },
  error:    { bg: 'bg-error/10',          text: 'text-error-dark dark:text-error-light',       border: 'border-error/30',     dot: 'bg-error' },
  info:     { bg: 'bg-info/10',           text: 'text-info-dark dark:text-info-light',         border: 'border-info/30',      dot: 'bg-info' },
  primary:  { bg: 'bg-primary/10',        text: 'text-primary-bright dark:text-primary-light', border: 'border-primary/30',   dot: 'bg-primary-bright' },
  neutral:  { bg: 'bg-muted',             text: 'text-muted-foreground',                       border: 'border-border',       dot: 'bg-muted-foreground' },
  neutralLow: { bg: 'bg-muted/60',        text: 'text-muted-foreground',                       border: 'border-border/80',    dot: 'bg-gray-400' },
} as const;

export const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot?: string }> = {
  active:         { ...SEMANTIC.success,   dot: 'bg-success' },
  inactive:       { ...SEMANTIC.neutralLow },
  suspended:      SEMANTIC.warning,
  dissolved:      SEMANTIC.error,
  under_review:   SEMANTIC.info,
  approved:       SEMANTIC.success,
  rejected:       SEMANTIC.error,
  draft:          SEMANTIC.neutral,
  submitted:      SEMANTIC.info,
  archived:       SEMANTIC.neutralLow,
  planned:        SEMANTIC.primary,
  ongoing:        SEMANTIC.info,
  completed:      SEMANTIC.success,
  cancelled:      SEMANTIC.neutral,
  postponed:      SEMANTIC.primary,
  open:           SEMANTIC.error,
  resolved:       SEMANTIC.success,
  closed:         SEMANTIC.neutral,
  appealed:       SEMANTIC.primary,
  low:            SEMANTIC.success,
  medium:         SEMANTIC.warning,
  high:           SEMANTIC.warning,
  critical:       SEMANTIC.error,
  active_member:  SEMANTIC.success,
  pending:        SEMANTIC.warning,
  expiring:       SEMANTIC.warning,
  expired:        SEMANTIC.error,
  processing:     SEMANTIC.info,
} as const;

// ============================================================
// أنواع الأيقونات البيانية للأزرار
// ============================================================

export type ActionType = 'view' | 'edit' | 'delete' | 'export' | 'approve' | 'reject' | 'archive';

/** العناوين الوصفية القياسية لكل إجراء (للقارئات الصوتية والأدلة) */
export const ACTION_LABELS: Record<ActionType, string> = {
  view: 'عرض التفاصيل',
  edit: 'تعديل السجل',
  delete: 'حذف السجل',
  export: 'تصدير البيانات',
  approve: 'اعتماد السجل',
  reject: 'رفض السجل',
  archive: 'أرشفة السجل',
};

export const ACTION_BUTTON_STYLES: Record<ActionType, { color: string; hover: string; active: string }> = {
  view:    { color: 'text-info-dark dark:text-info-light',      hover: 'hover:bg-info/10',    active: 'active:bg-info/15' },
  edit:    { color: 'text-success-dark dark:text-success-light', hover: 'hover:bg-success/10', active: 'active:bg-success/15' },
  delete:  { color: 'text-error-dark dark:text-error-light',    hover: 'hover:bg-error/10',    active: 'active:bg-error/15' },
  export:  { color: 'text-primary-bright dark:text-primary-light', hover: 'hover:bg-primary/10', active: 'active:bg-primary/15' },
  approve: { color: 'text-success-dark dark:text-success-light', hover: 'hover:bg-success/10', active: 'active:bg-success/15' },
  reject:  { color: 'text-error-dark dark:text-error-light',    hover: 'hover:bg-error/10',    active: 'active:bg-error/15' },
  archive: { color: 'text-muted-foreground',                      hover: 'hover:bg-muted',      active: 'active:bg-accent' },
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
