/**
 * contractService.ts — Production-Grade Employment Contract Management Service
 * Yemen National Labor Platform — Labor Law 5/1995
 * Integrates: Employer OS ↔ Worker Passport ↔ Ministry Registry
 */

import { get, post, put, del, getFile, uploadFile, postFormData } from './api';

export type ContractStatus = 
  | 'draft' | 'pending_signature' | 'pending_approval' | 'active' 
  | 'pending_renewal' | 'expired' | 'terminated' | 'disputed' | 'cancelled';

export type ContractType = 
  | 'fixed_term' | 'indefinite' | 'part_time' | 'seasonal' 
  | 'probation' | 'training' | 'remote' | 'probationary_extension';

export type WorkerType = 'yemeni' | 'expatriate' | 'national_service';
export type WorkSchedule = 'full_time' | 'part_time' | 'shift' | 'flexible' | 'rotating';

export interface ContractWages {
  baseSalary: number;
  currency: string;
  paymentSchedule: 'monthly' | 'biweekly' | 'weekly';
  paymentMethod: 'bank_transfer' | 'cash' | 'check';
  bankAccount?: string;
  allowances?: {
    housing: number;
    transportation: number;
    food: number;
    communication: number;
    other: { name: string; amount: number }[];
  };
  deductions?: {
    socialSecurity: number;
    healthInsurance: number;
    tax: number;
    other: { name: string; amount: number }[];
  };
  overtimeRate?: number;
  nightWorkRate?: number;
  holidayRate?: number;
}

export interface ContractBenefits {
  annualLeave: number;
  sickLeave: number;
  maternityLeave?: number;
  paternityLeave?: number;
  healthInsurance: boolean;
  lifeInsurance?: boolean;
  trainingOpportunities: boolean;
  transportAllowance: boolean;
  mealsProvided?: boolean;
  housingProvided?: boolean;
}

export interface ContractTermination {
  terminatedAt?: string;
  terminationType?: 'resignation' | 'dismissal' | 'mutual_agreement' | 'contract_end' | 'death' | 'disability';
  terminationReason?: string;
  noticePeriod?: number;
  endOfServiceBenefit?: number;
  noticePay?: number;
  gratuity?: number;
  finalSettlement?: {
    totalDue: number;
    paidAt?: string;
    receiptNumber?: string;
  };
  isDisputed?: boolean;
  disputeId?: string;
}

export interface ContractAmendment {
  id: string;
  amendmentNumber: number;
  effectiveDate: string;
  type: 'salary_change' | 'role_change' | 'schedule_change' | 'location_change' | 'benefit_change' | 'other';
  previousValue: string;
  newValue: string;
  reason: string;
  signedByEmployer?: string;
  signedByWorker?: string;
  signedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ContractAttachment {
  id: string;
  type: 'contract' | 'amendment' | 'addendum' | 'id_copy' | 'qualification' | 'medical_clearance' | 'other';
  filename: string;
  fileId: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export interface ContractSignature {
  id: string;
  party: 'employer' | 'worker' | 'ministry_approver';
  signedBy?: string;
  signedAt?: string;
  signatureImage?: string;
  ip?: string;
  deviceInfo?: string;
  certificate?: string;
  verified?: boolean;
}

export interface Contract {
  id: string;
  contractNumber: string;
  caseNumber?: string;
  status: ContractStatus;
  type: ContractType;
  
  // Parties
  employer: {
    entityId: string;
    entityName: string;
    entityType: string;
    licenseNumber?: string;
    representativeName: string;
    representativeId: string;
  };
  worker: {
    id: string;
    name: string;
    idNumber: string;
    nationality: string;
    birthDate?: string;
    gender?: string;
    professionId?: string;
    professionName?: string;
    qualificationLevel?: string;
    workerType: WorkerType;
    residencyPermit?: string;
    workPermit?: string;
    passportNumber?: string;
    passportExpiry?: string;
  };
  
  // Terms
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  probationPeriod?: number;
  noticePeriod: number;
  
  // Work Details
  occupation: string;
  occupationCode?: string;
  isicCode?: string;
  workLocation: string;
  governorate: string;
  directorate: string;
  workSchedule: WorkSchedule;
  weeklyHours?: number;
  workingHours?: { start: string; end: string };
  
  // Compensation
  wages: ContractWages;
  benefits: ContractBenefits;
  
  // OSH
  oshTrainingRequired: boolean;
  oshTrainingDate?: string;
  medicalExaminationRequired: boolean;
  medicalExaminationDate?: string;
  hazardClassification?: string;
  
  // Signatures
  signatures: ContractSignature[];
  employerSignatureRequired: boolean;
  workerSignatureRequired: boolean;
  ministryApprovalRequired: boolean;
  
  // Amendments
  amendments: ContractAmendment[];
  
  // Attachments
  attachments: ContractAttachment[];
  
  // Termination
  termination?: ContractTermination;
  
  // Renewal
  renewalInfo?: {
    autoRenew: boolean;
    renewalPeriod?: number;
    noticeRequired?: number;
    renewedAt?: string;
    renewedBy?: string;
    newContractId?: string;
  };
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  source: 'employer_portal' | 'ministry_portal' | 'migrant_portal';
}

export interface ContractFilters {
  status?: ContractStatus[];
  type?: ContractType[];
  employerId?: string;
  workerId?: string;
  governorate?: string;
  professionId?: string;
  dateFrom?: string;
  dateTo?: string;
  expiringWithin?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateContractRequest {
  type: ContractType;
  employer: Contract['employer'];
  worker: Contract['worker'];
  startDate: string;
  endDate?: string;
  probationPeriod?: number;
  noticePeriod?: number;
  occupation: string;
  occupationCode?: string;
  isicCode?: string;
  workLocation: string;
  governorate: string;
  directorate: string;
  workSchedule: WorkSchedule;
  weeklyHours?: number;
  workingHours?: { start: string; end: string };
  wages: ContractWages;
  benefits: ContractBenefits;
  oshTrainingRequired?: boolean;
  medicalExaminationRequired?: boolean;
  hazardClassification?: string;
  attachments?: File[];
}

export interface ContractServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

// ============================================================
// PRODUCTION-GRADE CONTRACT MANAGEMENT SERVICE
// ============================================================

export const contractService = {
  // ==================== CRUD ====================

  /**
   * List contracts with advanced filtering
   */
  async listContracts(filters: ContractFilters = {}): Promise<ContractServiceResponse<{ contracts: Contract[]; meta: any }>> {
    const params = new URLSearchParams();
    
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.employerId) params.set('employerId', filters.employerId);
    if (filters.workerId) params.set('workerId', filters.workerId);
    if (filters.governorate) params.set('governorate', filters.governorate);
    if (filters.professionId) params.set('professionId', filters.professionId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.expiringWithin) params.set('expiringWithin', String(filters.expiringWithin));
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    
    return get<any>(`/contracts?${params.toString()}`);
  },

  /**
   * Get single contract
   */
  async getContract(id: string): Promise<ContractServiceResponse<Contract>> {
    return get<any>(`/contracts/${id}`);
  },

  /**
   * Create contract
   */
  async createContract(data: CreateContractRequest): Promise<ContractServiceResponse<Contract>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (data.attachments?.length) {
      data.attachments.forEach((file, i) => formData.append(`attachment_${i}`, file));
    }
    return postFormData<any>('/contracts', formData);
  },

  /**
   * Update contract
   */
  async updateContract(id: string, data: Partial<Contract>): Promise<ContractServiceResponse<Contract>> {
    return put<any>(`/contracts/${id}`, data);
  },

  /**
   * Delete contract (only draft)
   */
  async deleteContract(id: string): Promise<ContractServiceResponse<void>> {
    return del<any>(`/contracts/${id}`);
  },

  // ==================== SIGNATURES ====================

  /**
   * Employer sign contract
   */
  async signAsEmployer(contractId: string, signatureData: { signatureImage: string }): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/sign/employer`, signatureData);
  },

  /**
   * Worker sign contract
   */
  async signAsWorker(contractId: string, signatureData: { signatureImage: string }): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/sign/worker`, signatureData);
  },

  /**
   * Ministry approve contract
   */
  async approveContract(contractId: string, approvalData: { comments?: string }): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/approve`, approvalData);
  },

  /**
   * Ministry reject contract
   */
  async rejectContract(contractId: string, rejectionData: { reason: string }): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/reject`, rejectionData);
  },

  // ==================== AMENDMENTS ====================

  /**
   * Propose amendment
   */
  async proposeAmendment(contractId: string, amendment: {
    type: ContractAmendment['type'];
    effectiveDate: string;
    previousValue: string;
    newValue: string;
    reason: string;
  }): Promise<ContractServiceResponse<ContractAmendment>> {
    return post<any>(`/contracts/${contractId}/amendments`, amendment);
  },

  /**
   * Sign amendment
   */
  async signAmendment(contractId: string, amendmentId: string, party: 'employer' | 'worker'): Promise<ContractServiceResponse<ContractAmendment>> {
    return post<any>(`/contracts/${contractId}/amendments/${amendmentId}/sign`, { party });
  },

  /**
   * Approve amendment
   */
  async approveAmendment(contractId: string, amendmentId: string): Promise<ContractServiceResponse<ContractAmendment>> {
    return post<any>(`/contracts/${contractId}/amendments/${amendmentId}/approve`, {});
  },

  // ==================== TERMINATION ====================

  /**
   * Terminate contract
   */
  async terminateContract(contractId: string, termination: Omit<ContractTermination, 'finalSettlement'>): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/terminate`, termination);
  },

  /**
   * Process final settlement
   */
  async processSettlement(contractId: string, settlement: ContractTermination['finalSettlement']): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/settlement`, settlement);
  },

  // ==================== RENEWAL ====================

  /**
   * Renew contract
   */
  async renewContract(contractId: string, renewalData: {
    newEndDate: string;
    newWages?: ContractWages;
    newBenefits?: ContractBenefits;
  }): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/renew`, renewalData);
  },

  // ==================== ATTACHMENTS ====================

  /**
   * Upload attachment
   */
  async uploadAttachment(contractId: string, file: File, metadata: { type: ContractAttachment['type']; description?: string }): Promise<ContractServiceResponse<ContractAttachment>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', metadata.type);
    if (metadata.description) formData.append('description', metadata.description);
    return uploadFile<any>(`/contracts/${contractId}/attachments`, formData);
  },

  /**
   * Download attachment
   */
  async getAttachment(contractId: string, attachmentId: string): Promise<Blob> {
    return getFile(`/contracts/${contractId}/attachments/${attachmentId}/file`);
  },

  // ==================== VALIDATION ====================

  /**
   * Validate contract against legal requirements
   */
  async validateContract(contractId: string): Promise<ContractServiceResponse<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
    legalChecks: Array<{ check: string; passed: boolean; details?: string }>;
  }>> {
    return get<any>(`/contracts/${contractId}/validate`);
  },

  /**
   * Check contract compliance
   */
  async checkCompliance(contractId: string): Promise<ContractServiceResponse<{
    compliant: boolean;
    violations: Array<{ rule: string; severity: string; description: string }>;
    recommendations: string[];
  }>> {
    return get<any>(`/contracts/${contractId}/compliance`);
  },

  // ==================== CROSS-PORTAL INTEGRATIONS ====================

  /**
   * Link to dispute
   */
  async linkDispute(contractId: string, disputeId: string): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/link/dispute`, { disputeId });
  },

  /**
   * Link to inspection
   */
  async linkInspection(contractId: string, inspectionId: string): Promise<ContractServiceResponse<Contract>> {
    return post<any>(`/contracts/${contractId}/link/inspection`, { inspectionId });
  },

  /**
   * Sync with worker passport
   */
  async syncToWorkerPassport(contractId: string): Promise<ContractServiceResponse<{ passportUpdated: boolean }>> {
    return post<any>(`/contracts/${contractId}/sync/passport`, {});
  },

  /**
   * Notify worker
   */
  async notifyWorker(contractId: string, message: string, notificationType: 'created' | 'signed' | 'amended' | 'terminated'): Promise<ContractServiceResponse<void>> {
    return post<any>(`/contracts/${contractId}/notify/worker`, { message, notificationType });
  },

  // ==================== EMPLOYER SPECIFIC ====================

  /**
   * Get employer's contracts
   */
  async getEmployerContracts(employerEntityId: string, filters?: ContractFilters): Promise<ContractServiceResponse<{ contracts: Contract[]; meta: any }>> {
    return this.listContracts({ ...filters, employerId: employerEntityId });
  },

  /**
   * Bulk create contracts (from template)
   */
  async bulkCreateContracts(employerEntityId: string, workerIds: string[], templateId: string): Promise<ContractServiceResponse<{ created: number; errors: string[] }>> {
    return post<any>('/contracts/bulk', { employerEntityId, workerIds, templateId });
  },

  // ==================== TEMPLATES ====================

  /**
   * Get contract templates
   */
  async getTemplates(contractType?: ContractType): Promise<ContractServiceResponse<{
    templates: Array<{ id: string; name: string; type: ContractType; content: string; variables: string[] }>;
  }>> {
    const query = contractType ? `?type=${contractType}` : '';
    return get<any>(`/contracts/templates${query}`);
  },

  // ==================== STATISTICS & EXPORTS ====================

  /**
   * Get contract statistics
   */
  async getStatistics(params?: { governorate?: string; employerId?: string; dateFrom?: string; dateTo?: string }): Promise<ContractServiceResponse<{
    total: number;
    byStatus: Record<ContractStatus, number>;
    byType: Record<ContractType, number>;
    expiringThisMonth: number;
    averageDuration: number;
    complianceRate: number;
  }>> {
    const query = new URLSearchParams();
    if (params?.governorate) query.set('governorate', params.governorate);
    if (params?.employerId) query.set('employerId', params.employerId);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    return get<any>(`/contracts/statistics?${query.toString()}`);
  },

  /**
   * Generate contract PDF
   */
  async generatePDF(contractId: string): Promise<Blob> {
    return getFile(`/contracts/${contractId}/pdf`);
  },

  /**
   * Export contracts
   */
  async exportContracts(filters: ContractFilters, format: 'xlsx' | 'pdf' | 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.governorate) params.set('governorate', filters.governorate);
    if (filters.employerId) params.set('employerId', filters.employerId);
    params.set('format', format);
    return getFile(`/contracts/export?${params.toString()}`);
  },

  /**
   * Get contracts expiring soon
   */
  async getExpiringContracts(daysAhead: number = 30, employerId?: string): Promise<ContractServiceResponse<{ contracts: Contract[] }>> {
    const params = new URLSearchParams();
    params.set('expiringWithin', String(daysAhead));
    if (employerId) params.set('employerId', employerId);
    return get<any>(`/contracts/expiring?${params.toString()}`);
  },
};

export default contractService;
