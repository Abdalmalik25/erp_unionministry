/**
 * Commercial Establishments Management System - النظام النووي الكامل
 * نظام إدارة المنشآت التجارية المؤسسي المتكامل
 * وزارة الشؤون الاجتماعية والعمل - الجمهورية اليمنية
 */

// ============================================================
// الكيانات الأساسية (Entities)
// ============================================================

export interface CommercialEstablishmentCore {
  // المعرفات الوحيدة
  establishmentId: string;          // UUID
  unifiedCode: string;              // الرمز الموحد
  commercialRegisterNumber: string;   // رقم السجل التجاري
  
  // البيانات الأساسية
  nameAr: string;
  nameEn?: string;
  shortName?: string;
  slogan?: string;
  
  // النوع والتصنيف
  entityType: CommercialEntityType;
  classification: Classification;
  sector: Sector;
  
  // التوثيق القانوني
  legalStatus: LegalStatus;
  licenseInfo: LicenseInfo;
  registrationInfo: RegistrationInfo;
  
  // البيانات المالية
  financialInfo: FinancialInfo;
  
  // العنوان والموقع
  addresses: AddressInfo;
  
  // الاتصال
  contacts: ContactInfo;
  
  // الملكية
  ownership: OwnershipInfo;
  
  // الإدارة
  management: ManagementInfo;
  
  // الأنشطة
  activities: ActivityInfo[];
  
  // الفروع
  branches: BranchInfo[];
  
  // المعدات
  equipment: EquipmentInfo[];
  
  // المخازن
  warehouses: WarehouseInfo[];
  
  // العقود
  contracts: ContractInfo[];
  
  // الموظفون
  employees: EmployeeInfo[];
  
  // المخاطر والامتثال
  compliance: ComplianceInfo;
  
  // التدقيق والأرشفة
  audit: AuditInfo;
  
  // الحالة
  status: EntityStatus;
  lifecycle: LifecycleInfo;
}

// ============================================================
// الأنواع والتصنيفات
// ============================================================

export type CommercialEntityType = 
  | 'company' | 'corporation' | 'partnership' | 'llc' | 'cooperative'
  | 'factory' | 'shop' | 'office' | 'warehouse' | 'restaurant' | 'service' | 'craft' | 'other';

export type Classification = 
  | 'small' | 'medium' | 'large' | 'mega';

export type Sector = 
  | 'industry' | 'services' | 'agriculture' | 'construction' | 'healthcare'
  | 'education' | 'transportation' | 'trade' | 'technology' | 'finance' | 'tourism' | 'other';

// ============================================================
// الحالة القانونية
// ============================================================

export interface RegistrationInfo {
  registrationNumber: string;
  registrationDate: Date;
  issuingAuthority: string;
  expiryDate?: Date;
  status: 'valid' | 'expired' | 'revoked';
}

export interface LegalStatus {
  legalForm: LegalForm;
  registrationAuthority: string;
  registrationDate: Date;
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: Date;
  licenseExpiryDate?: Date;
  licenseIssuingAuthority?: string;
}

export type LegalForm = 
  | 'syndicate' | 'association' | 'federation' | 'cooperative' | 'foundation' | 'company';

// ============================================================
// معلومات الترخيص
// ============================================================

export interface LicenseInfo {
  licenses: LicenseRecord[];
  permits: PermitRecord[];
  certificates: CertificateRecord[];
}

export interface LicenseRecord {
  id: string;
  licenseNumber: string;
  licenseType: string;
  issueDate: Date;
  expiryDate: Date;
  issuingAuthority: string;
  renewalStatus: RenewalStatus;
  attachment?: string;
}

export interface PermitRecord {
  id: string;
  permitType: string;
  issueDate: Date;
  expiryDate?: Date;
  authority: string;
  status: 'valid' | 'expired' | 'revoked';
}

export interface CertificateRecord {
  id: string;
  certificateType: string;
  issueDate: Date;
  expiryDate?: Date;
  issuingAuthority: string;
}

// ============================================================
// المعلومات المالية
// ============================================================

export interface FinancialInfo {
  capital: number;
  capitalCurrency: string;
  annualRevenue?: number;
  annualExpenses?: number;
  assetsValue?: number;
  liabilities?: number;
  employeesCount: number;
  financialYear: number;
  lastFinancialAudit?: Date;
}

// ============================================================
// العناوين
// ============================================================

export interface AddressInfo {
  mainAddress: string;
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
  geoLocation?: {
    latitude: number;
    longitude: number;
  };
  branches?: BranchAddress[];
}

export interface BranchAddress {
  branchId: string;
  address: string;
  phone?: string;
}

// ============================================================
// الاتصال
// ============================================================

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
  };
}

// ============================================================
// الملكية
// ============================================================

export interface OwnershipInfo {
  ownerType: 'individual' | 'government' | 'private' | 'mixed';
  owners: OwnerRecord[];
  partnershipAgreement?: string;
}

export interface OwnerRecord {
  id: string;
  name: string;
  nationalId?: string;
  percentage: number;
  ownershipType: 'full' | 'partial' | 'shared';
}

// ============================================================
// الإدارة
// ============================================================

export interface ManagementInfo {
  managerName: string;
  managerNationalId?: string;
  managerPhone?: string;
  managerEmail?: string;
  authorizedPersons: AuthorizedPerson[];
  delegates: Delegate[];
}

export interface AuthorizedPerson {
  id: string;
  fullName: string;
  nationalId: string;
  position: string;
  authorityType: 'legal' | 'manager' | 'representative';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  signature?: string;
}

export interface Delegate {
  id: string;
  representativeName: string;
  representativeId: string;
  startDate: Date;
  endDate?: Date;
  scope: string;
}

// ============================================================
// الأنشطة
// ============================================================

export interface ActivityInfo {
  activityId: string;
  activityCode: string;
  activityNameAr: string;
  activityNameEn?: string;
  isPrimary: boolean;
  startDate: Date;
  endDate?: Date;
  licenseRequired: boolean;
  licenseObtained?: boolean;
}

// ============================================================
// الفروع
// ============================================================

export interface BranchInfo {
  branchId: string;
  branchName: string;
  branchType: 'main' | 'subsidiary' | 'service' | 'sales';
  address: string;
  phone?: string;
  fax?: string;
  email?: string;
  managerName?: string;
  employeesCount?: number;
  isActive: boolean;
  establishedDate: Date;
}

// ============================================================
// المعدات والمخازن
// ============================================================

export interface EquipmentInfo {
  equipmentId: string;
  name: string;
  serialNumber?: string;
  type: string;
  category: 'production' | 'office' | 'safety' | 'other';
  purchaseDate?: Date;
  value?: number;
  isActive: boolean;
}

export interface WarehouseInfo {
  warehouseId: string;
  name: string;
  location: string;
  area?: number;
  capacity?: number;
  managerName?: string;
  isActive: boolean;
}

// ============================================================
// العقود
// ============================================================

export interface ContractInfo {
  contractId: string;
  contractNumber: string;
  type: 'supply' | 'service' | 'employment' | 'rental' | 'partnership';
  partyName: string;
  partyType: 'supplier' | 'customer' | 'employee' | 'partner';
  startDate: Date;
  endDate?: Date;
  value?: number;
  status: 'active' | 'expired' | 'terminated';
  renewalDate?: Date;
}

// ============================================================
// الموظفون
// ============================================================

export interface EmployeeInfo {
  employeeId: string;
  nationalId: string;
  fullName: string;
  position: string;
  department?: string;
  hireDate: Date;
  salary?: number;
  status: 'active' | 'inactive' | 'terminated';
}

// ============================================================
// الامتثال والمخاطر
// ============================================================

export interface ComplianceInfo {
  riskLevel: RiskLevel;
  complianceStatus: ComplianceStatus;
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  inspectionScore?: number;
  violations: ViolationRecord[];
  regulatoryRequirements: RegulatoryRequirement[];
  complianceHistory: ComplianceHistory[];
}

export interface ViolationRecord {
  id: string;
  type: 'labor' | 'safety' | 'tax' | 'insurance' | 'environmental' | 'health';
  description: string;
  violationDate: Date;
  penalty?: string;
  fineAmount?: number;
  status: 'open' | 'closed' | 'appealed';
}

export interface RegulatoryRequirement {
  requirementId: string;
  category: 'labor' | 'safety' | 'tax' | 'insurance' | 'environmental' | 'health';
  description: string;
  requiredDate: Date;
  submittedDate?: Date;
  verifiedDate?: Date;
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
  documents?: string[];
}

export interface ComplianceHistory {
  date: Date;
  status: ComplianceStatus;
  score?: number;
  notes?: string;
}

// ============================================================
// التدقيق والأرشفة
// ============================================================

export interface AuditInfo {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  auditTrail: AuditRecord[];
  documents: DocumentRecord[];
}

export interface AuditRecord {
  id: string;
  action: AuditAction;
  userId: string;
  timestamp: Date;
  details?: string;
  ipAddress?: string;
}

export type AuditAction = 
  | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'approve' | 'reject';

export interface DocumentRecord {
  documentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  category: 'license' | 'contract' | 'financial' | 'inspection' | 'other';
  url: string;
  uploadedBy: string;
}

// ============================================================
// دورة الحياة
// ============================================================

export interface LifecycleInfo {
  lifecycleState: LifecycleState;
  lifecycleHistory: LifecycleEvent[];
  nextRenewalDate?: Date;
  renewalStatus: RenewalStatus;
}

export type LifecycleState = 
  | 'draft' | 'pending' | 'submitted' | 'under_review' | 'returned' | 'approved'
  | 'rejected' | 'cancelled' | 'closed' | 'archived' | 'deleted' | 'expired'
  | 'renewed' | 'suspended' | 'reopened';

export interface LifecycleEvent {
  fromState: LifecycleState;
  toState: LifecycleState;
  timestamp: Date;
  userId: string;
  reason?: string;
}

export type RenewalStatus = 
  | 'current' | 'due_soon' | 'overdue' | 'in_process';

// ============================================================
// الحالة
// ============================================================

export type EntityStatus = 
  | 'active' | 'inactive' | 'suspended' | 'dissolved' | 'under_review';

export type ComplianceStatus = 
  | 'compliant' | 'non_compliant' | 'under_review' | 'warned' | 'sanctioned';

export type RiskLevel = 
  | 'low' | 'medium' | 'high' | 'critical';

// ============================================================
// التقارير والإحصاءات
// ============================================================

export interface CommercialReports {
  operational: OperationalReport;
  executive: ExecutiveReport;
  financial: FinancialReport;
  legal: LegalReport;
  analytical: AnalyticalReport;
  statistical: StatisticalReport;
  historical: HistoricalReport;
}

export interface OperationalReport {
  activeEstablishments: number;
  inactiveEstablishments: number;
  totalEmployees: number;
  pendingRenewals: number;
}

export interface ExecutiveReport {
  monthlyGrowthRate: number;
  complianceRate: number;
  riskDistribution: Record<RiskLevel, number>;
  sectorDistribution: Record<Sector, number>;
}

export interface FinancialReport {
  totalCapital: number;
  totalRevenue: number;
  averageCapital: number;
  averageRevenue: number;
}

export interface LegalReport {
  validLicenses: number;
  expiredLicenses: number;
  pendingViolations: number;
  complianceViolations: number;
}

export interface AnalyticalReport {
  trends: TrendAnalysis;
  predictions: PredictionAnalysis;
  riskAssessment: RiskAssessment;
}

export interface TrendAnalysis {
  monthlyGrowth: number;
  sectorTrends: Record<Sector, number>;
  riskTrends: Record<string, number>;
}

export interface PredictionAnalysis {
  renewalPredictions: Prediction[];
  riskPredictions: Prediction[];
}

export interface Prediction {
  id: string;
  predictedValue: number;
  confidence: number;
  date: Date;
}

export interface RiskAssessment {
  overallRisk: number;
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
}

export interface StatisticalReport {
  distributionByGovernorate: Record<string, number>;
  distributionBySector: Record<Sector, number>;
  distributionBySize: Record<Classification, number>;
  averageMetrics: AverageMetrics;
}

export interface AverageMetrics {
  employeesPerEstablishment: number;
  capitalPerEstablishment: number;
  revenuePerEmployee: number;
}

export interface HistoricalReport {
  establishmentTimeline: TimelineEvent[];
  complianceTimeline: TimelineEvent[];
  financialTimeline: TimelineEvent[];
}

export interface TimelineEvent {
  date: Date;
  event: string;
  value?: number;
  status?: string;
}

// ============================================================
// الوظائف الفرعية
// ============================================================

export interface FunctionModule {
  id: string;
  name: string;
  description: string;
  icon?: string;
  permissions: string[];
  subFunctions: SubFunction[];
}

export interface SubFunction {
  id: string;
  name: string;
  path: string;
  icon?: string;
  requiredPermission: string;
}

// ============================================================
// الإجراءات والعمليات
// ============================================================

export interface Operation {
  id: string;
  operationName: string;
  operationType: OperationType;
  requiredPermission: string;
  workflowRequired: boolean;
  approvalMatrix?: ApprovalMatrix;
}

export type OperationType = 'crud' | 'workflow' | 'approval' | 'renewal' | 'suspension' | 'transfer';

export interface ApprovalMatrix {
  levels: ApprovalLevel[];
  escalationTime: number; // hours
}

export interface ApprovalLevel {
  level: number;
  role: string;
  minAmount?: number;
  maxAmount?: number;
}

// ============================================================
// الوثائق والمستندات
// ============================================================

export interface DocumentTemplate {
  templateId: string;
  templateName: string;
  documentType: string;
  content: string;
  variables: string[];
}

export interface GeneratedDocument {
  documentId: string;
  templateId: string;
  establishmentId: string;
  generatedDate: Date;
  content: string;
  format: 'pdf' | 'docx' | 'html';
  downloadUrl?: string;
}