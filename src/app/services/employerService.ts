import type { PaginationMeta } from '../types/api';
/**
 * employerService.ts — Production-Grade Employer OS (Employer Operations System) Service
 * Yemen National Labor Platform
 * Employer self-service, compliance, workforce management, financial operations
 */

import { get, post, put } from './api';

export interface EmployerEntity {
  id: string;
  commercialRecord: string;
  name: string;
  nameAr: string;
  legalForm: 'sole_proprietorship' | 'partnership' | 'llc' | 'jsc' | 'government' | 'ngo';
  sector: string;
  isicCode?: string;
  establishedDate: string;
  status: 'active' | 'suspended' | 'closed' | 'pending';
  
  // Location
  address: string;
  governorate: string;
  directorate: string;
  
  // Contact
  phone: string;
  email: string;
  website?: string;
  
  // Compliance
  complianceScore: number;
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  activeViolations: number;
  pendingDisputes: number;
  
  // Workforce
  totalEmployees: number;
  yemeniEmployees: number;
  expatriateEmployees: number;
  
  // Financial
  licenseExpiryDate?: string;
  feesUpToDate: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface EmployerWorkforce {
  totalEmployees: number;
  byDepartment: Record<string, number>;
  byProfession: Record<string, number>;
  byContractType: Record<string, number>;
  byNationality: Record<string, number>;
  averageTenure: number;
  turnoverRate: number;
}

export interface ComplianceItem {
  id: string;
  category: 'OSH' | 'wages' | 'contracts' | 'training' | 'documentation' | 'social_security' | 'tax';
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'pending_review';
  lastChecked: string;
  nextCheck: string;
  evidence?: string[];
  remediationSteps?: string[];
}

export interface EmployerDashboard {
  entity: EmployerEntity;
  workforce: EmployerWorkforce;
  complianceItems: ComplianceItem[];
  pendingActions: Array<{ title: string; dueDate: string; severity: 'low' | 'medium' | 'high' }>;
  recentNotifications: any[];
  upcomingInspections: any[];
  expiringLicenses: any[];
  financialSummary: {
    totalFeesDue: number;
    totalFeesPaid: number;
    nextPaymentDue?: string;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

// ============================================================
// PRODUCTION-GRADE EMPLOYER SERVICE
// ============================================================

export const employerService = {
  /**
   * Get my employer entity
   */
  async getMyEntity(): Promise<ServiceResponse<EmployerEntity>> {
    return get<any>('/employer/me');
  },

  /**
   * Get employer by ID
   */
  async getEntity(entityId: string): Promise<ServiceResponse<EmployerEntity>> {
    return get<any>(`/employer/${entityId}`);
  },

  /**
   * Update employer info
   */
  async updateEntity(entityId: string, data: Partial<EmployerEntity>): Promise<ServiceResponse<EmployerEntity>> {
    return put<any>(`/employer/${entityId}`, data);
  },

  /**
   * Get employer dashboard
   */
  async getDashboard(): Promise<ServiceResponse<EmployerDashboard>> {
    return get<any>('/employer/me/dashboard');
  },

  /**
   * Get workforce statistics
   */
  async getWorkforceStats(filters?: { dateFrom?: string; dateTo?: string }): Promise<ServiceResponse<EmployerWorkforce>> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    return get<any>(`/employer/me/workforce?${params.toString()}`);
  },

  /**
   * Get compliance status
   */
  async getCompliance(): Promise<ServiceResponse<{ items: ComplianceItem[]; overallScore: number }>> {
    return get<any>('/employer/me/compliance');
  },

  /**
   * Submit self-assessment
   */
  async submitSelfAssessment(data: {
    responses: Record<string, any>;
    attestations: string[];
  }): Promise<ServiceResponse<{ score: number; reportUrl: string }>> {
    return post<any>('/employer/me/self-assessment', data);
  },

  /**
   * List employer employees
   */
  async listEmployees(filters?: {
    status?: string[];
    department?: string;
    professionId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ServiceResponse<{ employees: any[]; meta: PaginationMeta }>> {
    const params = new URLSearchParams();
    if (filters?.status?.length) params.set('status', filters.status.join(','));
    if (filters?.department) params.set('department', filters.department);
    if (filters?.professionId) params.set('professionId', filters.professionId);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    return get<any>(`/employer/me/employees?${params.toString()}`);
  },

  /**
   * Get pending services/applications
   */
  async getPendingServices(): Promise<ServiceResponse<{ services: any[]; meta: PaginationMeta }>> {
    return get<any>('/employer/me/services/pending');
  },

  /**
   * Get financial summary
   */
  async getFinancialSummary(filters?: { year?: number }): Promise<ServiceResponse<{
    totalRevenue: number;
    totalExpenses: number;
    feesBreakdown: Array<{ type: string; due: number; paid: number; outstanding: number }>;
    upcomingPayments: any[];
  }>> {
    const params = new URLSearchParams();
    if (filters?.year) params.set('year', String(filters.year));
    return get<any>(`/employer/me/financial-summary?${params.toString()}`);
  },

  /**
   * Get OSH compliance specifically
   */
  async getOSHCompliance(): Promise<ServiceResponse<{
    hasOSHCommittee: boolean;
    hasOSHRepresentative: boolean;
    hasOSHTraining: boolean;
    hasMedicalExaminations: boolean;
    openIncidents: number;
    pendingRemediations: number;
    complianceScore: number;
  }>> {
    return get<any>('/employer/me/osh-compliance');
  },

  /**
   * Submit OSH checklist
   */
  async submitOSHChecklist(checklist: {
    hasOSHCommittee: boolean;
    hasOSHRepresentative: boolean;
    hasOSHPolicy: boolean;
    hasRiskAssessment: boolean;
    hasEmergencyPlan: boolean;
    hasFireExtinguishers: boolean;
    hasFirstAidKit: boolean;
    hasPPEAvailable: boolean;
    hasOSHTraining: boolean;
    hasAccidentRegister: boolean;
    hazardsIdentified: string[];
    notes?: string;
  }): Promise<ServiceResponse<{ score: number; recommendations: string[] }>> {
    return post<any>('/employer/me/osh-checklist', checklist);
  },

  /**
   * Get upcoming inspections
   */
  async getUpcomingInspections(): Promise<ServiceResponse<{ inspections: any[] }>> {
    return get<any>('/employer/me/inspections/upcoming');
  },

  /**
   * Pay fees
   */
  async payFees(data: { feeIds: string[]; paymentMethod: string; reference?: string }): Promise<ServiceResponse<{ paymentId: string; receiptUrl: string }>> {
    return post<any>('/employer/me/fees/pay', data);
  } };

export default employerService;