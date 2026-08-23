/**
 * nationalDirectoriesConfig.ts — التكوين المركزي للمنظومة الوطنية المتقدمة
 * يربط: أدوار منظومة العمل ← الأدلة الوطنية ← السجلات والخدمات المرتبطة
 * وفق "المتطلبات الإضافية للنظام" — منصة العمل | وزارة الشؤون الاجتماعية والعمل
 */
import type { LucideIcon } from 'lucide-react';
import {
  Building2, User, Briefcase, Users, Handshake, Landmark, TrendingUp,
  ClipboardCheck, GraduationCap, Layers, Factory, FileText, Scale,
} from 'lucide-react';

export interface RoleQuickLink {
  label: string;
  path: string;
  description: string;
  icon: LucideIcon;
}

export interface LaborRole {
  key: string;
  nameAr: string;
  nameEn: string;
  description: string;
  icon: LucideIcon;
  color: string;          // خلفية الإيقونة
  focusAreas: string[];
  quickLinks: RoleQuickLink[];
}

export interface NationalDirectoryEntry {
  type: 'occupation' | 'activity' | 'establishment' | 'legal_form' | 'ownership';
  code: string;
  nameAr: string;
  nameEn: string;
  level: number;
}

/** الأدوار التسعة لمنظومة العمل */
export const LABOR_ROLES: LaborRole[] = [
  {
    key: 'employer',
    nameAr: 'صاحب العمل',
    nameEn: 'Employer',
    description: 'إدارة المنشأة والعمالة والالتزام بأنظمة العمل',
    icon: Building2,
    color: 'bg-blue-100 text-blue-700',
    focusAreas: ['سجل المنشأة', 'طلبات التقليص', 'مصادقة العقود', 'السلامة المهنية'],
    quickLinks: [
      { label: 'سجل منشأتي', path: '/ministry/commercial', description: 'بيانات المنشأة الرسمية', icon: Building2 },
      { label: 'طلبات التقليص', path: '/ministry/reduction-requests', description: 'الاستغناءات الاقتصادية', icon: Users },
      { label: 'تراخيص الوافدة', path: '/ministry/expatriate-licenses', description: 'العمالة غير اليمنية', icon: Briefcase },
      { label: 'إصابات عملي', path: '/ministry/labor-records/work-injuries', description: 'تبليغ ومتابعة الإصابات', icon: Scale },
    ],
  },
  {
    key: 'worker',
    nameAr: 'العامل',
    nameEn: 'Worker',
    description: 'ملفي المهني، لياقتي الصحية، شهادات خبرتي، نزاعاتي',
    icon: User,
    color: 'bg-green-100 text-green-700',
    focusAreas: ['ملف العامل', 'اللياقة الصحية', 'شهادات الخبرة', 'النزاعات'],
    quickLinks: [
      { label: 'ملفي الرقمي', path: '/ministry/worker-profiles', description: 'بياناتي المهنية', icon: User },
      { label: 'اللياقة الصحية', path: '/ministry/labor-records/health-fitness-certificates', description: 'شهادات اللياقة الطبية', icon: FileText },
      { label: 'شهادات الخبرة', path: '/ministry/labor-records/experience-certificates', description: 'توثيق خبراتي', icon: FileText },
      { label: 'إصابات عملي', path: '/ministry/labor-records/work-injuries', description: 'تبليغ ومتابعة', icon: Scale },
    ],
  },
  {
    key: 'job_seeker',
    nameAr: 'باحث عن العمل',
    nameEn: 'Job Seeker',
    description: 'مسارات التوظيف والتأهيل والمهن المطلوبة',
    icon: Briefcase,
    color: 'bg-amber-100 text-amber-700',
    focusAreas: ['المهن المطلوبة', 'التدريب', 'التوظيف'],
    quickLinks: [
      { label: 'استوديو المهن', path: '/ministry/professions', description: 'المهن ودرجة الطلب', icon: Briefcase },
      { label: 'برامج التدريب', path: '/ministry/training-records', description: 'فرص التأهيل', icon: GraduationCap },
      { label: 'شهادات الخبرة', path: '/ministry/labor-records/experience-certificates', description: 'توثيق خبراتي', icon: FileText },
    ],
  },
  {
    key: 'registration_office',
    nameAr: 'مكتب تسجيل',
    nameEn: 'Registration Office',
    description: 'تسجيل المنشآت والعمال والعمالة غير المنتظمة في نطاقي',
    icon: Handshake,
    color: 'bg-teal-100 text-teal-700',
    focusAreas: ['سجل المنشآت', 'سجل العمال', 'العمالة غير المنتظمة'],
    quickLinks: [
      { label: 'سجل المنشآت', path: '/ministry/commercial', description: 'قيد المنشآت', icon: Building2 },
      { label: 'سجل العمال', path: '/ministry/worker-profiles', description: 'قيد العمال', icon: Users },
      { label: 'العمالة غير المنتظمة', path: '/ministry/labor-records/irregular-workers', description: 'قيد وتدبير', icon: User },
    ],
  },
  {
    key: 'union',
    nameAr: 'اتحادات ونقابات',
    nameEn: 'Union',
    description: 'إدارة الأعضاء والانتخابات والنزاعات والتمدن العمالي',
    icon: Users,
    color: 'bg-purple-100 text-purple-700',
    focusAreas: ['الأعضاء', 'الانتخابات', 'النزاعات', 'الثقافة العمالية'],
    quickLinks: [
      { label: 'أعضاء المنظمة', path: '/ministry/members', description: 'سجل النقابيين', icon: Users },
      { label: 'الانتخابات', path: '/ministry/elections', description: 'الدورات الانتخابية', icon: Handshake },
      { label: 'الأنشطة', path: '/ministry/activities', description: 'سجل الفعاليات', icon: FileText },
    ],
  },
  {
    key: 'ministry_staff',
    nameAr: 'موظف الوزارة',
    nameEn: 'Ministry Staff',
    description: 'إدارة الملفات والسجلات والمعاملات وفق مسار العمل',
    icon: Landmark,
    color: 'bg-indigo-100 text-indigo-700',
    focusAreas: ['الملفات', 'المعاملات', 'السجلات'], 
    quickLinks: [
      { label: 'الموسوعة القانونية', path: '/ministry/legal-references', description: 'قانون العمل', icon: Scale },
      { label: 'التنبيهات الامتثال', path: '/ministry/compliance-alerts', description: 'التزام المؤسسات', icon: TrendingUp },
      { label: 'الموظفين', path: '/ministry/labor-records/ministry-employees', description: 'موظفو الوزارة', icon: User },
    ],
  },
  {
    key: 'decision_maker',
    nameAr: 'متخذ القرار',
    nameEn: 'Decision Maker',
    description: 'مؤشرات الوطن التشغيلية والتقارير الرقابية والمخاطر',
    icon: TrendingUp,
    color: 'bg-rose-100 text-rose-700',
    focusAreas: ['المؤشرات', 'التقارير', 'التحليل المقارن'],
    quickLinks: [
      { label: 'التقارير الرقابية', path: '/ministry/reports', description: 'الملخصات التشغيلية', icon: TrendingUp },
      { label: 'التحليل المقارن', path: '/ministry/comparative', description: 'استشراف', icon: Factory },
      { label: 'تقييم المخاطر', path: '/ministry/risk-assessments', description: 'مخاطر تنبؤية', icon: Scale },
    ],
  },
  {
    key: 'inspector',
    nameAr: 'المفتش',
    nameEn: 'Inspector',
    description: 'التفتيش الميداني والمعايير والمخالفات',
    icon: ClipboardCheck,
    color: 'bg-cyan-100 text-cyan-700',
    focusAreas: ['مهام التفتيش', 'معايير التفتيش', 'المخالفات'],
    quickLinks: [
      { label: 'التفتيش الميداني', path: '/ministry/inspections', description: 'السلامة المهنية', icon: ClipboardCheck },
      { label: 'معايير التفتيش', path: '/ministry/labor-records/inspection-criteria', description: 'معايير السجل', icon: Layers },
      { label: 'المخالفات', path: '/ministry/violations', description: 'سجل المخالفات', icon: Scale },
    ],
  },
  {
    key: 'trainer',
    nameAr: 'المدرب',
    nameEn: 'Trainer',
    description: 'البرامج التدريبية ومستويات التقييم والشهادات',
    icon: GraduationCap,
    color: 'bg-emerald-100 text-emerald-700',
    focusAreas: ['البرامج', 'التقييم', 'الشهادات'],
    quickLinks: [
      { label: 'البرامج التدريبية', path: '/ministry/training-records', description: 'الجلسات التدريبية', icon: GraduationCap },
      { label: 'شهادات الكفاءة', path: '/ministry/evaluation-certificates', description: 'مستويات الكفاءة', icon: FileText },
    ],
  },
];

/** الأدلة الوطنية الأساسية — تمهيد القيم الافتراضية */
export const NATIONAL_DIRECTORIES: Record<NationalDirectoryEntry['type'], NationalDirectoryEntry[]> = {
  occupation: [],
  activity: [],
  establishment: [
    { type: 'establishment', code: 'MICRO', nameAr: 'متناهية الصغر (1-4 عامل)', nameEn: 'Micro', level: 1 },
    { type: 'establishment', code: 'SML', nameAr: 'صغيرة (5-49 عامل)', nameEn: 'Small', level: 1 },
    { type: 'establishment', code: 'MED', nameAr: 'متوسطة (50-249 عامل)', nameEn: 'Medium', level: 1 },
    { type: 'establishment', code: 'LRG', nameAr: 'كبيرة (250+ عامل)', nameEn: 'Large', level: 1 },
  ],
  legal_form: [
    { type: 'legal_form', code: 'COM', nameAr: 'شركة', nameEn: 'Company', level: 1 },
    { type: 'legal_form', code: 'EST', nameAr: 'مؤسسة', nameEn: 'Establishment', level: 1 },
    { type: 'legal_form', code: 'SHOP', nameAr: 'محل تجاري', nameEn: 'Shop', level: 1 },
    { type: 'legal_form', code: 'OFF', nameAr: 'مكتب', nameEn: 'Office', level: 1 },
    { type: 'legal_form', code: 'CTR', nameAr: 'مركز', nameEn: 'Center', level: 1 },
  ],
  ownership: [
    { type: 'ownership', code: 'GOV', nameAr: 'حكومي', nameEn: 'Government', level: 1 },
    { type: 'ownership', code: 'MIX', nameAr: 'مختلط', nameEn: 'Mixed', level: 1 },
    { type: 'ownership', code: 'PRV', nameAr: 'خاص', nameEn: 'Private', level: 1 },
    { type: 'ownership', code: 'FGN', nameAr: 'أجنبي', nameEn: 'Foreign', level: 1 },
  ],
};

export function findRoleByKey(key: string): LaborRole | undefined {
  return LABOR_ROLES.find(r => r.key === key);
}

export function getNationalDirectories(): Record<NationalDirectoryEntry['type'], NationalDirectoryEntry[]> {
  return NATIONAL_DIRECTORIES;
}

/** الألوان الجاهزة لشارات الحالات الإنمائية */
export const ROLE_ACCENT_COLORS: Record<string, string> = {
  employer: 'bg-blue-50 border-blue-200',
  worker: 'bg-green-50 border-green-200',
  job_seeker: 'bg-amber-50 border-amber-200',
  registration_office: 'bg-teal-50 border-teal-200',
  union: 'bg-purple-50 border-purple-200',
  ministry_staff: 'bg-indigo-50 border-indigo-200',
  decision_maker: 'bg-rose-50 border-rose-200',
  inspector: 'bg-cyan-50 border-cyan-200',
  trainer: 'bg-emerald-50 border-emerald-200',
};