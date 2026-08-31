/**
 * Worker Portal Service - End-to-End Integration Layer
 * Provides comprehensive worker data aggregation and service operations
 * Integration with: persons, worker_registry, employment_contracts, health certificates,
 * experience certificates, work injuries, training records, cases, insurance records, documents
 */

// API Response type
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ==================== Type Definitions ====================

export interface WorkerPassport {
  person: PersonInfo;
  worker: WorkerInfo;
  contracts: ContractSummary[];
  skills: SkillCertification[];
  documents: DocumentInfo[];
  healthCertificates: HealthCertificate[];
  insuranceRecords: InsuranceRecord[];
  trainingRecords: TrainingRecord[];
  workInjuries: WorkInjury[];
  cases: CaseInfo[];
  statistics: WorkerStatistics;
  timeline: TimelineEntry[];
  alerts: AlertInfo[];
}

export interface PersonInfo {
  id: string;
  full_name_ar: string;
  full_name_en: string;
  national_id: string;
  birth_date: string;
  gender: string;
  nationality: string;
  governorate: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  photo_url?: string;
}

export interface WorkerInfo {
  id: string;
  person_id: string;
  registration_number: string;
  registration_date: string;
  status: 'active' | 'suspended' | 'terminated' | 'pending';
  occupation_code: string;
  occupation_name: string;
  employer_name: string;
  employer_id: string;
  job_title: string;
  employment_type: string;
  work_permit_number?: string;
  work_permit_expiry?: string;
}

export interface ContractSummary {
  id: string;
  contract_number: string;
  contract_type: string;
  employer_name: string;
  job_title: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  basic_salary: number;
  total_salary: number;
  currency: string;
  is_electronic: boolean;
}

export interface SkillCertification {
  id: string;
  certification_type: string;
  certification_name: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date?: string;
  certificate_number: string;
  is_verified: boolean;
}

export interface DocumentInfo {
  id: string;
  document_type: string;
  document_name: string;
  document_number: string;
  issue_date: string;
  expiry_date?: string;
  issuing_authority: string;
  file_url: string;
  status: 'valid' | 'expired' | 'pending_renewal';
}

export interface HealthCertificate {
  id: string;
  certificate_number: string;
  certificate_type: string;
  health_status: string;
  issue_date: string;
  expiry_date: string;
  issuing_hospital: string;
  doctor_name: string;
  restrictions?: string;
  is_verified: boolean;
}

export interface InsuranceRecord {
  id: string;
  insurance_number: string;
  insurance_type: string;
  insurance_company: string;
  policy_number: string;
  coverage_start: string;
  coverage_end?: string;
  monthly_contribution: number;
  status: 'active' | 'expired' | 'suspended';
}

export interface TrainingRecord {
  id: string;
  training_name: string;
  training_type: string;
  provider: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
  certificate_url?: string;
  grade?: string;
  is_completed: boolean;
}

export interface WorkInjury {
  id: string;
  injury_number: string;
  injury_date: string;
  injury_type: string;
  injury_description: string;
  body_part_affected: string;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  medical_report_url?: string;
  compensation_status: 'pending' | 'approved' | 'paid' | 'rejected';
  compensation_amount?: number;
}

export interface CaseInfo {
  id: string;
  case_number: string;
  case_type: string;
  case_status: string;
  filing_date: string;
  description: string;
  employer_name?: string;
  hearing_date?: string;
  decision?: string;
}

export interface WorkerStatistics {
  totalContracts: number;
  activeContracts: number;
  totalWorkYears: number;
  skillsCount: number;
  validDocuments: number;
  expiredDocuments: number;
  trainingHours: number;
  insuranceStatus: 'covered' | 'expiring_soon' | 'expired' | 'none';
  healthCertificateStatus: 'valid' | 'expiring_soon' | 'expired' | 'none';
}

export interface TimelineEntry {
  id: string;
  date: string;
  type: 'contract' | 'certificate' | 'case' | 'training' | 'injury' | 'document' | 'registration' | 'inspection';
  title: string;
  description: string;
  status: string;
  entity_id?: string;
}

export interface AlertInfo {
  id: string;
  alert_type: 'expiry' | 'renewal' | 'case_update' | 'document_required' | 'health' | 'insurance' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action_url?: string;
  due_date?: string;
}

export interface ServiceRequest {
  id?: string;
  request_type: 'contract_termination' | 'experience_certificate' | 'transfer_service' | 'medical_checkup' | 'complaint' | 'inquiry';
  person_id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: File[];
  contact_preference?: 'phone' | 'email' | 'sms';
}

export interface ServiceRequestResponse {
  id: string;
  request_number: string;
  status: string;
  estimated_completion_date?: string;
  created_at: string;
}

export interface ReportSubmission {
  id?: string;
  report_type: 'complaint' | 'violation' | 'hazard' | 'inquiry' | 'suggestion';
  person_id: string;
  subject: string;
  description: string;
  evidence_urls?: string[];
  anonymous?: boolean;
}

export interface DashboardData {
  summary: {
    activeContracts: number;
    pendingRequests: number;
    upcomingExpiry: number;
    alertsCount: number;
  };
  quickActions: QuickAction[];
  recentActivity: TimelineEntry[];
  notifications: AlertInfo[];
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  badge?: number;
}

export interface ServiceTypeInfo {
  type: string;
  label: string;
  required_docs: string[];
}

// ==================== API Base ====================

const API_BASE = '/api';

// Simple fetch wrapper with proper typing
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!response.ok) {
      console.error(`API Error ${response.status}:`, await response.text());
      return null;
    }
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API fetch error:', error);
    return null;
  }
}

// ==================== API Functions ====================

/**
 * Get comprehensive worker passport data
 */
export async function getWorkerPassport(personId: string): Promise<WorkerPassport | null> {
  return fetchApi<WorkerPassport>(`/worker-portal/${personId}/passport`);
}

/**
 * Submit a service request
 */
export async function submitServiceRequest(request: ServiceRequest): Promise<ServiceRequestResponse | null> {
  try {
    const formData = new FormData();
    formData.append('request_type', request.request_type);
    formData.append('person_id', request.person_id);
    formData.append('subject', request.subject);
    formData.append('description', request.description);
    formData.append('priority', request.priority);
    if (request.contact_preference) {
      formData.append('contact_preference', request.contact_preference);
    }

    const response = await fetch(`${API_BASE}/worker-portal/service-request`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) return null;
    return await response.json() as ServiceRequestResponse;
  } catch (error) {
    console.error('Failed to submit service request:', error);
    return null;
  }
}

/**
 * Get worker's service requests
 */
export async function getMyRequests(personId: string): Promise<ServiceRequestResponse[]> {
  const response = await fetchApi<{ requests: ServiceRequestResponse[] }>(`/worker-portal/${personId}/requests`);
  return response?.requests || [];
}

/**
 * File a report or complaint
 */
export async function fileReport(report: ReportSubmission): Promise<{ id: string; report_number: string } | null> {
  return fetchApi<{ id: string; report_number: string }>('/worker-portal/report', {
    method: 'POST',
    body: JSON.stringify(report),
  });
}

/**
 * Upload a document
 */
export async function uploadDocument(
  personId: string,
  documentType: string,
  file: File,
  metadata?: Record<string, string>
): Promise<{ id: string; file_url: string } | null> {
  try {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await fetch(`${API_BASE}/worker-portal/${personId}/document/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) return null;
    return await response.json() as { id: string; file_url: string };
  } catch (error) {
    console.error('Failed to upload document:', error);
    return null;
  }
}

/**
 * Get worker dashboard data
 */
export async function getWorkerDashboard(personId: string): Promise<DashboardData | null> {
  return fetchApi<DashboardData>(`/worker-portal/${personId}/dashboard`);
}

/**
 * Get worker timeline/chronology
 */
export async function getWorkerTimeline(personId: string): Promise<TimelineEntry[]> {
  const response = await fetchApi<{ timeline: TimelineEntry[] }>(`/worker-portal/${personId}/timeline`);
  return response?.timeline || [];
}

/**
 * Get worker alerts
 */
export async function getWorkerAlerts(personId: string): Promise<AlertInfo[]> {
  const response = await fetchApi<{ alerts: AlertInfo[] }>(`/worker-portal/${personId}/alerts`);
  return response?.alerts || [];
}

/**
 * Get available service types for worker portal
 */
export function getServiceTypes(): ServiceTypeInfo[] {
  return [
    {
      type: 'contract_termination',
      label: 'طلب إنهاء عقد العمل',
      required_docs: ['contract_copy', 'clearance_certificate'],
    },
    {
      type: 'experience_certificate',
      label: 'شهادة خبرة',
      required_docs: ['contract_copy', 'employer_approval'],
    },
    {
      type: 'transfer_service',
      label: 'نقل خدمة',
      required_docs: ['current_contract', 'new_employer_letter', 'noc'],
    },
    {
      type: 'medical_checkup',
      label: 'فحص طبي',
      required_docs: ['id_copy', 'previous_medical_report'],
    },
    {
      type: 'complaint',
      label: 'تظلم',
      required_docs: ['complaint_letter', 'supporting_docs'],
    },
    {
      type: 'inquiry',
      label: 'استفسار',
      required_docs: [],
    },
  ];
}

// ==================== Utility Functions ====================

/**
 * Calculate worker's employment duration in years
 */
export function calculateWorkDuration(contracts: ContractSummary[]): number {
  if (!contracts || contracts.length === 0) return 0;
  
  const now = new Date();
  let totalDays = 0;
  
  contracts.forEach((contract) => {
    const start = new Date(contract.start_date);
    const end = contract.end_date ? new Date(contract.end_date) : now;
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    totalDays += days;
  });
  
  return Math.floor(totalDays / 365);
}

/**
 * Get document expiry status
 */
export function getDocumentStatus(expiryDate?: string): 'valid' | 'expiring_soon' | 'expired' | 'none' {
  if (!expiryDate) return 'none';
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
}

/**
 * Format alert severity for display
 */
export function formatAlertSeverity(severity: AlertInfo['severity']): { label: string; color: string } {
  switch (severity) {
    case 'critical':
      return { label: 'حرج', color: 'text-red-600 bg-red-50' };
    case 'high':
      return { label: 'عالي', color: 'text-orange-600 bg-orange-50' };
    case 'medium':
      return { label: 'متوسط', color: 'text-yellow-600 bg-yellow-50' };
    case 'low':
      return { label: 'منخفض', color: 'text-blue-600 bg-blue-50' };
    default:
      return { label: 'غير محدد', color: 'text-gray-600 bg-gray-50' };
  }
}

/**
 * Generate QR code data for passport verification
 */
export function generatePassportQRData(passport: WorkerPassport): string {
  return JSON.stringify({
    id: passport.worker?.id,
    nationalId: passport.person?.national_id,
    name: passport.person?.full_name_ar,
    occupation: passport.worker?.occupation_name,
    status: passport.worker?.status,
    verified: new Date().toISOString(),
  });
}

/**
 * Format date for Arabic display
 */
export function formatDateArabic(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get status badge styling
 */
export function getStatusBadge(status: string): { class: string; label: string } {
  const statusMap: Record<string, { class: string; label: string }> = {
    active: { class: 'bg-green-100 text-green-800', label: 'نشط' },
    suspended: { class: 'bg-yellow-100 text-yellow-800', label: 'معلق' },
    terminated: { class: 'bg-red-100 text-red-800', label: 'منتهي' },
    pending: { class: 'bg-blue-100 text-blue-800', label: 'قيد الانتظار' },
    expired: { class: 'bg-gray-100 text-gray-800', label: 'منتهي الصلاحية' },
    valid: { class: 'bg-green-100 text-green-800', label: 'صالح' },
    rejected: { class: 'bg-red-100 text-red-800', label: 'مرفوض' },
    approved: { class: 'bg-green-100 text-green-800', label: 'موافق' },
    paid: { class: 'bg-blue-100 text-blue-800', label: 'مدفوع' },
  };
  return statusMap[status.toLowerCase()] || { class: 'bg-gray-100 text-gray-800', label: status };
}
