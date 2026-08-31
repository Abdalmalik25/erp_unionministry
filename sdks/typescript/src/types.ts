/**
 * Type definitions for the National Labor Platform API
 * Generated from OpenAPI 3.0 specification
 */

/** Standard API response envelope */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  meta: {
    timestamp: string;
    path: string;
    method: string;
  };
  errors: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Pagination parameters */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Common query parameters */
export interface QueryParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  governorate?: string;
  status?: string;
  [key: string]: any;
}

// ============ Authentication ============

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  userType: 'ministry' | 'employer' | 'union' | 'worker' | 'inspector';
  organizationId?: string;
  governorate?: string;
  directorate?: string;
  permissions: string[];
  mfaEnabled: boolean;
}

// ============ Entities ============

export type EntityType = 'union' | 'employer' | 'cooperative' | 'professional_association';
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'under_investigation' | 'dissolved';

export interface Entity {
  id: string;
  name: string;
  nameAr: string;
  type: EntityType;
  status: EntityStatus;
  registrationNumber?: string;
  registrationDate?: string;
  expiryDate?: string;
  sector?: string;
  isicCode?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  address?: string;
  governorate?: string;
  district?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logo?: string;
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface EntityCreate {
  name: string;
  nameAr: string;
  type: EntityType;
  registrationNumber?: string;
  registrationDate?: string;
  sector?: string;
  isicCode?: string;
  address?: string;
  governorate?: string;
  district?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface EntityUpdate {
  name?: string;
  nameAr?: string;
  status?: EntityStatus;
  expiryDate?: string;
  address?: string;
  governorate?: string;
  district?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// ============ Members ============

export type MemberStatus = 'active' | 'suspended' | 'expelled' | 'deceased';

export interface Member {
  id: string;
  entityId: string;
  firstName: string;
  firstNameAr: string;
  lastName: string;
  lastNameAr: string;
  email?: string;
  phone?: string;
  nationalId: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  status: MemberStatus;
  position?: string;
  joinDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberCreate {
  entityId: string;
  firstName: string;
  firstNameAr: string;
  lastName: string;
  lastNameAr: string;
  email?: string;
  phone?: string;
  nationalId: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  position?: string;
  joinDate?: string;
}

export interface MemberUpdate {
  status?: MemberStatus;
  position?: string;
  expiryDate?: string;
  email?: string;
  phone?: string;
}

// ============ Workers ============

export type WorkerStatus = 'active' | 'suspended' | 'terminated' | 'emigrated' | 'deceased';

export interface WorkerProfile {
  id: string;
  firstName: string;
  firstNameAr: string;
  lastName: string;
  lastNameAr: string;
  nationalId: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  maritalStatus?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  governorate?: string;
  district?: string;
  educationLevel?: string;
  occupationId?: string;
  occupationTitle?: string;
  employerId?: string;
  employerName?: string;
  contractType?: string;
  employmentStatus?: string;
  monthlyWage?: number;
  startDate?: string;
  status: WorkerStatus;
  photoUrl?: string;
  signatureUrl?: string;
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkerCreate {
  firstName: string;
  firstNameAr: string;
  lastName: string;
  lastNameAr: string;
  nationalId: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  maritalStatus?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  governorate?: string;
  district?: string;
  educationLevel?: string;
  occupationId?: string;
  employerId?: string;
  monthlyWage?: number;
  startDate?: string;
}

export interface WorkerUpdate {
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  governorate?: string;
  district?: string;
  occupationId?: string;
  employerId?: string;
  contractType?: string;
  monthlyWage?: number;
  status?: WorkerStatus;
}

// ============ Inspections ============

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type InspectionType = 'routine' | 'complaint' | 'follow_up' | 'scheduled' | 'unannounced';

export interface Inspection {
  id: string;
  employerId: string;
  inspectorId: string;
  type: InspectionType;
  status: InspectionStatus;
  scheduledDate: string;
  actualDate?: string;
  location?: string;
  findings?: any[];
  violations?: Violation[];
  recommendations?: string;
  inspectorNotes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InspectionCreate {
  employerId: string;
  type: InspectionType;
  scheduledDate: string;
  location?: string;
  notes?: string;
}

export interface InspectionUpdate {
  scheduledDate?: string;
  status?: InspectionStatus;
  inspectorNotes?: string;
}

export interface InspectionComplete {
  findings: Array<{
    category: string;
    description: string;
    severity: 'minor' | 'moderate' | 'serious' | 'critical';
    evidence?: string[];
  }>;
  violations?: ViolationCreate[];
  recommendations?: string;
  inspectorNotes?: string;
  photos?: string[];
}

export interface Violation {
  id: string;
  inspectionId: string;
  type: string;
  description: string;
  descriptionAr: string;
  legalReference?: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  fine?: number;
  status: 'pending' | 'resolved' | 'appealed';
  resolution?: string;
  resolvedAt?: string;
}

export interface ViolationCreate {
  type: string;
  description: string;
  descriptionAr: string;
  legalReference?: string;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  fine?: number;
}

// ============ Contracts ============

export type ContractStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'renewed';

export interface Contract {
  id: string;
  employerId: string;
  workerId: string;
  contractNumber?: string;
  type: 'permanent' | 'temporary' | 'fixed_term' | 'part_time';
  startDate: string;
  endDate?: string;
  status: ContractStatus;
  position: string;
  occupationId?: string;
  monthlySalary?: number;
  currency?: string;
  workingHours?: number;
  probationPeriod?: number;
  noticePeriod?: number;
  terminationReason?: string;
  terminatedAt?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractCreate {
  employerId: string;
  workerId: string;
  type: 'permanent' | 'temporary' | 'fixed_term' | 'part_time';
  startDate: string;
  endDate?: string;
  position: string;
  occupationId?: string;
  monthlySalary?: number;
  currency?: string;
  workingHours?: number;
  probationPeriod?: number;
  noticePeriod?: number;
}

export interface ContractUpdate {
  endDate?: string;
  position?: string;
  monthlySalary?: number;
  status?: ContractStatus;
}

// ============ Licenses ============

export type LicenseType = 'work_permit' | 'residency' | 'work_visa' | 'professional_license';
export type LicenseStatus = 'valid' | 'expired' | 'revoked' | 'suspended' | 'pending';

export interface License {
  id: string;
  holderType: 'worker' | 'employer';
  holderId: string;
  type: LicenseType;
  number: string;
  issueDate: string;
  expiryDate: string;
  status: LicenseStatus;
  issuingAuthority?: string;
  documentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseCreate {
  holderType: 'worker' | 'employer';
  holderId: string;
  type: LicenseType;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string;
  notes?: string;
}

export interface LicenseUpdate {
  status?: LicenseStatus;
  expiryDate?: string;
  notes?: string;
}

// ============ Payments ============

export type PaymentType = 'fee' | 'fine' | 'contribution' | 'settlement';
export type PaymentStatus = 'pending' | 'initiated' | 'verified' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  employerId: string;
  type: PaymentType;
  amount: number;
  currency?: string;
  reference?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  paymentDate?: string;
  verificationReference?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  period?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCreate {
  employerId: string;
  type: PaymentType;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  paymentDate?: string;
  period?: string;
  description?: string;
}

// ============ Disputes ============

export type DisputeStatus = 'filed' | 'under_review' | 'mediation' | 'arbitration' | 'resolved' | 'closed';
export type DisputeType = 'wages' | 'termination' | 'conditions' | 'discrimination' | 'harassment' | 'other';

export interface Dispute {
  id: string;
  filingNumber?: string;
  type: DisputeType;
  status: DisputeStatus;
  workerId?: string;
  employerId?: string;
  subject: string;
  description: string;
  filedAt?: string;
  hearingDate?: string;
  decision?: string;
  resolvedAt?: string;
  implementationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeCreate {
  workerId?: string;
  employerId?: string;
  type: DisputeType;
  subject: string;
  description: string;
}

export interface DisputeUpdate {
  status?: DisputeStatus;
  hearingDate?: string;
  decision?: string;
}

// ============ Documents ============

export type DocumentType = 'certificate' | 'license' | 'contract' | 'report' | 'identity' | 'other';

export interface Document {
  id: string;
  entityType: string;
  entityId: string;
  type: DocumentType;
  name: string;
  nameAr?: string;
  number?: string;
  issueDate?: string;
  expiryDate?: string;
  issuer?: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  verified: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Compliance ============

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface ComplianceAlert {
  id: string;
  entityType: string;
  entityId: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Dashboard ============

export interface DashboardStats {
  totalWorkers: number;
  totalEmployers: number;
  totalUnions: number;
  pendingInspections: number;
  activeContracts: number;
  complianceRate: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  entityId: string;
  userId: string;
  timestamp: string;
}

export interface EnhancedStats {
  summary: Record<string, number>;
  trends: Record<string, { current: number; previous: number; change: number; trend: 'up' | 'down' | 'stable' }>;
  predictions: Record<string, { value: number; confidence: number; timeframe: string }>;
}

// ============ Notifications ============

export type NotificationType = 'system' | 'alert' | 'reminder' | 'approval' | 'rejection';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// ============ Audit ============

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ============ Training ============

export type TrainingType = 'certification' | 'workshop' | 'seminar' | 'on_the_job' | 'apprenticeship';

export interface TrainingRecord {
  id: string;
  workerId: string;
  type: TrainingType;
  title: string;
  titleAr: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  hours?: number;
  certificateIssued: boolean;
  certificateNumber?: string;
  grade?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface TrainingCreate {
  workerId: string;
  type: TrainingType;
  title: string;
  titleAr: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  hours?: number;
}

export interface TrainingUpdate {
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  certificateIssued?: boolean;
  certificateNumber?: string;
  grade?: string;
}

// ============ National Directories ============

export interface Occupation {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  sector?: string;
  level?: number;
  description?: string;
}

export interface ISIC4Code {
  id: string;
  code: string;
  description: string;
  descriptionAr?: string;
  section?: string;
}

export interface Governorate {
  code: string;
  name: string;
  nameAr: string;
  districts?: Array<{
    code: string;
    name: string;
    nameAr: string;
  }>;
}

// ============ Intelligence ============

export interface AnalyticsData {
  metric: string;
  timeframe: string;
  data: Array<{ date: string; value: number }>;
  summary: Record<string, any>;
  insights: string[];
}

export interface Recommendation {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: string;
  resources?: string[];
  timeline: string;
}

export interface RiskAssessment {
  entityType: string;
  entityId: string;
  assessmentType: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
  recommendations: string[];
  lastAssessed: string;
}

export interface UploadResponse {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface Upload {
  id: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  filename: string;
  originalName?: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaborRecord {
  id: string;
  workerId: string;
  recordType: string;
  title: string;
  description?: string;
  effectiveDate: string;
  expiryDate?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaborRecordCreate {
  workerId: string;
  recordType: string;
  title: string;
  description?: string;
  effectiveDate: string;
  expiryDate?: string;
}