/**
 * القاموس المؤسسي الموحد — المنظومة الوطنية للعمل النقابي
 * ترجمة معيارية لكل المصطلحات الظاهرة للمستخدم النهائي
 * ممنوع عرض أي رموز أو أكواد أو كلمات أجنبية في الواجهة
 */

// ---------- حالات الإنجاز والمهلة ----------
export const SLA_STATUS: Record<string, string> = {
  on_track: 'داخل المهلة',
  at_risk: 'قارب الانتهاء',
  overdue: 'تجاوز المهلة',
  met: 'منجز في المهلة',
  breached: 'متجاوز',
  paused: 'موقوف مؤقتاً',
};

// ---------- أولويات ----------
export const PRIORITY: Record<string, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
  urgent: 'عاجلة',
  critical: 'حرجة',
};

// ---------- حالة المعاملات والقضايا ----------
export const CASE_STATUS: Record<string, string> = {
  draft: 'مسودة',
  submitted: 'مقدَّم',
  under_review: 'تحت الدراسة',
  in_progress: 'قيد التنفيذ',
  pending_info: 'بانتظار مستندات',
  approved: 'معتمد',
  rejected: 'مرفوض',
  completed: 'مكتمل',
  closed: 'مغلق',
  cancelled: 'ملغى',
  active: 'نشط',
  suspended: 'موقوف',
  expired: 'منتهي',
};

// ---------- أنواع القضايا والطلبات ----------
export const CASE_TYPE: Record<string, string> = {
  complaint: 'شكوى',
  inquiry: 'استفسار',
  request: 'طلب خدمة',
  violation: 'مخالفة',
  inspection: 'زيارة تفتيشية',
  dispute: 'نزاع عمالي',
  license_renewal: 'تجديد رخصة',
  registration: 'تسجيل',
};

// ---------- درجات الخطورة ----------
export const SEVERITY: Record<string, string> = {
  critical: 'بالغة الأهمية',
  high: 'مرتفعة',
  medium: 'متوسطة',
  low: 'منخفضة',
  info: 'للعلم فقط',
  warning: 'تنبيه',
};

// ---------- صحة النظام ----------
export const HEALTH: Record<string, string> = {
  healthy: 'يعمل بكفاءة',
  degraded: 'أداء منخفض',
  unreachable: 'غير متصل',
  down: 'متوقف',
  up: 'يعمل',
  unknown: 'قيد الفحص',
};

// ---------- إجراءات سجل الحركة ----------
export const AUDIT_ACTION: Record<string, string> = {
  INSERT: 'إضافة',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  LOGIN: 'تسجيل دخول',
  LOGOUT: 'تسجيل خروج',
  LOGIN_FAILED: 'محاولة دخول فاشلة',
  APPROVE: 'اعتماد',
  REJECT: 'رفض',
  EXPORT: 'تصدير',
  PRINT: 'طباعة',
  VIEW: 'اطلاع',
  UPLOAD: 'رفع مستند',
  DOWNLOAD: 'تنزيل مستند',
};

// ---------- أدوار المستخدمين ----------
export const ROLE_LABEL: Record<string, string> = {
  ministry_admin: 'مدير الوزارة',
  ministry_staff: 'موظف الوزارة',
  union_admin: 'مدير النقابة',
  union_officer: 'موظف النقابة',
  enterprise_admin: 'مدير المنشأة',
  enterprise_user: 'موظف المنشأة',
  labor_inspector: 'مفتش عمل',
  compliance_officer: 'مسؤول امتثال',
  me: 'أنت',
};

// ---------- أنواع الكيانات ----------
export const ENTITY_TYPE: Record<string, string> = {
  persons: 'الأشخاص',
  person: 'شخص',
  establishments: 'المنشآت',
  establishment: 'منشأة',
  workers: 'العاملون',
  worker: 'عامل',
  contracts: 'العقود',
  contract: 'عقد',
  inspections: 'التفتيش',
  inspection: 'زيارة تفتيشية',
  cases: 'القضايا',
  case: 'قضية',
  unions: 'النقابات',
  union: 'نقابة',
  disputes: 'النزاعات',
  dispatches: 'الإيفادات',
  licenses: 'الرخص',
  violations: 'المخالفات',
};

// ---------- تصنيفات الخدمات العامة ----------
export const ACCESS_LEVEL: Record<string, string> = {
  public: 'عام',
  restricted: 'مقيّد',
  personal: 'خاص',
  confidential: 'سري',
  sensitive: 'حساس',
};

/** دالة مساعدة: تعريب آمن مع الرجوع للنص الأصلي إن لم يوجد */
export function ar(map: Record<string, string>, value?: string | null): string {
  if (!value) return '—';
  return map[value] ?? value;
}
