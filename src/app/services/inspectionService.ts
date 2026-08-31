/**
 * inspectionService.ts — Production-Grade Inspection Scheduling & Execution Service
 * Yemen National Labor Platform — Law 5/1995 & Law 23/1997
 * Integrates: Ministry ↔ Inspector Field App ↔ Employer OS ↔ Worker Passport
 */

import { get, post, put, del, getFile, uploadFile, postFormData } from './api';

export type InspectionType = 
  | 'scheduled' | 'complaint_based' | 'follow_up' | 'random' | 'OSH' | 'wage_compliance' | 'child_labor';

export type InspectionStatus = 
  | 'planned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' 
  | 'report_submitted' | 'violations_found' | 'no_violations' | 'escalated';

export type ViolationSeverity = 'minor' | 'major' | 'critical';
export type ViolationStatus = 'identified' | 'notice_issued' | 'under_remediation' | 'resolved' | 'escalated';

export interface InspectionSchedule {
  id: string;
  inspectionId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number; // minutes
  location: string;
  governorate: string;
  directorate: string;
  assignedInspector: string;
  assignedInspectorName: string;
  notes?: string;
}

export interface InspectionViolation {
  id: string;
  inspectionId: string;
  category: string;
  description: string;
  severity: ViolationSeverity;
  legalReference?: string;
  evidence?: string[];
  remediationDeadline?: string;
  status: ViolationStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface InspectionAttachment {
  id: string;
  inspectionId: string;
  type: 'photo' | 'document' | 'video' | 'audio' | 'form';
  filename: string;
  fileId: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export interface InspectionWitness {
  id: string;
  name: string;
  role: string;
  idNumber: string;
  signature?: boolean;
  presentAt?: string;
}

export interface InspectionReport {
  id: string;
  inspectionId: string;
  summary: string;
  findings: string[];
  violations: InspectionViolation[];
  recommendations: string[];
  inspectorConclusions?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Inspection {
  id: string;
  caseNumber: string;
  type: InspectionType;
  status: InspectionStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Subject
  entityId: string;
  entityName: string;
  entityType: 'employer' | 'union' | 'training_center' | 'agency';
  entityLicense?: string;
  
  // Location
  address: string;
  governorate: string;
  directorate: string;
  coordinates?: { lat: number; lng: number };
  
  // Scheduling
  schedule: InspectionSchedule;
  
  // Context
  triggerReason?: string;
  complaintId?: string;
  disputeId?: string;
  previousInspectionId?: string;
  
  // Execution
  startTime?: string;
  endTime?: string;
  actualDuration?: number;
  areaInspected?: string[];
  areasNotAccessible?: string[];
  
  // Participants
  inspector?: string;
  inspectorName?: string;
  witnesses: InspectionWitness[];
  
  // Results
  violations: InspectionViolation[];
  attachments: InspectionAttachment[];
  report?: InspectionReport;
  
  // OSH specific
  oshContext?: {
    hasOSHCommittee: boolean;
    hasOSHRepresentative: boolean;
    lastOSHTraining?: string;
    hasAccidentRegister: boolean;
    hasMedicalExaminations: boolean;
  };
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  slaStatus?: 'on_track' | 'at_risk' | 'breached';
}

export interface InspectionFilters {
  type?: InspectionType[];
  status?: InspectionStatus[];
  priority?: string[];
  governorate?: string;
  directorate?: string;
  assignedInspector?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateInspectionRequest {
  type: InspectionType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  entityId: string;
  entityName: string;
  entityType: Inspection['entityType'];
  entityLicense?: string;
  address: string;
  governorate: string;
  directorate: string;
  coordinates?: { lat: number; lng: number };
  scheduledDate: string;
  scheduledTime: string;
  duration?: number;
  triggerReason?: string;
  complaintId?: string;
  disputeId?: string;
  notes?: string;
}

export interface InspectionServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

// ============================================================
// PRODUCTION-GRADE INSPECTION SCHEDULING SERVICE
// ============================================================

export const inspectionService = {
  /**
   * List inspections with advanced filtering
   */
  async listInspections(filters: InspectionFilters = {}): Promise<InspectionServiceResponse<{ inspections: Inspection[]; meta: any }>> {
    const params = new URLSearchParams();
    
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.priority?.length) params.set('priority', filters.priority.join(','));
    if (filters.governorate) params.set('governorate', filters.governorate);
    if (filters.directorate) params.set('directorate', filters.directorate);
    if (filters.assignedInspector) params.set('assignedInspector', filters.assignedInspector);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    
    return get<any>(`/inspections?${params.toString()}`);
  },

  /**
   * Get single inspection with full details
   */
  async getInspection(id: string): Promise<InspectionServiceResponse<Inspection>> {
    return get<any>(`/inspections/${id}`);
  },

  /**
   * Create new inspection
   */
  async createInspection(data: CreateInspectionRequest): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>('/inspections', data);
  },

  /**
   * Update inspection
   */
  async updateInspection(id: string, data: Partial<Inspection>): Promise<InspectionServiceResponse<Inspection>> {
    return put<any>(`/inspections/${id}`, data);
  },

  /**
   * Assign inspector
   */
  async assignInspector(inspectionId: string, inspectorId: string): Promise<InspectionServiceResponse<Inspection>> {
    return put<any>(`/inspections/${inspectionId}/assign`, { inspectorId });
  },

  /**
   * Reassign inspection
   */
  async reassignInspection(inspectionId: string, newInspectorId: string, reason: string): Promise<InspectionServiceResponse<Inspection>> {
    return put<any>(`/inspections/${inspectionId}/reassign`, { newInspectorId, reason });
  },

  /**
   * Reschedule inspection
   */
  async rescheduleInspection(inspectionId: string, data: { date: string; time: string; reason: string }): Promise<InspectionServiceResponse<Inspection>> {
    return put<any>(`/inspections/${inspectionId}/reschedule`, data);
  },

  /**
   * Start inspection (field inspector begins)
   */
  async startInspection(inspectionId: string, data: { 
    actualStartTime: string;
    witnessNames?: string[];
    areaInspected?: string[];
  }): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/start`, data);
  },

  /**
   * Record inspection findings in progress
   */
  async recordFinding(inspectionId: string, data: {
    finding: string;
    area: string;
    evidence?: File[];
  }): Promise<InspectionServiceResponse<{ findingId: string }>> {
    const formData = new FormData();
    formData.append('finding', data.finding);
    formData.append('area', data.area);
    if (data.evidence?.length) {
      data.evidence.forEach((file, i) => formData.append(`evidence_${i}`, file));
    }
    return postFormData<any>(`/inspections/${inspectionId}/findings`, formData);
  },

  /**
   * Add violation
   */
  async addViolation(inspectionId: string, violation: Omit<InspectionViolation, 'id' | 'inspectionId'>): Promise<InspectionServiceResponse<InspectionViolation>> {
    return post<any>(`/inspections/${inspectionId}/violations`, violation);
  },

  /**
   * Update violation
   */
  async updateViolation(inspectionId: string, violationId: string, data: Partial<InspectionViolation>): Promise<InspectionServiceResponse<InspectionViolation>> {
    return put<any>(`/inspections/${inspectionId}/violations/${violationId}`, data);
  },

  /**
   * Upload inspection attachment
   */
  async uploadAttachment(inspectionId: string, file: File, metadata: { type: InspectionAttachment['type']; description?: string }): Promise<InspectionServiceResponse<InspectionAttachment>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', metadata.type);
    if (metadata.description) formData.append('description', metadata.description);
    return uploadFile<any>(`/inspections/${inspectionId}/attachments`, formData);
  },

  /**
   * Add witness
   */
  async addWitness(inspectionId: string, witness: Omit<InspectionWitness, 'id'>): Promise<InspectionServiceResponse<InspectionWitness>> {
    return post<any>(`/inspections/${inspectionId}/witnesses`, witness);
  },

  /**
   * Complete inspection
   */
  async completeInspection(inspectionId: string, data: {
    endTime: string;
    actualDuration: number;
    areasNotAccessible?: string[];
    summary: string;
    oshContext?: Inspection['oshContext'];
  }): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/complete`, data);
  },

  /**
   * Submit inspection report
   */
  async submitReport(inspectionId: string, report: Omit<InspectionReport, 'id' | 'inspectionId' | 'submittedAt'>): Promise<InspectionServiceResponse<InspectionReport>> {
    return post<any>(`/inspections/${inspectionId}/report`, report);
  },

  /**
   * Approve inspection report
   */
  async approveReport(inspectionId: string, comments?: string): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/approve`, { comments });
  },

  /**
   * Request revision on report
   */
  async requestRevision(inspectionId: string, revisionNotes: string): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/revision`, { revisionNotes });
  },

  /**
   * Schedule follow-up inspection
   */
  async scheduleFollowUp(inspectionId: string, data: {
    scheduledDate: string;
    scheduledTime: string;
    focusAreas: string[];
    previousInspectionId: string;
  }): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/follow-up`, data);
  },

  /**
   * Cancel inspection
   */
  async cancelInspection(inspectionId: string, reason: string): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/cancel`, { reason });
  },

  /**
   * Escalate to legal
   */
  async escalateToLegal(inspectionId: string, escalationNote: string, legalTeamId?: string): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/escalate`, { escalationNote, legalTeamId });
  },

  // ==================== CROSS-PORTAL INTEGRATIONS ====================

  /**
   * Link to complaint
   */
  async linkComplaint(inspectionId: string, complaintId: string): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/link/complaint`, { complaintId });
  },

  /**
   * Link to dispute
   */
  async linkDispute(inspectionId: string, disputeId: string): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/link/dispute`, { disputeId });
  },

  /**
   * Link to OSH incident
   */
  async linkOSHIncident(inspectionId: string, oshIncidentId: string): Promise<InspectionServiceResponse<Inspection>> {
    return post<any>(`/inspections/${inspectionId}/link/osh`, { oshIncidentId });
  },

  /**
   * Notify employer
   */
  async notifyEmployer(inspectionId: string, employerEntityId: string, notificationType: 'scheduled' | 'completed' | 'violations'): Promise<InspectionServiceResponse<void>> {
    return post<any>(`/inspections/${inspectionId}/notify/employer`, { employerEntityId, notificationType });
  },

  /**
   * Notify worker representative
   */
  async notifyWorkers(inspectionId: string, message: string): Promise<InspectionServiceResponse<void>> {
    return post<any>(`/inspections/${inspectionId}/notify/workers`, { message });
  },

  // ==================== ANALYTICS ====================

  /**
   * Get inspection statistics
   */
  async getStatistics(params?: { governorate?: string; dateFrom?: string; dateTo?: string }): Promise<InspectionServiceResponse<{
    total: number;
    byStatus: Record<InspectionStatus, number>;
    byType: Record<InspectionType, number>;
    violationsFound: number;
    complianceRate: number;
    averageDuration: number;
    inspectorPerformance: Array<{ inspectorId: string; completed: number; violationsFound: number }>;
  }>> {
    const query = new URLSearchParams();
    if (params?.governorate) query.set('governorate', params.governorate);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    return get<any>(`/inspections/statistics?${query.toString()}`);
  },

  /**
   * Generate inspection report
   */
  async generateReport(inspectionId: string, format: 'pdf' | 'docx'): Promise<Blob> {
    return getFile(`/inspections/${inspectionId}/report?format=${format}`);
  },

  /**
   * Export inspections
   */
  async exportInspections(filters: InspectionFilters, format: 'xlsx' | 'pdf' | 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.governorate) params.set('governorate', filters.governorate);
    params.set('format', format);
    return getFile(`/inspections/export?${params.toString()}`);
  },

  /**
   * Get inspector's schedule
   */
  async getInspectorSchedule(inspectorId: string, dateFrom: string, dateTo: string): Promise<InspectionServiceResponse<Inspection[]>> {
    return get<any>(`/inspections/schedule/${inspectorId}?dateFrom=${dateFrom}&dateTo=${dateTo}`);
  },

  /**
   * Get field checklist for inspection type
   */
  async getChecklist(type: InspectionType): Promise<InspectionServiceResponse<{
    sections: Array<{ title: string; items: string[] }>;
  }>> {
    return get<any>(`/inspections/checklist/${type}`);
  },
};

export default inspectionService;
