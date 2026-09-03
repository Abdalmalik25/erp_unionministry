import type { PaginationMeta } from '../types/api';
/**
 * disputeService.ts — Production-Grade Labor Dispute Resolution Service
 * Yemen National Labor Platform — Law 25/1991 & Amendments
 * Integrates: Ministry Workspace ↔ Dispute Tribunal ↔ Union Portal ↔ Employer OS
 */

import { get, post, put, del, getFile, uploadFile, postFormData } from './api';

export type DisputeStatus = 
  | 'draft' | 'submitted' | 'acknowledged' | 'under_review' 
  | 'mediation_scheduled' | 'mediation_in_progress' | 'mediation_concluded'
  | 'arbitration_scheduled' | 'arbitration_in_progress' | 'arbitration_concluded'
  | 'resolved' | 'partially_resolved' | 'rejected' | 'withdrawn' | 'escalated';

export type DisputeCategory = 
  | 'wages' | 'working_hours' | 'work_conditions' | 'workplace_safety'
  | 'termination' | 'discrimination' | 'harassment' | 'contract_violation'
  | 'OSH_violation' | 'union_rights' | 'training_dispute' | 'other';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export interface DisputeParty {
  id: string;
  type: 'complainant' | 'respondent' | 'representative' | 'witness' | 'mediator' | 'arbitrator';
  role?: string;
  name: string;
  idNumber: string;
  entityId?: string;
  entityName?: string;
  email: string;
  phone: string;
  address?: string;
  isPresent?: boolean;
  presentAt?: string;
}

export interface DisputeEvidence {
  id: string;
  type: 'document' | 'image' | 'audio' | 'video' | 'testimony' | 'official_record';
  title: string;
  description?: string;
  fileId: string;
  uploadedBy: string;
  uploadedAt: string;
  isOfficial?: boolean;
  source?: string;
  relevanceScore?: number;
}

export interface DisputeTimeline {
  id: string;
  type: 'filing' | 'acknowledgment' | 'hearing' | 'mediation' | 'arbitration' | 'decision' | 'appeal' | 'note';
  title: string;
  description?: string;
  date: string;
  createdBy: string;
  outcome?: string;
  nextAction?: string;
  nextActionDate?: string;
}

export interface Compensation {
  amount: number;
  currency: string;
  paymentTerms?: string;
  dueDate?: string;
}

export interface DisputeResolution {
  id: string;
  type: 'mediation' | 'arbitration' | 'court' | 'settlement' | 'administrative';
  decision?: string;
  rationale?: string;
  compensation?: Compensation;
  complianceRequirements?: string[];
  implementationDeadline?: string;
  appealDeadline?: string;
  arbitratorName?: string;
  arbitratorLicense?: string;
}

export interface EmploymentRelationship {
  employerEntityId: string;
  employerName: string;
  workerEntityId: string;
  workerName: string;
  contractId?: string;
  contractType?: string;
  startDate?: string;
  terminationDate?: string;
  monthlyWage?: number;
  currency?: string;
}

export interface OSHIncident {
  incidentId?: string;
  incidentDate?: string;
  incidentType?: string;
  injuries?: string[];
  medicalReport?: string;
}

export interface LaborDispute {
  id: string;
  caseNumber: string;
  status: DisputeStatus;
  category: DisputeCategory;
  priority: DisputePriority;
  title: string;
  description: string;
  
  // Legal Framework
  legalBasis?: string;
  applicableLaw?: string;
  
  // Jurisdiction
  governorate: string;
  directorate: string;
  jurisdiction: 'first_instance' | 'appeal' | 'supreme';
  
  // Parties
  parties: DisputeParty[];
  
  // Employment Context
  employmentRelationship?: EmploymentRelationship;
  
  // OSH Context
  oshIncident?: OSHIncident;
  
  // Evidence
  evidence: DisputeEvidence[];
  
  // Timeline
  timeline: DisputeTimeline[];
  
  // Resolution
  resolution?: DisputeResolution;
  
  // Financial
  fees?: {
    filingFee: number;
    mediationFee?: number;
    arbitrationFee?: number;
    total: number;
    currency: string;
    paidAt?: string;
    receiptNumber?: string;
  };
  
  // Appeal
  appealInfo?: {
    appealedAt?: string;
    appealedBy?: string;
    appealReason?: string;
    appealStatus?: 'pending' | 'accepted' | 'rejected';
    appealDecision?: string;
  };
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  slaStatus?: 'on_track' | 'at_risk' | 'breached';
  tags?: string[];
}

// Query Filters
export interface DisputeFilters {
  status?: DisputeStatus[];
  category?: DisputeCategory[];
  priority?: DisputePriority[];
  governorate?: string;
  directorate?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Create Request
export interface CreateDisputeRequest {
  category: DisputeCategory;
  title: string;
  description: string;
  legalBasis?: string;
  governorate: string;
  directorate: string;
  parties: Omit<DisputeParty, 'id'>[];
  employmentRelationship?: EmploymentRelationship;
  oshIncident?: OSHIncident;
  priority?: DisputePriority;
  files?: File[];
}

// Service Response
export interface DisputeServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: any;
}

// ============================================================
// PRODUCTION-GRADE DISPUTE RESOLUTION SERVICE
// ============================================================

export const disputeService = {
  /**
   * List disputes with advanced filtering
   * Production: Full pagination, sorting, and filtering
   */
  async listDisputes(filters: DisputeFilters = {}): Promise<DisputeServiceResponse<{ disputes: LaborDispute[]; meta: PaginationMeta }>> {
    const params = new URLSearchParams();
    
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.category?.length) params.set('category', filters.category.join(','));
    if (filters.priority?.length) params.set('priority', filters.priority.join(','));
    if (filters.governorate) params.set('governorate', filters.governorate);
    if (filters.directorate) params.set('directorate', filters.directorate);
    if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    
    return get<any>(`/disputes?${params.toString()}`);
  },

  /**
   * Get single dispute with full details
   */
  async getDispute(id: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return get<any>(`/disputes/${id}`);
  },

  /**
   * Create new labor dispute
   */
  async createDispute(data: CreateDisputeRequest): Promise<DisputeServiceResponse<LaborDispute>> {
    const formData = new FormData();
    
    // Add main data as JSON
    const { files, ...mainData } = data;
    formData.append('data', JSON.stringify(mainData));
    
    // Add files
    if (files?.length) {
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
    }
    
    return postFormData<any>('/disputes', formData);
  },

  /**
   * Update dispute details
   */
  async updateDispute(id: string, data: Partial<LaborDispute>): Promise<DisputeServiceResponse<LaborDispute>> {
    return put<any>(`/disputes/${id}`, data);
  },

  /**
   * Update dispute status with automatic timeline entry
   */
  async updateStatus(id: string, status: DisputeStatus, note?: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return put<any>(`/disputes/${id}/status`, { status, note });
  },

  /**
   * Assign dispute to handler
   */
  async assignDispute(id: string, assignedTo: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return put<any>(`/disputes/${id}/assign`, { assignedTo });
  },

  /**
   * Add party to dispute
   */
  async addParty(disputeId: string, party: Omit<DisputeParty, 'id'>): Promise<DisputeServiceResponse<DisputeParty>> {
    return post<any>(`/disputes/${disputeId}/parties`, party);
  },

  /**
   * Remove party from dispute
   */
  async removeParty(disputeId: string, partyId: string): Promise<DisputeServiceResponse<void>> {
    return del<any>(`/disputes/${disputeId}/parties/${partyId}`);
  },

  /**
   * Upload evidence document
   */
  async uploadEvidence(disputeId: string, file: File, metadata: { type: DisputeEvidence['type']; title: string; description?: string }): Promise<DisputeServiceResponse<DisputeEvidence>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', metadata.type);
    formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    
    return uploadFile<any>(`/disputes/${disputeId}/evidence`, formData);
  },

  /**
   * Download evidence document
   */
  async getEvidenceFile(disputeId: string, evidenceId: string): Promise<Blob> {
    return getFile(`/disputes/${disputeId}/evidence/${evidenceId}/file`);
  },

  /**
   * Schedule mediation session
   */
  async scheduleMediation(disputeId: string, data: { 
    date: string; 
    time: string; 
    location: string; 
    mediatorId: string;
    agenda?: string;
  }): Promise<DisputeServiceResponse<DisputeTimeline>> {
    return post<any>(`/disputes/${disputeId}/mediation/schedule`, data);
  },

  /**
   * Record mediation outcome
   */
  async recordMediationOutcome(disputeId: string, data: {
    outcome: 'agreement' | 'no_agreement';
    agreementTerms?: string[];
    notes?: string;
    nextSteps?: string;
  }): Promise<DisputeServiceResponse<DisputeTimeline>> {
    return post<any>(`/disputes/${disputeId}/mediation/outcome`, data);
  },

  /**
   * Schedule arbitration hearing
   */
  async scheduleArbitration(disputeId: string, data: {
    date: string;
    time: string;
    location: string;
    arbitratorId: string;
    arbitratorLicense: string;
    estimatedDuration: number;
    agenda?: string;
  }): Promise<DisputeServiceResponse<DisputeTimeline>> {
    return post<any>(`/disputes/${disputeId}/arbitration/schedule`, data);
  },

  /**
   * Record arbitration decision
   */
  async recordArbitrationDecision(disputeId: string, data: {
    decision: string;
    rationale: string;
    compensation?: Compensation;
    complianceRequirements?: string[];
    implementationDeadline?: string;
    appealDeadline?: string;
  }): Promise<DisputeServiceResponse<DisputeResolution>> {
    return post<any>(`/disputes/${disputeId}/arbitration/decision`, data);
  },

  /**
   * Resolve dispute with full resolution details
   */
  async resolveDispute(disputeId: string, resolution: DisputeResolution): Promise<DisputeServiceResponse<LaborDispute>> {
    return post<any>(`/disputes/${disputeId}/resolve`, resolution);
  },

  /**
   * Withdraw dispute (by complainant)
   */
  async withdrawDispute(disputeId: string, reason: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return post<any>(`/disputes/${disputeId}/withdraw`, { reason });
  },

  /**
   * Escalate dispute to higher jurisdiction
   */
  async escalateDispute(disputeId: string, targetJurisdiction: 'appeal' | 'supreme'): Promise<DisputeServiceResponse<LaborDispute>> {
    return post<any>(`/disputes/${disputeId}/escalate`, { targetJurisdiction });
  },

  /**
   * File appeal against decision
   */
  async fileAppeal(disputeId: string, appeal: { reason: string; grounds: string[]; documents?: File[] }): Promise<DisputeServiceResponse<LaborDispute>> {
    const formData = new FormData();
    formData.append('reason', appeal.reason);
    formData.append('grounds', JSON.stringify(appeal.grounds));
    
    if (appeal.documents?.length) {
      appeal.documents.forEach((doc, i) => {
        formData.append(`appeal_doc_${i}`, doc);
      });
    }
    
    return postFormData<any>(`/disputes/${disputeId}/appeal`, formData);
  },

  /**
   * Get dispute statistics
   */
  async getStatistics(params?: { governorate?: string; dateFrom?: string; dateTo?: string }): Promise<DisputeServiceResponse<{
    total: number;
    byStatus: Record<DisputeStatus, number>;
    byCategory: Record<DisputeCategory, number>;
    averageResolutionDays: number;
    pendingCount: number;
    resolvedCount: number;
  }>> {
    const query = new URLSearchParams();
    if (params?.governorate) query.set('governorate', params.governorate);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    
    return get<any>(`/disputes/statistics?${query.toString()}`);
  },

  /**
   * Generate case report
   */
  async generateCaseReport(disputeId: string): Promise<DisputeServiceResponse<{ reportUrl: string }>> {
    return get<any>(`/disputes/${disputeId}/report`);
  },

  /**
   * Check SLA compliance
   */
  async checkSLA(disputeId: string): Promise<DisputeServiceResponse<{ 
    status: 'on_track' | 'at_risk' | 'breached';
    daysRemaining: number;
    targetDate: string;
    complianceRate: number;
  }>> {
    return get<any>(`/disputes/${disputeId}/sla`);
  },

  // ==================== CROSS-PORTAL INTEGRATIONS ====================

  /**
   * Link dispute to OSH incident
   */
  async linkOSHIncident(disputeId: string, oshIncidentId: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return post<any>(`/disputes/${disputeId}/link/osh`, { oshIncidentId });
  },

  /**
   * Link dispute to contract
   */
  async linkContract(disputeId: string, contractId: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return post<any>(`/disputes/${disputeId}/link/contract`, { contractId });
  },

  /**
   * Link dispute to employer
   */
  async linkEmployer(disputeId: string, employerEntityId: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return post<any>(`/disputes/${disputeId}/link/employer`, { employerEntityId });
  },

  /**
   * Link dispute to worker
   */
  async linkWorker(disputeId: string, workerId: string): Promise<DisputeServiceResponse<LaborDispute>> {
    return post<any>(`/disputes/${disputeId}/link/worker`, { workerId });
  },

  /**
   * Notify union about dispute
   */
  async notifyUnion(disputeId: string, unionId: string, message?: string): Promise<DisputeServiceResponse<void>> {
    return post<any>(`/disputes/${disputeId}/notify/union`, { unionId, message });
  },

  /**
   * Notify employer about dispute
   */
  async notifyEmployer(disputeId: string, employerEntityId: string, message?: string): Promise<DisputeServiceResponse<void>> {
    return post<any>(`/disputes/${disputeId}/notify/employer`, { employerEntityId, message });
  },

  /**
   * Get dispute template for specific category
   */
  async getTemplate(category: DisputeCategory): Promise<DisputeServiceResponse<{
    requiredFields: string[];
    requiredDocuments: string[];
    guidanceNotes: string[];
    legalBasis: string[];
  }>> {
    return get<any>(`/disputes/templates/${category}`);
  },

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(disputeIds: string[], status: DisputeStatus): Promise<DisputeServiceResponse<{ updatedCount: number }>> {
    return post<any>('/disputes/bulk/status', { disputeIds, status });
  },

  /**
   * Bulk assign
   */
  async bulkAssign(disputeIds: string[], assignedTo: string): Promise<DisputeServiceResponse<{ assignedCount: number }>> {
    return post<any>('/disputes/bulk/assign', { disputeIds, assignedTo });
  },

  /**
   * Export disputes to Excel/PDF
   */
  async exportDisputes(filters: DisputeFilters, format: 'xlsx' | 'pdf' | 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.category?.length) params.set('category', filters.category.join(','));
    if (filters.priority?.length) params.set('priority', filters.priority.join(','));
    if (filters.governorate) params.set('governorate', filters.governorate);
    params.set('format', format);
    
    return getFile(`/disputes/export?${params.toString()}`);
  },
};

export default disputeService;
