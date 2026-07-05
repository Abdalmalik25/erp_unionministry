/**
 * Commercial Establishment Entity - كيان المنشآت التجارية
 * نظام إدارة المنشآت التجارية المؤسسي الكامل
 * Ministry of Social Affairs and Labor
 */

import { EntityType, Classification, Sector, LegalForm, EntityStatus, ComplianceStatus, RiskLevel } from './entity';

// ============================================================
// أنواع المنشآت التجارية
// ============================================================

export type CommercialEntityType = 
  | 'company'           // شركة
  | 'corporation'       // مؤسسة
  | 'partnership'       // شراكة
  | 'llc'               // تضامن محدود
  | 'cooperative'       // تعاونية
  | 'factory'           // مصنع
  | 'shop'              // محل
  | 'office'            // مكتب
  | 'warehouse'         // مخزن
  | 'restaurant'        // مطعم
  | 'service'           // خدمة
  | 'craft'             // حرفي
  | 'other';

// ============================================================
// الكيان الأساسي للمنشأة التجارية
// ============================================================

export interface CommercialEstablishment {
  // المعرفات الأساسية
  establishmentId: string;
  unifiedCode: string;
  commercialRegisterNumber: string;
  
  // النوع والتصنيف
  entityType: CommercialEntityType;
  classification: Classification;
  sector: Sector;
  
  // المعلومات الأساسية
  nameAr: string;
  nameEn?: string;
  shortName?: string;
  slogan?: string;
  
  // الترخيص والتسجيل
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: Date;
  licenseExpiryDate?: Date;
  licenseIssuingAuthority?: string;
  
  // الجهات الحكومية
  taxReference?: string;
  taxRegistrationDate?: Date;
  socialInsuranceRef?: string;
  chamberOfCommerceRef?: string;
  
  // البيانات المالية
  capital?: number;
  capitalCurrency?: string;
  annualRevenue?: number;
  annualExpenses?: number;
  assetsValue?: number;
  employeesCount?: number;
  
  // العناوين
  mainAddress: string;
  governorate: string;
  city: string;
  directorate?: string;
  district?: string;
  postalCode?: string;
  poBox?: string;
  
  // الاتصال
  phone: string;
  mobile?: string;
  email: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  
  // الملكية
  ownerType: 'individual' | 'government' | 'private' | 'mixed';
  ownerName: string;
  ownerNationalId?: string;
  partnershipAgreement?: string;
  
  // الإدارة
  managerName: string;
  managerNationalId?: string;
  managerPhone?: string;
  managerEmail?: string;
  
  // المفوضون
  authorizedPersons?: AuthorizedPerson[];
  
  // الفروع
  branches?: Branch[];
  
  // الأنشطة
  activities: BusinessActivity[];
  
  // المعدات والمخازن
  equipment?: Equipment[];
  warehouses?: Warehouse[];
  
  // العقود والاتفاقيات
  contracts?: Contract[];
  
  // المخاطر والامتثال
  riskLevel: RiskLevel;
  complianceStatus: ComplianceStatus;
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  inspectionScore?: number;
  
  // الحالة
  status: EntityStatus;
  establishmentDate: Date;
  closureDate?: Date;
  
  // المتطلبات التنظيمية
  regulatoryRequirements?: RegulatoryRequirement[];
  
  // المرفقات
  attachments?: Attachment[];
  
  // التدقيق
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
}

// ============================================================
// الأنشطة التجارية
// ============================================================

export interface BusinessActivity {
  activityId: string;
  activityCode: string; // رمز النشاط الموحد
  activityNameAr: string;
  activityNameEn?: string;
  isPrimary: boolean;
  startDate: Date;
  endDate?: Date;
  licenseRequired: boolean;
  licenseObtained?: boolean;
}

// ============================================================
// الشخص المفوض
// ============================================================

export interface AuthorizedPerson {
  id: string;
  fullName: string;
  nationalId: string;
  position: string;
  authorityType: 'legal' | 'manager' | 'representative';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

// ============================================================
// الفرع
// ============================================================

export interface Branch {
  branchId: string;
  branchName: string;
  branchType: 'main' | 'subsidiary' | 'service' | 'sales';
  address: string;
  phone?: string;
  managerName?: string;
  employeesCount?: number;
  isActive: boolean;
}

// ============================================================
// المعدات
// ============================================================

export interface Equipment {
  equipmentId: string;
  name: string;
  serialNumber?: string;
  type: string;
  purchaseDate?: Date;
  value?: number;
  isActive: boolean;
}

// ============================================================
// المخزن
// ============================================================

export interface Warehouse {
  warehouseId: string;
  name: string;
  location: string;
  area?: number;
  capacity?: number;
  managerName?: string;
  isActive: boolean;
}

// ============================================================
// العقد
// ============================================================

export interface Contract {
  contractId: string;
  contractNumber: string;
  type: 'supply' | 'service' | 'employment' | 'rental' | 'partnership';
  partyName: string;
  startDate: Date;
  endDate?: Date;
  value?: number;
  status: 'active' | 'expired' | 'terminated';
}

// ============================================================
// المتطلبات التنظيمية
// ============================================================

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

// ============================================================
// المرفق
// ============================================================

export interface Attachment {
  attachmentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  url: string;
  category: 'license' | 'contract' | 'financial' | 'inspection' | 'other';
}

// ============================================================
// مؤشرات الأداء KPIs
// ============================================================

export interface CommercialKPIs {
  totalEstablishments: number;
  activeEstablishments: number;
  inactiveEstablishments: number;
  totalEmployees: number;
  totalCapital: number;
  totalRevenue: number;
  compliantEstablishments: number;
  nonCompliantEstablishments: number;
  expiringLicenses: number;
  overdueInspections: number;
  highRiskEstablishments: number;
  averageEmployeesPerEstablishment: number;
}

// ============================================================
// الترجمات
// ============================================================

export const CommercialEntityTypeLabels: Record<CommercialEntityType, string> = {
  company: 'شركة',
  corporation: 'مؤسسة',
  partnership: 'شراكة',
  llc: 'تضامن محدود',
  cooperative: 'تعاونية',
  factory: 'مصنع',
  shop: 'محل',
  office: 'مكتب',
  warehouse: 'مخزن',
  restaurant: 'مطعم',
  service: 'خدمة',
  craft: 'حرفي',
  other: 'أخرى',
};

// ============================================================
// وظائف مساعدة
// ============================================================

export function getEstablishmentStatusColor(status: EntityStatus): string {
  const colors: Record<EntityStatus, string> = {
    active: 'text-green-600 bg-green-50',
    inactive: 'text-gray-600 bg-gray-50',
    suspended: 'text-yellow-600 bg-yellow-50',
    dissolved: 'text-red-600 bg-red-50',
    under_review: 'text-blue-600 bg-blue-50',
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
}

export function getComplianceStatusColor(status: ComplianceStatus): string {
  const colors: Record<ComplianceStatus, string> = {
    compliant: 'text-green-600 bg-green-50',
    non_compliant: 'text-red-600 bg-red-50',
    under_review: 'text-blue-600 bg-blue-50',
    warned: 'text-yellow-600 bg-yellow-50',
    sanctioned: 'text-red-700 bg-red-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
}