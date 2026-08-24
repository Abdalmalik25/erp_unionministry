/**
 * laborRecordsConfig.ts — التكوين المركزي لسجلات قطاع شؤون العمل
 * مبني على البنية المرجعية الفعلية للقاعدة (النموذج الشخصي-المركزي persons):
 * - الجداول المرتبطة بأشخاص ترسل person_full_name / person_national_id / person_phone
 *   ويقوم الخادم بإنشاء الشخص أو ربطه تلقائياً بجدول persons.
 * - الأرقام التسلسلية (INS-/EMP-/ME-/INJ-/POL-/IRW-/FIT-/EXP-/PRC-/CRIT-)
 *   تُولَّد تلقائياً في الخادم عند تركها فارغة.
 * أي سجل جديد يُضاف هنا فقط.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Building, ClipboardCheck, Users, Shield, Briefcase, HeartPulse,
  BadgeCheck, UserCog, FileBadge, FileCheck2, Map,
} from 'lucide-react';

export const GOVERNORATES = [
  'أمانة العاصمة', 'صنعاء', 'عدن', 'تعز', 'الحديدة', 'حضرموت', 'إب', 'ذمار',
  'حجة', 'المهرة', 'صعدة', 'مأرب', 'البيضاء', 'الجوف', 'لحج', 'ريمة',
  'شبوة', 'أبين', 'الضالع', 'عمران', 'سقطرى',
];

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean' | 'email' | 'phone';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  colSpan?: 1 | 2;
  help?: string;
}

export interface RecordConfig {
  /** المعرّف داخل المصنع: directorates, ministry-offices, ... */
  resource: string;
  /** اسم الجدول في SQL */
  table: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /** أعمدة الجدول المعروضة (في الواجهة) */
  columns: Array<{ key: string; label: string; width?: string; type?: 'text' | 'badge' | 'number' | 'date' | 'boolean' }>;
  /** حقول نموذج الإضافة/التعديل */
  fields: FieldDef[];
  /** فلاتر سريعة أعلى الجدول (قيم enum في السجل) */
  filters: Array<{ key: string; label: string; options: string[] }>;
  /** حقول البحث */
  searchKeys: string[];
  /** مفتاح العرض الأساسي (يظهر في العنوان الجانبي / القوائم المنسدلة) */
  displayField: string;
  /** هل يظهر في لوحة إحصاءات المكون */
  showInStats?: boolean;
}

const ACTIVE_FIELD: FieldDef = { name: 'is_active', label: 'نشط', type: 'boolean' };
const ACTIVE_COL = { key: 'is_active', label: 'نشط', type: 'boolean' as const };

/** لون الشارة حسب قيمة الحالة/النتيجة */
export function getBadgeColor(value: string): string {
  const v = value || '';
  if (/(نشط|ساري|لائق$|معتمد|موثقة|صادرة|مُسكن|محسوم)/.test(v)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  if (/(قيد|مبلَّغ|مسجل|لائق بشروط|موقوف مؤقتاً)/.test(v)) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  if (/(غير لائق|ملغي|ملغاة|مرفوض|منتهي|قاتلة|وفاة|بالغة|موقوف)/.test(v)) return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

/** إيجاد إعدادات سجل بالمعرف */
export function findRecordConfig(resource: string): RecordConfig | undefined {
  return LABOR_RECORDS.find(r => r.resource === resource);
}

export const LABOR_RECORDS: RecordConfig[] = [
  {
    resource: 'directorates',
    table: 'directorates',
    title: 'سجل المديريات',
    subtitle: 'المستوى الثاني في التسلسل الإداري: محافظة / مديرية / عزلة — يربط دخول النظام بالمحافظة والمديرية',
    icon: Map,
    columns: [
      { key: 'name_ar', label: 'اسم المديرية' },
      { key: 'governorate', label: 'المحافظة', type: 'badge' },
      { key: 'code', label: 'الرمز' },
      { key: 'created_at', label: 'تاريخ الإنشاء', type: 'date' },
    ],
    fields: [
      { name: 'name_ar', label: 'اسم المديرية', type: 'text', required: true },
      { name: 'governorate', label: 'المحافظة', type: 'select', required: true, options: GOVERNORATES },
      { name: 'code', label: 'الرمز', type: 'text', placeholder: 'يُترك فارغاً للتوليد اليدوي فقط' },
      { name: 'notes', label: 'ملاحظات', type: 'textarea', colSpan: 2 },
    ],
    filters: [{ key: 'governorate', label: 'المحافظة', options: GOVERNORATES }],
    searchKeys: ['name_ar', 'code', 'governorate'],
    displayField: 'name_ar',
    showInStats: true,
  },
  {
    resource: 'ministry-offices',
    table: 'ministry_offices',
    title: 'سجل مكاتب الوزارة',
    subtitle: 'مكاتب الوزارة بمستوياتها (وزارة / محافظة / مديرية) مع الاختصاص الجغرافي والتواصل',
    icon: Building,
    columns: [
      { key: 'name_ar', label: 'اسم المكتب' },
      { key: 'office_code', label: 'رمز المكتب' },
      { key: 'office_type', label: 'المستوى', type: 'badge' },
      { key: 'governorate', label: 'المحافظة', type: 'badge' },
      { key: 'phone', label: 'الهاتف' },
      ACTIVE_COL,
    ],
    fields: [
      { name: 'name_ar', label: 'اسم المكتب', type: 'text', required: true },
      { name: 'office_type', label: 'المستوى', type: 'select', options: ['وزارة', 'محافظة', 'مديرية'] },
      { name: 'governorate', label: 'المحافظة', type: 'select', options: GOVERNORATES },
      { name: 'directorate', label: 'المديرية', type: 'text' },
      { name: 'address', label: 'العنوان', type: 'text', colSpan: 2 },
      { name: 'phone', label: 'الهاتف', type: 'phone' },
      { name: 'office_code', label: 'رمز المكتب', type: 'text', help: 'يُولَّد تلقائياً إذا تُرك فارغاً' },
      ACTIVE_FIELD,
    ],
    filters: [
      { key: 'governorate', label: 'المحافظة', options: GOVERNORATES },
      { key: 'office_type', label: 'المستوى', options: ['وزارة', 'محافظة', 'مديرية'] },
    ],
    searchKeys: ['name_ar', 'office_code'],
    displayField: 'name_ar',
    showInStats: true,
  },
  {
    resource: 'inspectors',
    table: 'inspectors',
    title: 'سجل المفتشين',
    subtitle: 'منظومة المفتشين المعتمدين: التخصص، المستوى، المكتب التابع، والاعتماد في مجال السلامة والصحة المهنية',
    icon: ClipboardCheck,
    columns: [
      { key: 'inspector_number', label: 'رقم المفتش' },
      { key: 'person_name', label: 'الاسم' },
      { key: 'specialization', label: 'التخصص', type: 'badge' },
      { key: 'governorate', label: 'المحافظة', type: 'badge' },
      ACTIVE_COL,
    ],
    fields: [
      { name: 'person_full_name', label: 'اسم المفتش الكامل', type: 'text', required: true },
      { name: 'person_national_id', label: 'الرقم الوطني للشخص', type: 'text', placeholder: 'يربط بسجل persons إن وجد' },
      { name: 'specialization', label: 'التخصص', type: 'select', options: ['تفتيش عمل', 'سلامة وصحة مهنية', 'علاقات عمل', 'أجور وحماية أجور'] },
      { name: 'governorate', label: 'محافظة العمل', type: 'select', options: GOVERNORATES },
      { name: 'inspector_number', label: 'رقم المفتش', type: 'text', help: 'INS-xxxxx يُولَّد تلقائياً إذا تُرك فارغاً' },
      ACTIVE_FIELD,
    ],
    filters: [{ key: 'specialization', label: 'التخصص', options: ['تفتيش عمل', 'سلامة وصحة مهنية', 'علاقات عمل', 'أجور وحماية أجور'] }],
    searchKeys: ['inspector_number', 'specialization'],
    displayField: 'person_name',
    showInStats: true,
  },
  {
    resource: 'ministry-employees',
    table: 'ministry_employees',
    title: 'سجل موظفي الوزارة',
    subtitle: 'موظفو الوزارة والمكاتب — برقم وظيفي ورقم وطني مؤسسي ME- مرتبطين بالنموذج المرجعي للأشخاص',
    icon: UserCog,
    columns: [
      { key: 'employee_number', label: 'الرقم الوظيفي' },
      { key: 'national_number', label: 'الرقم الوطني ME-', type: 'badge' },
      { key: 'person_name', label: 'الاسم' },
      { key: 'position', label: 'المسمى الوظيفي' },
      { key: 'department', label: 'الإدارة', type: 'badge' },
      ACTIVE_COL,
    ],
    fields: [
      { name: 'person_full_name', label: 'اسم الموظف الكامل', type: 'text', required: true },
      { name: 'person_national_id', label: 'الرقم الوطني للشخص', type: 'text', placeholder: 'يربط بسجل persons إن وجد' },
      { name: 'position', label: 'المسمى الوظيفي', type: 'text' },
      {
        name: 'department', label: 'الإدارة', type: 'select',
        options: ['مكتب الوزير', 'قطاع شؤون العمل', 'قطاع التفتيش', 'قطاع النقابات', 'الموارد البشرية', 'الشؤون المالية', 'تقنية المعلومات'],
      },
      { name: 'employee_number', label: 'الرقم الوظيفي EMP-', type: 'text', help: 'يُولَّد تلقائياً إذا تُرك فارغاً' },
      { name: 'national_number', label: 'الرقم الوطني ME-', type: 'text', help: 'ME-xxxxxx يُولَّد تلقائياً إذا تُرك فارغاً' },
      ACTIVE_FIELD,
    ],
    filters: [{
      key: 'department', label: 'الإدارة',
      options: ['مكتب الوزير', 'قطاع شؤون العمل', 'قطاع التفتيش', 'قطاع النقابات', 'الموارد البشرية', 'الشؤون المالية', 'تقنية المعلومات'],
    }],
    searchKeys: ['employee_number', 'national_number', 'position', 'department'],
    displayField: 'person_name',
    showInStats: true,
  },
  {
    resource: 'inspection-criteria',
    table: 'inspection_criteria',
    title: 'سجل معايير التفتيش',
    subtitle: 'المعايير الرسمية المنظمة لعمليات التفتيش: النوع، السريان، الوزن النسبي، والمرجعية القانونية',
    icon: Shield,
    columns: [
      { key: 'criteria_code', label: 'رمز المعيار' },
      { key: 'title_ar', label: 'عنوان المعيار' },
      { key: 'inspection_kind', label: 'نوع الزيارة', type: 'badge' },
      { key: 'applies_to', label: 'السريان', type: 'badge' },
      { key: 'status', label: 'الحالة', type: 'badge' },
    ],
    fields: [
      { name: 'title_ar', label: 'عنوان المعيار', type: 'text', required: true, colSpan: 2 },
      { name: 'description', label: 'الوصف التفصيلي', type: 'textarea', colSpan: 2 },
      {
        name: 'inspection_kind', label: 'نوع الزيارة', type: 'select',
        options: ['زيارة دورية', 'زيارة مفاجئة', 'بناءً على بلاغ', 'زيارة متابعة'],
      },
      { name: 'applies_to', label: 'السريان', type: 'select', options: ['جميع المنشآت', 'حسب القطاع', 'حسب النوع', 'حسب النشاط'] },
      { name: 'sector', label: 'القطاع (إن كان السريان حسب القطاع)', type: 'text' },
      { name: 'establishment_type', label: 'نوع المنشأة (إن كان السريان حسب النوع)', type: 'text' },
      { name: 'activity_isic4', label: 'النشاط ISIC4 (إن كان السريان حسب النشاط)', type: 'text' },
      { name: 'frequency_months', label: 'الدورية (بالأشهر)', type: 'number' },
      { name: 'weight', label: 'الوزن النسبي', type: 'number' },
      { name: 'is_mandatory', label: 'إلزامي', type: 'boolean' },
      { name: 'legal_reference', label: 'المرجعية القانونية', type: 'text' },
      { name: 'status', label: 'الحالة', type: 'select', options: ['ساري', 'موقوف مؤقتاً', 'ملغي'] },
    ],
    filters: [
      { key: 'inspection_kind', label: 'نوع الزيارة', options: ['زيارة دورية', 'زيارة مفاجئة', 'بناءً على بلاغ', 'زيارة متابعة'] },
      { key: 'applies_to', label: 'السريان', options: ['جميع المنشآت', 'حسب القطاع', 'حسب النوع', 'حسب النشاط'] },
      { key: 'status', label: 'الحالة', options: ['ساري', 'موقوف مؤقتاً', 'ملغي'] },
    ],
    searchKeys: ['title_ar', 'criteria_code', 'legal_reference'],
    displayField: 'title_ar',
    showInStats: true,
  },
  {
    resource: 'work-injuries',
    table: 'work_injuries',
    title: 'سجل الإصابات والأمراض المهنية',
    subtitle: 'تبليغ ومتابعة إصابات العمل والأمراض المهنية وفق اشتراطات التأمينات ضد إصابات العمل',
    icon: HeartPulse,
    columns: [
      { key: 'injury_number', label: 'رقم البلاغ' },
      { key: 'person_name', label: 'العامل المصاب' },
      { key: 'injury_date', label: 'تاريخ الإصابة', type: 'date' },
      { key: 'severity', label: 'الخطورة', type: 'badge' },
      { key: 'status', label: 'الحالة', type: 'badge' },
    ],
    fields: [
      { name: 'person_full_name', label: 'اسم العامل المصاب', type: 'text', required: true },
      { name: 'person_national_id', label: 'الرقم الوطني للعامل', type: 'text' },
      { name: 'injury_date', label: 'تاريخ الإصابة', type: 'date', required: true },
      { name: 'injury_type', label: 'نوع الحالة', type: 'select', options: ['إصابة عمل', 'مرض مهني', 'وفاة عمل'] },
      { name: 'severity', label: 'درجة الخطورة', type: 'select', options: ['بسيطة', 'متوسطة', 'بالغة', 'قاتلة'] },
      { name: 'location', label: 'موقع الإصابة بالجسم', type: 'text' },
      { name: 'description', label: 'وصف الحادثة', type: 'textarea', colSpan: 2 },
      { name: 'medical_report_url', label: 'رابط التقرير الطبي', type: 'text' },
      { name: 'status', label: 'حالة البلاغ', type: 'select', options: ['مبلَّغ', 'قيد التحقيق', 'قيد اللجنة', 'محسوم'] },
    ],
    filters: [
      { key: 'severity', label: 'الخطورة', options: ['بسيطة', 'متوسطة', 'بالغة', 'قاتلة'] },
      { key: 'injury_type', label: 'النوع', options: ['إصابة عمل', 'مرض مهني', 'وفاة عمل'] },
      { key: 'status', label: 'الحالة', options: ['مبلَّغ', 'قيد التحقيق', 'قيد اللجنة', 'محسوم'] },
    ],
    searchKeys: ['injury_number', 'location', 'description'],
    displayField: 'person_name',
    showInStats: true,
  },
  {
    resource: 'insurance-records',
    table: 'insurance_records',
    title: 'سجل التأمينات',
    subtitle: 'وثائق التأمين على العاملين: التغطية، الأقساط، الجهات المزودة، وربطها بإصابات العمل',
    icon: Briefcase,
    columns: [
      { key: 'policy_number', label: 'رقم الوثيقة' },
      { key: 'insurance_type', label: 'نوع التأمين', type: 'badge' },
      { key: 'enterprise_name', label: 'المنشأة' },
      { key: 'coverage_end', label: 'نهاية التغطية', type: 'date' },
      { key: 'status', label: 'الحالة', type: 'badge' },
    ],
    fields: [
      { name: 'insurance_type', label: 'نوع التأمين', type: 'select', options: ['تأمينات اجتماعية', 'تأمين إصابات عمل', 'تأمين صحي', 'أخرى'] },
      { name: 'policy_number', label: 'رقم الوثيقة', type: 'text', help: 'POL-xxxxxx يُولَّد تلقائياً إذا تُرك فارغاً' },
      { name: 'person_full_name', label: 'اسم المؤمَّن له', type: 'text' },
      { name: 'insured_national_id', label: 'الرقم الوطني للمؤمَّن له', type: 'text' },
      { name: 'enterprise_name', label: 'المنشأة', type: 'text' },
      { name: 'provider_name', label: 'الجهة المزودة', type: 'text' },
      { name: 'coverage_start', label: 'بداية التغطية', type: 'date' },
      { name: 'coverage_end', label: 'نهاية التغطية', type: 'date' },
      { name: 'premium_amount', label: 'قيمة القسط', type: 'number' },
      { name: 'coverage_amount', label: 'قيمة التغطية', type: 'number' },
      { name: 'beneficiaries_count', label: 'عدد المستفيدين', type: 'number' },
      { name: 'status', label: 'الحالة', type: 'select', options: ['ساري', 'منتهي', 'ملغي'] },
    ],
    filters: [
      { key: 'insurance_type', label: 'النوع', options: ['تأمينات اجتماعية', 'تأمين إصابات عمل', 'تأمين صحي', 'أخرى'] },
      { key: 'status', label: 'الحالة', options: ['ساري', 'منتهي', 'ملغي'] },
    ],
    searchKeys: ['policy_number', 'provider_name', 'enterprise_name'],
    displayField: 'policy_number',
    showInStats: true,
  },
  {
    resource: 'irregular-workers',
    table: 'irregular_workers',
    title: 'سجل العمالة غير المنتظمة',
    subtitle: 'قيد وتسكين العمالة غير المنتظمة: البائعون المتجولون والعمالة الموسمية وسبل تنظيم أوضاعهم',
    icon: Users,
    columns: [
      { key: 'registration_number', label: 'رقم القيد' },
      { key: 'full_name', label: 'الاسم' },
      { key: 'governorate', label: 'المحافظة', type: 'badge' },
      { key: 'activity_type', label: 'النشاط', type: 'badge' },
      { key: 'status', label: 'الحالة', type: 'badge' },
    ],
    fields: [
      { name: 'full_name', label: 'الاسم الكامل', type: 'text', required: true },
      { name: 'national_id', label: 'الرقم الوطني', type: 'text' },
      { name: 'gender', label: 'الجنس', type: 'select', options: ['ذكر', 'أنثى'] },
      { name: 'birth_date', label: 'تاريخ الميلاد', type: 'date' },
      { name: 'nationality', label: 'الجنسية', type: 'text' },
      { name: 'governorate', label: 'المحافظة', type: 'select', options: GOVERNORATES },
      { name: 'district', label: 'المديرية', type: 'text' },
      { name: 'phone', label: 'الهاتف', type: 'phone' },
      { name: 'activity_type', label: 'نوع النشاط', type: 'select', options: ['بيع متجول', 'خدمات متنقلة', 'عمل موسمي', 'حرف يدوية', 'أخرى'] },
      { name: 'workplace_description', label: 'وصف مكان العمل', type: 'text', colSpan: 2 },
      { name: 'daily_income', label: 'الدخل اليومي التقديري', type: 'number' },
      { name: 'monthly_income', label: 'الدخل الشهري التقديري', type: 'number' },
      { name: 'has_insurance', label: 'لديه تأمين', type: 'boolean' },
      { name: 'has_fitness_certificate', label: 'لديه شهادة لياقة', type: 'boolean' },
      { name: 'regularization_path', label: 'مسار التسكين', type: 'select', options: ['ترخيص بيع مؤقت', 'إدماج في منشأة', 'تمويل ذاتي', 'لا ينطبق'] },
      { name: 'status', label: 'الحالة', type: 'select', options: ['مسجل', 'قيد التسكين', 'مُسكن', 'موقوف'] },
    ],
    filters: [
      { key: 'governorate', label: 'المحافظة', options: GOVERNORATES },
      { key: 'activity_type', label: 'النشاط', options: ['بيع متجول', 'خدمات متنقلة', 'عمل موسمي', 'حرف يدوية', 'أخرى'] },
      { key: 'status', label: 'الحالة', options: ['مسجل', 'قيد التسكين', 'مُسكن', 'موقوف'] },
    ],
    searchKeys: ['full_name', 'registration_number', 'national_id', 'activity_type'],
    displayField: 'full_name',
    showInStats: true,
  },
  {
    resource: 'health-fitness-certificates',
    table: 'health_fitness_certificates',
    title: 'سجل شهادات اللياقة الصحية',
    subtitle: 'شهادات اللياقة الطبية للعمال المعرضين لمخاطر مهنية — مع تنبيهات استباقية قرب الانتهاء',
    icon: FileBadge,
    columns: [
      { key: 'certificate_number', label: 'رقم الشهادة' },
      { key: 'person_name', label: 'العامل' },
      { key: 'medical_center', label: 'المركز الطبي' },
      { key: 'expiry_date', label: 'تاريخ الانتهاء', type: 'date' },
      { key: 'fitness_result', label: 'النتيجة', type: 'badge' },
    ],
    fields: [
      { name: 'person_full_name', label: 'اسم العامل', type: 'text', required: true },
      { name: 'person_national_id', label: 'الرقم الوطني للعامل', type: 'text' },
      { name: 'certificate_number', label: 'رقم الشهادة', type: 'text', help: 'FIT-xxxxxx يُولَّد تلقائياً إذا تُرك فارغاً' },
      { name: 'issue_date', label: 'تاريخ الفحص', type: 'date' },
      { name: 'expiry_date', label: 'تاريخ الانتهاء', type: 'date' },
      { name: 'medical_center', label: 'المركز الطبي', type: 'text' },
      { name: 'issuing_authority', label: 'الجهة المصدرة', type: 'text' },
      { name: 'fitness_result', label: 'النتيجة', type: 'select', options: ['لائق', 'لائق بشروط', 'غير لائق'] },
      { name: 'restrictions', label: 'قيود العمل المفروضة', type: 'textarea', colSpan: 2 },
      { name: 'document_url', label: 'رابط المستند', type: 'text' },
    ],
    filters: [{ key: 'fitness_result', label: 'النتيجة', options: ['لائق', 'لائق بشروط', 'غير لائق'] }],
    searchKeys: ['certificate_number', 'medical_center', 'issuing_authority'],
    displayField: 'person_name',
    showInStats: true,
  },
  {
    resource: 'experience-certificates',
    table: 'experience_certificates',
    title: 'سجل شهادات الخبرة',
    subtitle: 'توثيق خبرات العمل المكتسبة: المهنة، مدة الخبرة، جهة الإصدار، والتحقق الرسمي منها',
    icon: FileCheck2,
    columns: [
      { key: 'certificate_number', label: 'رقم الشهادة' },
      { key: 'person_name', label: 'صاحب الشهادة' },
      { key: 'occupation', label: 'المهنة' },
      { key: 'experience_years', label: 'سنوات الخبرة', type: 'number' },
      { key: 'status', label: 'الحالة', type: 'badge' },
    ],
    fields: [
      { name: 'person_full_name', label: 'اسم صاحب الشهادة', type: 'text', required: true },
      { name: 'person_national_id', label: 'الرقم الوطني', type: 'text' },
      { name: 'certificate_number', label: 'رقم الشهادة', type: 'text', help: 'EXP-xxxxxx يُولَّد تلقائياً إذا تُرك فارغاً' },
      { name: 'occupation', label: 'المهنة', type: 'text' },
      { name: 'occupation_code', label: 'رمز المهنة ISCO', type: 'text' },
      { name: 'enterprise_name', label: 'جهة اكتساب الخبرة', type: 'text' },
      { name: 'experience_years', label: 'سنوات الخبرة', type: 'number' },
      { name: 'experience_level', label: 'مستوى الخبرة', type: 'select', options: ['مبتدئ', 'أخصائي', 'محترف', 'خبير'] },
      { name: 'issued_by', label: 'الجهة المصدرة', type: 'text' },
      { name: 'issue_date', label: 'تاريخ الإصدار', type: 'date' },
      { name: 'is_verified', label: 'موثقة رسمياً', type: 'boolean' },
      { name: 'status', label: 'الحالة', type: 'select', options: ['صادرة', 'موثقة', 'ملغاة'] },
    ],
    filters: [
      { key: 'experience_level', label: 'المستوى', options: ['مبتدئ', 'أخصائي', 'محترف', 'خبير'] },
      { key: 'status', label: 'الحالة', options: ['صادرة', 'موثقة', 'ملغاة'] },
    ],
    searchKeys: ['certificate_number', 'occupation', 'enterprise_name'],
    displayField: 'person_name',
    showInStats: true,
  },
  {
    resource: 'work-procedures',
    table: 'work_procedures',
    title: 'إجراءات وأنظمة العمل',
    subtitle: 'القرارات والإجراءات التنظيمية: أنظمة العمل، النقل، الإعارة، والعمل عن بعد وفق القانون رقم 40 لسنة 2025',
    icon: BadgeCheck,
    columns: [
      { key: 'procedure_code', label: 'رمز الإجراء' },
      { key: 'procedure_name', label: 'اسم الإجراء' },
      { key: 'procedure_type', label: 'النوع', type: 'badge' },
      { key: 'status', label: 'الحالة', type: 'badge' },
    ],
    fields: [
      { name: 'procedure_name', label: 'اسم الإجراء', type: 'text', required: true },
      { name: 'procedure_type', label: 'نوع الإجراء', type: 'select', options: ['نظام عمل', 'نقل خدمة', 'إعارة عامل', 'عمل عن بعد', 'ساعات عمل مخفضة'] },
      { name: 'person_full_name', label: 'العامل المعني', type: 'text' },
      { name: 'worker_national_id', label: 'الرقم الوطني للعامل', type: 'text' },
      { name: 'enterprise_name', label: 'المنشأة', type: 'text' },
      { name: 'start_date', label: 'تاريخ البداية', type: 'date' },
      { name: 'end_date', label: 'تاريخ النهاية', type: 'date' },
      { name: 'reference_number', label: 'الرقم المرجعي', type: 'text' },
      { name: 'approved_by', label: 'معتمِد الإجراء', type: 'text' },
      { name: 'approval_date', label: 'تاريخ الاعتماد', type: 'date' },
      { name: 'legal_basis', label: 'السند القانوني', type: 'text' },
      { name: 'description', label: 'التفاصيل', type: 'textarea', colSpan: 2 },
      { name: 'status', label: 'الحالة', type: 'select', options: ['قيد الدراسة', 'معتمد', 'مرفوض', 'منتهي'] },
    ],
    filters: [
      { key: 'procedure_type', label: 'النوع', options: ['نظام عمل', 'نقل خدمة', 'إعارة عامل', 'عمل عن بعد', 'ساعات عمل مخفضة'] },
      { key: 'status', label: 'الحالة', options: ['قيد الدراسة', 'معتمد', 'مرفوض', 'منتهي'] },
    ],
    searchKeys: ['procedure_name', 'procedure_code', 'reference_number'],
    displayField: 'procedure_name',
    showInStats: true,
  },
];
