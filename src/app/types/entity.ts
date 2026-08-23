/**
 * Organizational Entity Types
 * النماذج الموحدة للكيانات المؤسسية
 */

// ===============================
// الأنواع الأساسية
// ===============================

export type EntityType =
  | 'union'              // نقابة
  | 'organization'       // منظمة
  | 'federation'         // اتحاد
  | 'branch'             // فرع
  | 'committee'          // لجنة
  | 'department'         // إدارة
  | 'unit'               // وحدة
  | 'office';            // مكتب

export type Classification =
  | 'labor'              // عمالية
  | 'professional'       // مهنية
  | 'employers'          // أصحاب أعمال
  | 'charity'            // خيرية
  | 'social'             // اجتماعية
  | 'cultural'           // ثقافية
  | 'sports';            // رياضية

export type Sector =
  | 'industry'           // صناعة
  | 'services'           // خدمات
  | 'agriculture'        // زراعة
  | 'construction'       // إنشاءات
  | 'healthcare'         // صحة
  | 'education'          // تعليم
  | 'transportation'     // نقل
  | 'trade'              // تجارة
  | 'technology'         // تكنولوجيا
  | 'finance'            // مالية
  | 'tourism'            // سياحة
  | 'other';             // أخرى

export type GovernanceLevel =
  | 'national'           // وطني
  | 'regional'           // إقليمي
  | 'governorate'        // محافظة
  | 'directorate'        // مديرية
  | 'district';          // حي

export type GeographicScope =
  | 'nationwide'         // على مستوى الجمهورية
  | 'multi_governorate'  // عدة محافظات
  | 'single_governorate' // محافظة واحدة
  | 'directorate'        // مديرية
  | 'local';             // محلي

export type LegalForm =
  | 'syndicate'          // نقابة
  | 'association'        // جمعية
  | 'federation'         // اتحاد
  | 'cooperative'        // تعاونية
  | 'foundation';        // مؤسسة

export type EntityStatus =
  | 'active'             // نشط
  | 'suspended'          // معلق
  | 'inactive'           // متوقف
  | 'dissolved'          // منحل
  | 'under_review';      // تحت المراجعة

export type ComplianceStatus =
  | 'compliant'          // ملتزم
  | 'non_compliant'      // مخالف
  | 'under_review'       // تحت المراجعة
  | 'warned'             // محذر
  | 'sanctioned';        // معاقب

export type RiskLevel =
  | 'low'                // منخفض
  | 'medium'             // متوسط
  | 'high'               // عالي
  | 'critical';          // حرج

export type LicenseStatus =
  | 'valid'              // ساري
  | 'expired'            // منتهي
  | 'suspended'          // معلق
  | 'revoked'            // ملغى
  | 'pending_renewal';   // قيد التجديد

export type RenewalStatus =
  | 'current'            // محدّث
  | 'due_soon'           // قريب الانتهاء
  | 'overdue'            // متأخر
  | 'in_process';        // قيد التجديد

// ===============================
// الواجهات (Interfaces)
// ===============================

export interface ContactInfo {
  phone: string;
  mobile?: string;
  fax?: string;
  email: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface Address {
  governorate: string;
  city: string;
  directorate?: string;
  district?: string;
  street?: string;
  building?: string;
  floor?: string;
  office?: string;
  postalCode?: string;
  poBox?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LeadershipInfo {
  fullName: string;
  nationalId: string;
  position: string;
  appointmentDate: Date;
  endDate?: Date;
  phone?: string;
  email?: string;
}

export interface BoardMember {
  id: string;
  fullName: string;
  position: string;
  appointmentDate: Date;
  term?: string;
}

export interface WorkforceStats {
  totalMembers: number;
  activeMembers: number;
  maleMembers: number;
  femaleMembers: number;
  employees?: number;
  volunteers?: number;
}

export interface FinancialIndicators {
  annualBudget?: number;
  revenue?: number;
  expenses?: number;
  assets?: number;
  liabilities?: number;
  lastFinancialYear?: number;
}

export interface OfficialDocument {
  id: string;
  type: string;
  name: string;
  number?: string;
  issueDate?: Date;
  expiryDate?: Date;
  fileUrl?: string;
  status: string;
}

export interface License {
  id: string;
  licenseNumber: string;
  licenseType: string;
  issueDate: Date;
  expiryDate: Date;
  issuingAuthority: string;
  status: LicenseStatus;
}

export interface DigitalIdentity {
  entityCode: string;
  qrCode: string;
  digitalCertificate?: string;
  publicKey?: string;
  verificationUrl?: string;
}

export interface AIRiskAssessment {
  overallScore: number;
  financialRisk: number;
  complianceRisk: number;
  operationalRisk: number;
  reputationalRisk: number;
  factors: string[];
  recommendations: string[];
  assessmentDate: Date;
}

// ===============================
// النموذج الرئيسي
// ===============================

export interface OrganizationalEntity {
  // المعرفات الأساسية
  entityId: string;
  unifiedCode: string;
  registrationNumber: string;
  parentEntityId?: string;

  // التصنيف الذكي
  entityType: EntityType;
  classification: Classification;
  sector?: Sector;
  activityTypes?: string[];

  // المستوى التنظيمي
  governanceLevel?: GovernanceLevel;
  geographicScope?: GeographicScope;
  organizationalLevel: number;
  hierarchyPath?: string[];

  // المعلومات القانونية
  legalForm: LegalForm;
  licenseNumber?: string;
  licenseStatus?: LicenseStatus;
  establishmentDate: Date;
  registrationDate: Date;

  // الحالة والامتثال
  status: EntityStatus;
  complianceStatus: ComplianceStatus;
  riskLevel: RiskLevel;

  // المعلومات المؤسسية
  nameAr: string;
  nameEn?: string;
  description?: string;
  mission?: string;
  vision?: string;

  // معلومات الاتصال
  contactInfo: ContactInfo;
  address: Address;
  geoLocation?: GeoLocation;

  // القيادة والإدارة
  president: LeadershipInfo;
  vicePresident?: LeadershipInfo;
  secretary?: LeadershipInfo;
  treasurer?: LeadershipInfo;
  boardMembers?: BoardMember[];

  // الإحصائيات
  memberCount: number;
  branchCount: number;
  committeeCount: number;
  workforceStatistics?: WorkforceStats;

  // المؤشرات المالية
  financialIndicators?: FinancialIndicators;
  annualBudget?: number;

  // التفتيش والمراجعة
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  lastAuditDate?: Date;
  inspectionScore?: number;

  // التجديد والترخيص
  nextRenewalDate: Date;
  renewalStatus: RenewalStatus;

  // الوثائق الرسمية
  documents: OfficialDocument[];
  licenses: License[];

  // الهوية الرقمية
  digitalIdentity?: DigitalIdentity;
  qrCode?: string;
  digitalSignature?: string;

  // التكاملات الخارجية
  taxReference?: string;
  socialInsuranceRef?: string;
  commercialRegisterRef?: string;

  // الذكاء الاصطناعي
  aiClassificationScore?: number;
  aiRiskAssessment?: AIRiskAssessment;
  aiRecommendations?: string[];

  // التدقيق
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  metadata?: Record<string, any>;
  deletedAt?: Date;
  deletedBy?: string;
  custom_data?: Record<string, any>;
}

// ===============================
// أنواع مساعدة
// ===============================

export interface EntityTreeNode extends OrganizationalEntity {
  children?: EntityTreeNode[];
  expanded?: boolean;
  level?: number;
  hasChildren?: boolean;
}

export interface EntityFilters {
  entityType?: EntityType[];
  classification?: Classification[];
  sector?: Sector[];
  governorate?: string[];
  status?: EntityStatus[];
  complianceStatus?: ComplianceStatus[];
  riskLevel?: RiskLevel[];
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface EntityKPIs {
  totalEntities: number;
  activeEntities: number;
  inactiveEntities: number;
  suspendedEntities: number;
  underReview: number;
  compliantEntities: number;
  nonCompliantEntities: number;
  expiredLicenses: number;
  dueSoonRenewals: number;
  highRiskEntities: number;
  criticalAlerts: number;
  complianceRate: number;
  growthRate: number;
}

export interface EntityRelationship {
  relationshipId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: 'parent' | 'branch' | 'partner' | 'affiliated' | 'subsidiary';
  relationshipLevel?: number;
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'pending';
  metadata?: Record<string, any>;
  createdAt: Date;
}

// New Hybrid Typed Extensibility model: metadata registry (NOT EAV value store).
export interface CustomFieldDefinition {
  id?: string;
  entity_type: string;
  field_key: string;
  label: string;
  data_type:
    | 'text' | 'textarea' | 'integer' | 'decimal' | 'boolean' | 'date'
    | 'datetime' | 'time' | 'select' | 'multiselect' | 'reference'
    | 'currency' | 'percentage' | 'email' | 'phone' | 'url' | 'file';
  description?: string;
  required?: boolean;
  default_value?: any;
  options?: any[];
  validation_rules?: Record<string, any>;
  reference_entity?: string;
  visible_in_form?: boolean;
  visible_in_list?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  reportable?: boolean;
  printable?: boolean;
  importable?: boolean;
  exportable?: boolean;
  scope?: 'global' | 'entity';
  active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

// ===============================
// الترجمات
// ===============================

export const EntityTypeLabels: Record<EntityType, string> = {
  union: 'نقابة',
  organization: 'منظمة',
  federation: 'اتحاد',
  branch: 'فرع',
  committee: 'لجنة',
  department: 'إدارة',
  unit: 'وحدة',
  office: 'مكتب',
};

export const ClassificationLabels: Record<Classification, string> = {
  labor: 'عمالية',
  professional: 'مهنية',
  employers: 'أصحاب أعمال',
  charity: 'خيرية',
  social: 'اجتماعية',
  cultural: 'ثقافية',
  sports: 'رياضية',
};

export const SectorLabels: Record<Sector, string> = {
  industry: 'صناعة',
  services: 'خدمات',
  agriculture: 'زراعة',
  construction: 'إنشاءات',
  healthcare: 'صحة',
  education: 'تعليم',
  transportation: 'نقل',
  trade: 'تجارة',
  technology: 'تكنولوجيا',
  finance: 'مالية',
  tourism: 'سياحة',
  other: 'أخرى',
};

export const EntityStatusLabels: Record<EntityStatus, string> = {
  active: 'نشط',
  suspended: 'معلق',
  inactive: 'متوقف',
  dissolved: 'منحل',
  under_review: 'تحت المراجعة',
};

export const ComplianceStatusLabels: Record<ComplianceStatus, string> = {
  compliant: 'ملتزم',
  non_compliant: 'مخالف',
  under_review: 'تحت المراجعة',
  warned: 'محذر',
  sanctioned: 'معاقب',
};

export const RiskLevelLabels: Record<RiskLevel, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
  critical: 'حرج',
};
