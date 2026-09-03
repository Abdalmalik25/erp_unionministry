import type { PaginationMeta } from '../types/api';
/**
 * oshService.ts — Production-Grade OSH (Occupational Safety & Health) Platform Service
 * Yemen National Labor Platform — Law 23/1997 (OSH)
 * Integrates: Ministry OSH Unit ↔ Inspector Field App ↔ Employer OS ↔ Worker Passport
 */

import { get, post, put, getFile, postFormData } from './api';

export type OSHIncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical' | 'fatal';
export type OSHIncidentStatus = 'reported' | 'investigating' | 'under_review' | 'remediation_in_progress' | 'closed' | 'escalated';
export type OSHIncidentType = 'injury' | 'illness' | 'fatality' | 'near_miss' | 'property_damage' | 'environmental' | 'exposure';

export interface OSHIncident {
  id: string;
  caseNumber: string;
  type: OSHIncidentType;
  severity: OSHIncidentSeverity;
  status: OSHIncidentStatus;
  
  // Occurrence
  incidentDate: string;
  incidentTime: string;
  reportedAt: string;
  reportedBy: string;
  
  // Location
  employerEntityId: string;
  employerName: string;
  workplaceLocation: string;
  governorate: string;
  directorate: string;
  sector: string;
  
  // Worker involved
  workersInvolved: Array<{
    workerId: string;
    workerName: string;
    injuryType?: string;
    bodyPartAffected?: string;
    medicalAttention?: 'none' | 'first_aid' | 'outpatient' | 'hospitalized' | 'fatal';
    daysOffWork?: number;
    isHospitalized?: boolean;
    medicalReport?: string;
  }>;
  
  // Description
  title: string;
  description: string;
  causeAnalysis?: string;
  rootCause?: string;
  immediateAction?: string;
  
  // Investigation
  investigation?: {
    investigators: string[];
    investigationStartedAt?: string;
    investigationCompletedAt?: string;
    findings: string[];
    recommendations: string[];
    linkedInspectionId?: string;
    linkedDisputeId?: string;
  };
  
  // Compensation
  compensation?: {
    amount?: number;
    currency?: string;
    type?: 'medical' | 'disability' | 'death' | 'rehabilitation' | 'other';
    paidBy?: string;
    insuranceClaim?: string;
    insuranceCompany?: string;
  };
  
  // Remediation
  remediation?: {
    required: boolean;
    actions: Array<{
      action: string;
      responsiblePerson: string;
      deadline: string;
      completedAt?: string;
      verifiedBy?: string;
    }>;
  };
  
  // Notifications
  notificationsSent: Array<{
    recipient: string;
    type: string;
    sentAt: string;
  }>;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface OSHInspectionChecklist {
  hasOSHCommittee: boolean;
  hasOSHRepresentative: boolean;
  lastOSHAuditDate?: string;
  hasOSHPolicy: boolean;
  hasRiskAssessment: boolean;
  hasEmergencyPlan: boolean;
  hasFireExtinguishers: boolean;
  hasFirstAidKit: boolean;
  hasSafetySignage: boolean;
  hasPPEAvailable: boolean;
  ppeUsedByWorkers: boolean;
  hasAccidentRegister: boolean;
  hasMedicalExaminations: boolean;
  hasOSHTraining: boolean;
  hasOSHMeetings: boolean;
  hazardsIdentified: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  followUpRequired: boolean;
}

export interface OSHStatistics {
  totalIncidents: number;
  bySeverity: Record<OSHIncidentSeverity, number>;
  byType: Record<OSHIncidentType, number>;
  bySector: Record<string, number>;
  fatalities: number;
  injuries: number;
  workplaceComplianceRate: number;
  averageRemediationTime: number; // days
}

export interface OSHFilters {
  type?: OSHIncidentType[];
  severity?: OSHIncidentSeverity[];
  status?: OSHIncidentStatus[];
  governorate?: string;
  employerEntityId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

// ============================================================
// PRODUCTION-GRADE OSH SERVICE
// ============================================================

export const oshService = {
  // ==================== INCIDENTS ====================

  /**
   * Report new OSH incident
   */
  async reportIncident(data: {
    type: OSHIncidentType;
    severity: OSHIncidentSeverity;
    incidentDate: string;
    incidentTime: string;
    employerEntityId: string;
    employerName: string;
    workplaceLocation: string;
    governorate: string;
    directorate: string;
    sector: string;
    workersInvolved: OSHIncident['workersInvolved'];
    title: string;
    description: string;
    immediateAction?: string;
    files?: File[];
  }): Promise<ServiceResponse<OSHIncident>> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (data.files?.length) {
      data.files.forEach((file, i) => formData.append(`file_${i}`, file));
    }
    return postFormData<any>('/osh/incidents/report', formData);
  },

  /**
   * List incidents
   */
  async listIncidents(filters: OSHFilters = {}): Promise<ServiceResponse<{ incidents: OSHIncident[]; meta: PaginationMeta }>> {
    const params = new URLSearchParams();
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.severity?.length) params.set('severity', filters.severity.join(','));
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.governorate) params.set('governorate', filters.governorate);
    if (filters.employerEntityId) params.set('employerEntityId', filters.employerEntityId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    return get<any>(`/osh/incidents?${params.toString()}`);
  },

  /**
   * Get incident details
   */
  async getIncident(id: string): Promise<ServiceResponse<OSHIncident>> {
    return get<any>(`/osh/incidents/${id}`);
  },

  /**
   * Update incident
   */
  async updateIncident(id: string, data: Partial<OSHIncident>): Promise<ServiceResponse<OSHIncident>> {
    return put<any>(`/osh/incidents/${id}`, data);
  },

  /**
   * Update incident status
   */
  async updateIncidentStatus(id: string, status: OSHIncidentStatus, note?: string): Promise<ServiceResponse<OSHIncident>> {
    return put<any>(`/osh/incidents/${id}/status`, { status, note });
  },

  /**
   * Submit investigation
   */
  async submitInvestigation(id: string, investigation: OSHIncident['investigation']): Promise<ServiceResponse<OSHIncident>> {
    return post<any>(`/osh/incidents/${id}/investigation`, investigation);
  },

  /**
   * Submit remediation plan
   */
  async submitRemediation(id: string, remediation: OSHIncident['remediation']): Promise<ServiceResponse<OSHIncident>> {
    return post<any>(`/osh/incidents/${id}/remediation`, remediation);
  },

  /**
   * Verify remediation action
   */
  async verifyRemediation(incidentId: string, actionId: string, verified: boolean, notes?: string): Promise<ServiceResponse<OSHIncident>> {
    return post<any>(`/osh/incidents/${incidentId}/remediation/${actionId}/verify`, { verified, notes });
  },

  // ==================== INSPECTION CHECKLISTS ====================

  /**
   * Submit OSH inspection checklist
   */
  async submitChecklist(data: OSHInspectionChecklist & { employerEntityId: string; inspectionId?: string }): Promise<ServiceResponse<{ checklistId: string }>> {
    return post<any>('/osh/checklists', data);
  },

  /**
   * Get checklist for employer
   */
  async getEmployerChecklist(employerEntityId: string): Promise<ServiceResponse<OSHInspectionChecklist & { lastUpdated: string }>> {
    return get<any>(`/osh/checklists/${employerEntityId}`);
  },

  // ==================== CROSS-PORTAL INTEGRATIONS ====================

  /**
   * Link incident to inspection
   */
  async linkInspection(incidentId: string, inspectionId: string): Promise<ServiceResponse<OSHIncident>> {
    return post<any>(`/osh/incidents/${incidentId}/link/inspection`, { inspectionId });
  },

  /**
   * Link incident to dispute
   */
  async linkDispute(incidentId: string, disputeId: string): Promise<ServiceResponse<OSHIncident>> {
    return post<any>(`/osh/incidents/${incidentId}/link/dispute`, { disputeId });
  },

  /**
   * Link incident to worker passport
   */
  async linkWorkerPassport(incidentId: string, workerId: string): Promise<ServiceResponse<OSHIncident>> {
    return post<any>(`/osh/incidents/${incidentId}/link/worker`, { workerId });
  },

  /**
   * Escalate to legal action
   */
  async escalateToLegal(incidentId: string, escalationNote: string): Promise<ServiceResponse<OSHIncident>> {
    return post<any>(`/osh/incidents/${incidentId}/escalate`, { escalationNote });
  },

  // ==================== ANALYTICS ====================

  /**
   * Get OSH statistics
   */
  async getStatistics(filters?: { governorate?: string; sector?: string; dateFrom?: string; dateTo?: string }): Promise<ServiceResponse<OSHStatistics>> {
    const params = new URLSearchParams();
    if (filters?.governorate) params.set('governorate', filters.governorate);
    if (filters?.sector) params.set('sector', filters.sector);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    return get<any>(`/osh/statistics?${params.toString()}`);
  },

  /**
   * Get employer's OSH record
   */
  async getEmployerOSHRecord(employerEntityId: string): Promise<ServiceResponse<{
    employer: any;
    incidents: OSHIncident[];
    checklists: OSHInspectionChecklist[];
    complianceScore: number;
    lastInspectionDate?: string;
    remediationCompletion: number;
  }>> {
    return get<any>(`/osh/employer/${employerEntityId}/record`);
  },

  /**
   * Generate OSH report
   */
  async generateReport(filters: OSHFilters, format: 'pdf' | 'xlsx'): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.type?.length) params.set('type', filters.type.join(','));
    if (filters.severity?.length) params.set('severity', filters.severity.join(','));
    if (filters.governorate) params.set('governorate', filters.governorate);
    params.set('format', format);
    return getFile(`/osh/report?${params.toString()}`);
  } };

export default oshService;