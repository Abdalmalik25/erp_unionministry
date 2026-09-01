/**
 * systems — السجل الموحّد للأنظمة الوطنية
 * ─────────────────────────────────────────────
 * مصدر واحد للبيانات: المسمّى القصير المألوف + الأيقونة + المسار + الصلاحية.
 * تُشتق منه القائمة الجانبية ولوحة عرض الأنظمة، بما يضمن اتساقاً وترابطاً
 * كاملاً بين كل نقاط العرض حسب صلاحية المستخدم ودوره فقط.
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Building2, Users, Vote, Activity, FileText,
  Briefcase, AlertTriangle, BarChart3, Bell, Settings, UserPlus,
  Send, MinusCircle, FolderTree, Shield, DollarSign, ClipboardCheck,
  Award, BadgeCheck, GraduationCap, Scale, Globe, BookOpen, TrendingUp,
  GitCompare, Settings2, BrainCircuit, Building, HeartPulse, Map,
  FileBadge, FileCheck2, UserCog, ListChecks, ShieldAlert, IdCard,
  Layers, Trophy, ShieldCheck, LineChart,
} from 'lucide-react';

export type SystemGroupId =
  | 'oversight'
  | 'labor-market'
  | 'registries'
  | 'unions'
  | 'occupations'
  | 'compliance'
  | 'services'
  | 'reports';

export interface SystemGroupDef {
  id: SystemGroupId;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

export interface SystemDef {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  group: SystemGroupId;
  icon: LucideIcon;
  /** مفتاح الصلاحية اللازم للعرض؛ غيابه = متاح للجميع */
  perm?: string;
}

export const SYSTEM_GROUPS: SystemGroupDef[] = [
  { id: 'oversight', title: 'المركزية والقيادة', description: 'المؤشرات الوطنية ومساحات العمل المشتركة', icon: LayoutDashboard, accent: 'from-primary to-primary-dark' },
  { id: 'labor-market', title: 'سوق العمل والمنشآت', description: 'المنشآت والشركات والعمالة وسوق العمل', icon: Building2, accent: 'from-teal to-teal-dark' },
  { id: 'registries', title: 'السجلات الوطنية', description: 'السجلات المرجعية للقطاع والوحدات', icon: Layers, accent: 'from-slate-700 to-slate-900' },
  { id: 'unions', title: 'النقابات والمنظمات', description: 'السجلات والهياكل والانتخابات النقابية', icon: Users, accent: 'from-indigo-600 to-indigo-900' },
  { id: 'occupations', title: 'المهن والتصنيفات', description: 'توصيف المهن والأنشطة والسجلات المعيارية', icon: Briefcase, accent: 'from-amber-600 to-amber-900' },
  { id: 'compliance', title: 'الرقابة والتفتيش', description: 'الامتثال والتفتيش والسلامة والنزاعات', icon: ShieldAlert, accent: 'from-rose-600 to-rose-900' },
  { id: 'services', title: 'الخدمات والوثائق', description: 'الخدمات الحكومية والوثائق والرسوم', icon: FileText, accent: 'from-emerald-600 to-emerald-900' },
  { id: 'reports', title: 'التقارير والرقابة', description: 'التقارير والتحليلات والتدقيق والإدارة', icon: BarChart3, accent: 'from-gold to-gold-dark' },
];

export const SYSTEMS: SystemDef[] = [
  // ===== المركزية والقيادة =====
  { id: 'indicators', title: 'مؤشرات الوزارة', subtitle: 'المؤشرات الوطنية والسجلات الموحدة', path: '/ministry/indicators', group: 'oversight', icon: LineChart, perm: 'dashboard:view' },
  { id: 'dashboard', title: 'أنظمتي', subtitle: 'لوحة عرض الأنظمة المتاحة لدورك', path: '/ministry', group: 'oversight', icon: LayoutDashboard, perm: 'dashboard:view' },
  { id: 'national-platform', title: 'المنظومة الوطنية', subtitle: 'الواجهة الوطنية الموحدة للقطاع', path: '/ministry/national-platform', group: 'oversight', icon: Globe, perm: 'dashboard:view' },
  { id: 'workspace', title: 'مساحة العمل', subtitle: 'مهامك وموافقاتك وقضاياك', path: '/ministry/workspace', group: 'oversight', icon: ClipboardCheck, perm: 'dashboard:view' },
  { id: 'employer-os', title: 'بوابة صاحب العمل', subtitle: 'تشغيل المنشآت ذاتياً', path: '/ministry/employer-os', group: 'oversight', icon: Building, perm: 'dashboard:view' },
  { id: 'worker-passport', title: 'جواز العمل', subtitle: 'الصفحة الرقمية للعامل', path: '/ministry/worker-passport', group: 'oversight', icon: IdCard, perm: 'dashboard:view' },
  { id: 'intelligence', title: 'مركز الذكاء', subtitle: 'استشراف وتحليلات سوق العمل', path: '/ministry/intelligence', group: 'oversight', icon: BrainCircuit, perm: 'comparative:view' },
  { id: 'excellence', title: 'التميز المؤسسي', subtitle: 'مؤشرات النضج والجاهزية', path: '/ministry/excellence', group: 'oversight', icon: Trophy, perm: 'users:view' },
  { id: 'data-quality', title: 'جودة البيانات', subtitle: 'صحة السجلات واكتمالها', path: '/ministry/data-quality', group: 'oversight', icon: ShieldCheck, perm: 'users:view' },
  { id: 'integrations', title: 'التكامل الخارجي', subtitle: 'الربط مع الأنظمة والخدمات', path: '/ministry/integrations', group: 'oversight', icon: Settings, perm: 'users:view' },
  { id: 'production-readiness', title: 'الجاهزية الإنتاجية', subtitle: 'شهادة الجاهزية للتشغيل', path: '/ministry/production-readiness', group: 'oversight', icon: BadgeCheck, perm: 'dashboard:view' },

  // ===== سوق العمل والمنشآت =====
  { id: 'commercial', title: 'المنشآت والشركات', subtitle: 'سجل المنشآت الاقتصادية', path: '/ministry/commercial', group: 'labor-market', icon: Building2, perm: 'commercial:view' },
  { id: 'worker-profiles', title: 'الملف الرقمي للعمالة', subtitle: 'عمالة المنشآت والسجلات', path: '/ministry/worker-profiles', group: 'labor-market', icon: Users, perm: 'workerProfiles:view' },
  { id: 'occupation-links', title: 'المهن والتوطين', subtitle: 'تسكين المهن (اليمننة)', path: '/ministry/occupation-links', group: 'labor-market', icon: Briefcase, perm: 'occupations:view' },
  { id: 'expatriate', title: 'تراخيص الوافدين', subtitle: 'العمالة غير اليمنية', path: '/ministry/expatriate-licenses', group: 'labor-market', icon: Globe, perm: 'expatriate:view' },
  { id: 'dispatches', title: 'الإرساليات', subtitle: 'إرساليات وتوجيه العمالة', path: '/ministry/dispatches', group: 'labor-market', icon: Send, perm: 'dispatches:view' },
  { id: 'reduction-requests', title: 'طلبات التقليص', subtitle: 'تقليص العمالة الاقتصادي', path: '/ministry/reduction-requests', group: 'labor-market', icon: MinusCircle, perm: 'reduction:view' },
  { id: 'employer-os', title: 'بوابة صاحب العمل', subtitle: 'خدمات المنشآت الذاتية', path: '/ministry/employer-os', group: 'labor-market', icon: Building, perm: 'dashboard:view' },
  { id: 'worker-passport', title: 'جواز العامل', subtitle: 'الصفحة الرقمية للعامل', path: '/ministry/worker-passport', group: 'labor-market', icon: IdCard, perm: 'dashboard:view' },

  // ===== السجلات الوطنية =====
  { id: 'directorates', title: 'سجل المديريات', subtitle: 'المحافظات والمديريات والعزل', path: '/ministry/labor-records/directorates', group: 'registries', icon: Map, perm: 'entities:view' },
  { id: 'ministry-offices', title: 'مكاتب الوزارة', subtitle: 'الوحدات والمكاتب الفرعية', path: '/ministry/labor-records/ministry-offices', group: 'registries', icon: Building, perm: 'entities:view' },
  { id: 'employees', title: 'سجل الموظفين', subtitle: 'موظفو القطاع وبياناتهم', path: '/ministry/labor-records/ministry-employees', group: 'registries', icon: UserCog, perm: 'entities:view' },
  { id: 'inspectors', title: 'سجل المفتشين', subtitle: 'المفتشون الميدانيون', path: '/ministry/labor-records/inspectors', group: 'registries', icon: ClipboardCheck, perm: 'inspections:view' },
  { id: 'inspection-criteria', title: 'معايير التفتيش', subtitle: 'المعايير والقوائم المرجعية', path: '/ministry/labor-records/inspection-criteria', group: 'registries', icon: ListChecks, perm: 'inspections:view' },
  { id: 'work-injuries', title: 'الإصابات المهنية', subtitle: 'الإصابات والأمراض المهنية', path: '/ministry/labor-records/work-injuries', group: 'registries', icon: HeartPulse, perm: 'compliance:view' },
  { id: 'insurance-records', title: 'التأمينات', subtitle: 'سجل التأمين الاجتماعي', path: '/ministry/labor-records/insurance-records', group: 'registries', icon: BadgeCheck, perm: 'compliance:view' },
  { id: 'irregular-workers', title: 'العمالة غير المنتظمة', subtitle: 'سجل القطاع غير المنظم', path: '/ministry/labor-records/irregular-workers', group: 'registries', icon: Users, perm: 'members:view' },
  { id: 'health-certificates', title: 'شهادات اللياقة', subtitle: 'شهادات اللياقة الصحية', path: '/ministry/labor-records/health-fitness-certificates', group: 'registries', icon: FileBadge, perm: 'members:view' },
  { id: 'experience-certificates', title: 'شهادات الخبرة', subtitle: 'سجل شهادات الخبرة', path: '/ministry/labor-records/experience-certificates', group: 'registries', icon: FileCheck2, perm: 'members:view' },
  { id: 'work-procedures', title: 'إجراءات العمل', subtitle: 'السياسات والإجراءات', path: '/ministry/labor-records/work-procedures', group: 'registries', icon: ShieldAlert, perm: 'compliance:view' },

  // ===== النقابات والمنظمات =====
  { id: 'unions', title: 'سجل النقابات', subtitle: 'النقابات والاتحادات العمالية', path: '/ministry/unions', group: 'unions', icon: Users, perm: 'entities:view' },
  { id: 'entity-relationships', title: 'الهياكل والتبعيات', subtitle: 'التبعية التنظيمية', path: '/ministry/entity-relationships', group: 'unions', icon: GitCompare, perm: 'entities:view' },
  { id: 'board-members', title: 'المجالس الإدارية', subtitle: 'مجالس وهيئات الإدارة', path: '/ministry/board-members', group: 'unions', icon: Users, perm: 'board:view' },
  { id: 'elections', title: 'الانتخابات', subtitle: 'الانتخابات والدورات النقابية', path: '/ministry/elections', group: 'unions', icon: Vote, perm: 'elections:view' },
  { id: 'members', title: 'النقابيون', subtitle: 'سجل الكوادر العمالية', path: '/ministry/members', group: 'unions', icon: Users, perm: 'members:view' },
  { id: 'activities', title: 'الأنشطة', subtitle: 'الفعاليات النقابية', path: '/ministry/activities', group: 'unions', icon: Activity, perm: 'activities:view' },

  // ===== المهن والتصنيفات =====
  { id: 'professions', title: 'توصيف المهن', subtitle: 'تصنيف المهن ISCO-08', path: '/ministry/professions', group: 'occupations', icon: Briefcase, perm: 'occupations:view' },
  { id: 'isic4', title: 'الأنشطة الاقتصادية', subtitle: 'تصنيف الأنشطة ISIC-4', path: '/ministry/isic4', group: 'occupations', icon: FolderTree, perm: 'occupations:view' },
  { id: 'national-directories', title: 'السجلات المعيارية', subtitle: 'التراميز والأكواد المرجعية', path: '/ministry/national-directories', group: 'occupations', icon: Layers, perm: 'occupations:view' },
  { id: 'training', title: 'التدريب والتأهيل', subtitle: 'سجلات التدريب المهني', path: '/ministry/training-records', group: 'occupations', icon: GraduationCap, perm: 'training:view' },

  // ===== الرقابة والتفتيش =====
  { id: 'labor-disputes', title: 'المنازعات العمالية', subtitle: 'النزاعات والصلح والتسوية', path: '/ministry/labor-disputes', group: 'compliance', icon: Scale, perm: 'laborDisputes:view' },
  { id: 'inspections', title: 'التفتيش الميداني', subtitle: 'محاضر التفتيش والسلامة', path: '/ministry/inspections', group: 'compliance', icon: ClipboardCheck, perm: 'inspections:view' },
  { id: 'violations', title: 'المخالفات', subtitle: 'المخالفات العمالية والإجراءات', path: '/ministry/violations', group: 'compliance', icon: AlertTriangle, perm: 'violations:view' },
  { id: 'certificates', title: 'شهادات الكفاءة', subtitle: 'الكفاءة والمطابقة المهنية', path: '/ministry/evaluation-certificates', group: 'compliance', icon: Award, perm: 'evaluation:view' },
  { id: 'licenses', title: 'تراخيص الأنشطة', subtitle: 'تراخيص مزاولة النشاط', path: '/ministry/licenses', group: 'compliance', icon: BadgeCheck, perm: 'licenses:view' },
  { id: 'compliance-alerts', title: 'تنبيهات الامتثال', subtitle: 'إنذارات الالتزام القانوني', path: '/ministry/compliance-alerts', group: 'compliance', icon: Shield, perm: 'compliance:view' },
  { id: 'compliance-matrices', title: 'مصفوفات الامتثال', subtitle: 'معايير الالتزام المؤسسي', path: '/ministry/compliance-matrices', group: 'compliance', icon: ClipboardCheck, perm: 'compliance:view' },
  { id: 'risk-assessments', title: 'تقييم المخاطر', subtitle: 'التنبؤ بالمخاطر وتحليلها', path: '/ministry/risk-assessments', group: 'compliance', icon: ShieldAlert, perm: 'compliance:view' },
  { id: 'maturity', title: 'النضج المؤسسي', subtitle: 'مؤشرات النضج والتطور', path: '/ministry/maturity-assessments', group: 'compliance', icon: TrendingUp, perm: 'compliance:view' },
  { id: 'regulatory-rules', title: 'القواعد التشريعية', subtitle: 'محرك القواعد المنظمة', path: '/ministry/regulatory-rules', group: 'compliance', icon: BookOpen, perm: 'legal:view' },
  { id: 'legal-references', title: 'الموسوعة القانونية', subtitle: 'قانون العمل والمراجع', path: '/ministry/legal-references', group: 'compliance', icon: BookOpen, perm: 'legal:view' },
  { id: 'regulatory-rules', title: 'القواعد التشريعية', subtitle: 'محرك القواعد المنظمة', path: '/ministry/regulatory-rules', group: 'compliance', icon: Shield, perm: 'legal:view' },

  // ===== الخدمات والوثائق =====
  { id: 'documents', title: 'الوثائق والأرشيف', subtitle: 'اللوائح والأرشيف الرسمي', path: '/ministry/documents', group: 'services', icon: FileText, perm: 'documents:view' },
  { id: 'services', title: 'بوابة الخدمات', subtitle: 'الخدمات والمعاملات الحكومية', path: '/ministry/services', group: 'services', icon: Briefcase, perm: 'services:view' },
  { id: 'notifications', title: 'التنبيهات', subtitle: 'الإشعارات والتنبيهات', path: '/ministry/notifications', group: 'services', icon: Bell, perm: 'notifications:view' },
  { id: 'fee-payments', title: 'سداد الرسوم', subtitle: 'التحصيل المالي والرسوم', path: '/ministry/fee-payments', group: 'services', icon: DollarSign, perm: 'fees:view' },
  { id: 'service-catalog', title: 'إدارة الخدمات', subtitle: 'إعداد كتالوج الخدمات', path: '/ministry/service-catalog', group: 'services', icon: Settings2, perm: 'users:view' },
  { id: 'contracts', title: 'العقود', subtitle: 'إدارة عقود العمل', path: '/ministry/contracts', group: 'services', icon: FileText, perm: 'documents:view' },
  { id: 'osh-incidents', title: 'حوادث OSH', subtitle: 'حوادث الصحة والسلامة', path: '/ministry/osh-incidents', group: 'services', icon: HeartPulse, perm: 'compliance:view' },
  { id: 'employer-self-service', title: 'خدمة ذاتية للمنشأة', subtitle: 'خدمات المنشآت الذاتية', path: '/ministry/employer-self-service', group: 'services', icon: Briefcase, perm: 'dashboard:view' },

  // ===== التقارير والرقابة =====
  { id: 'reports', title: 'التقارير', subtitle: 'التقارير الرقابية والإحصائية', path: '/ministry/reports', group: 'reports', icon: BarChart3, perm: 'reports:view' },
  { id: 'comparative', title: 'التحليل المقارن', subtitle: 'استشراف وتحليل المؤشرات', path: '/ministry/comparative', group: 'reports', icon: GitCompare, perm: 'comparative:view' },
  { id: 'audit', title: 'سجل التدقيق', subtitle: 'الرقابة الأمنية المؤسسية', path: '/ministry/audit', group: 'reports', icon: ShieldAlert, perm: 'audit:view' },
  { id: 'system-admin', title: 'إدارة النظام', subtitle: 'الإعدادات المتقدمة والمستخدمون', path: '/ministry/system-administration', group: 'reports', icon: Settings, perm: 'users:view' },
  { id: 'accounts', title: 'الحسابات', subtitle: 'طلبات وفتح الحسابات', path: '/ministry/accounts', group: 'reports', icon: UserPlus, perm: 'users:view' },
  { id: 'roles', title: 'الأدوار الوظيفية', subtitle: 'معرض الأدوار والصلاحيات', path: '/ministry/roles', group: 'reports', icon: Users, perm: 'users:view' },
];

/** تجميع الأنظمة حسب المجموعة بالترتيب الرسمي */
export function getSystemsByGroup() {
  return SYSTEM_GROUPS.map((group) => ({
    ...group,
    items: SYSTEMS.filter((s) => s.group === group.id),
  }));
}

/** استرجاع نظام واحد حسب المسار */
export function getSystemByPath(pathname: string): SystemDef | undefined {
  return SYSTEMS.find((s) => s.path === pathname);
}