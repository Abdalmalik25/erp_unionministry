/**
 * reportingService.ts — Institutional-Grade Reporting Engine
 * Yemen National Labor Platform
 * 
 * Production-grade reporting with:
 * - Pre-built institutional templates (Yemen labor stats)
 * - Custom report builder
 * - Multi-format export (PDF, Excel, CSV, JSON)
 * - Scheduled reports
 * - Data lineage & integrity
 * - Cross-portal data consolidation
 */

import { get, post, put, del, getFile, postFormData } from './api';

export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json' | 'html';
export type ReportStatus = 'draft' | 'pending' | 'generating' | 'ready' | 'failed' | 'expired';

export type ReportCategory = 
  | 'workforce_demographics' | 'sector_analysis' | 'governorate_breakdown'
  | 'compliance_overview' | 'inspection_summary' | 'dispute_statistics'
  | 'osh_incidents' | 'wage_analysis' | 'training_records'
  | 'union_governance' | 'employer_compliance' | 'contract_lifecycle'
  | 'financial_summary' | 'custom';

export interface ReportDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  category: ReportCategory;
  templateId?: string;
  config: ReportConfig;
  owner: string;
  ownerType: 'ministry' | 'employer' | 'union' | 'worker';
  isPublic: boolean;
  sharedWith: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportConfig {
  dataSource: 'registry' | 'transactions' | 'analytics' | 'merged';
  filters: Record<string, any>;
  groupBy?: string[];
  aggregations?: Array<{ field: string; type: 'sum' | 'avg' | 'count' | 'min' | 'max' }>;
  metrics?: string[];
  dimensions?: string[];
  dateRange?: { from: string; to: string };
  visualization?: 'table' | 'chart' | 'pivot' | 'kpi' | 'dashboard';
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'heatmap';
}

export interface GeneratedReport {
  id: string;
  reportDefinitionId: string;
  name: string;
  status: ReportStatus;
  format: ReportFormat;
  
  // Generation
  generatedAt: string;
  generatedBy: string;
  generationDurationMs?: number;
  
  // Output
  fileUrl?: string;
  fileSize?: number;
  rowCount?: number;
  
  // Data snapshot (for cached reports)
  dataSnapshot?: any;
  
  // Metadata
  expiresAt?: string;
  error?: string;
  
  // Schedule (if scheduled)
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'on_demand';
    cronExpression?: string;
    nextRunAt?: string;
    lastRunAt?: string;
  };
  
  recipients?: Array<{ userId?: string; email?: string; role?: string }>;
}

export interface ReportSchedule {
  id: string;
  reportDefinitionId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  cronExpression?: string;
  nextRunAt: string;
  lastRunAt?: string;
  recipients: Array<{ userId?: string; email?: string; role?: string }>;
  format: ReportFormat;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

// ============================================================
// INSTITUTIONAL-GRADE REPORTING ENGINE
// ============================================================

export const reportingService = {
  // ==================== REPORT DEFINITIONS ====================

  /**
   * List report definitions
   */
  async listReportDefinitions(filters?: {
    category?: ReportCategory;
    ownerType?: string;
    search?: string;
    isPublic?: boolean;
  }): Promise<ServiceResponse<{ reports: ReportDefinition[]; meta: any }>> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.ownerType) params.set('ownerType', filters.ownerType);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.isPublic !== undefined) params.set('isPublic', String(filters.isPublic));
    return get<any>(`/reports/definitions?${params.toString()}`);
  },

  /**
   * Create report definition
   */
  async createReportDefinition(data: Omit<ReportDefinition, 'id' | 'owner' | 'ownerType' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<ReportDefinition>> {
    return post<any>('/reports/definitions', data);
  },

  /**
   * Get report definition
   */
  async getReportDefinition(id: string): Promise<ServiceResponse<ReportDefinition>> {
    return get<any>(`/reports/definitions/${id}`);
  },

  /**
   * Update report definition
   */
  async updateReportDefinition(id: string, data: Partial<ReportDefinition>): Promise<ServiceResponse<ReportDefinition>> {
    return put<any>(`/reports/definitions/${id}`, data);
  },

  /**
   * Delete report definition
   */
  async deleteReportDefinition(id: string): Promise<ServiceResponse<void>> {
    return del<any>(`/reports/definitions/${id}`);
  },

  // ==================== REPORT GENERATION ====================

  /**
   * Generate report (on-demand)
   */
  async generateReport(definitionId: string, format: ReportFormat, params?: Record<string, any>): Promise<ServiceResponse<GeneratedReport>> {
    return post<any>(`/reports/definitions/${definitionId}/generate`, { format, params });
  },

  /**
   * List generated reports
   */
  async listGeneratedReports(filters?: {
    definitionId?: string;
    status?: ReportStatus;
    format?: ReportFormat;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<ServiceResponse<{ reports: GeneratedReport[]; meta: any }>> {
    const params = new URLSearchParams();
    if (filters?.definitionId) params.set('definitionId', filters.definitionId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.format) params.set('format', filters.format);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    return get<any>(`/reports/generated?${params.toString()}`);
  },

  /**
   * Get generated report
   */
  async getGeneratedReport(id: string): Promise<ServiceResponse<GeneratedReport>> {
    return get<any>(`/reports/generated/${id}`);
  },

  /**
   * Download generated report
   */
  async downloadReport(id: string): Promise<Blob> {
    return getFile(`/reports/generated/${id}/download`);
  },

  /**
   * Delete generated report
   */
  async deleteGeneratedReport(id: string): Promise<ServiceResponse<void>> {
    return del<any>(`/reports/generated/${id}`);
  },

  // ==================== PRE-BUILT INSTITUTIONAL REPORTS ====================

  /**
   * Yemen national labor force statistics
   */
  async getNationalLaborStats(filters?: { year?: number; governorate?: string }): Promise<ServiceResponse<{
    totalWorkforce: number;
    employed: number;
    unemployed: number;
    bySector: Array<{ sector: string; count: number; percentage: number }>;
    byGovernorate: Array<{ governorate: string; count: number; percentage: number }>;
    byGender: { male: number; female: number };
    byNationality: { yemeni: number; expatriate: number };
    unemploymentRate: number;
    participationRate: number;
  }>> {
    const params = new URLSearchParams();
    if (filters?.year) params.set('year', String(filters.year));
    if (filters?.governorate) params.set('governorate', filters.governorate);
    return get<any>(`/reports/institutional/national-labor-stats?${params.toString()}`);
  },

  /**
   * Sector analysis report
   */
  async getSectorAnalysis(filters?: { governorate?: string; year?: number }): Promise<ServiceResponse<{
    sectors: Array<{
      sector: string;
      totalEntities: number;
      totalEmployees: number;
      averageWage: number;
      complianceRate: number;
      growth: number;
    }>;
  }>> {
    const params = new URLSearchParams();
    if (filters?.governorate) params.set('governorate', filters.governorate);
    if (filters?.year) params.set('year', String(filters.year));
    return get<any>(`/reports/institutional/sector-analysis?${params.toString()}`);
  },

  /**
   * Compliance overview
   */
  async getComplianceOverview(filters?: { governorate?: string; dateFrom?: string; dateTo?: string }): Promise<ServiceResponse<{
    overallComplianceRate: number;
    byCategory: Record<string, { compliant: number; nonCompliant: number; rate: number }>;
    byGovernorate: Array<{ governorate: string; rate: number; issuesCount: number }>;
    topViolations: Array<{ type: string; count: number }>;
    trend: Array<{ date: string; rate: number }>;
  }>> {
    const params = new URLSearchParams();
    if (filters?.governorate) params.set('governorate', filters.governorate);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    return get<any>(`/reports/institutional/compliance-overview?${params.toString()}`);
  },

  /**
   * Inspection performance
   */
  async getInspectionPerformance(filters?: { governorate?: string; dateFrom?: string; dateTo?: string }): Promise<ServiceResponse<{
    totalInspections: number;
    completed: number;
    pending: number;
    averageCompletionDays: number;
    byInspector: Array<{ inspectorId: string; completed: number; violationsFound: number; performanceScore: number }>;
    violationsByType: Array<{ type: string; count: number }>;
  }>> {
    const params = new URLSearchParams();
    if (filters?.governorate) params.set('governorate', filters.governorate);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    return get<any>(`/reports/institutional/inspection-performance?${params.toString()}`);
  },

  /**
   * Dispute resolution metrics
   */
  async getDisputeMetrics(filters?: { governorate?: string; dateFrom?: string; dateTo?: string }): Promise<ServiceResponse<{
    totalDisputes: number;
    pending: number;
    resolved: number;
    averageResolutionDays: number;
    byCategory: Record<string, number>;
    byOutcome: Record<string, number>;
    complianceRate: number;
  }>> {
    const params = new URLSearchParams();
    if (filters?.governorate) params.set('governorate', filters.governorate);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    return get<any>(`/reports/institutional/dispute-metrics?${params.toString()}`);
  },

  /**
   * OSH incidents report
   */
  async getOSHIncidentReport(filters?: { governorate?: string; sector?: string; dateFrom?: string; dateTo?: string }): Promise<ServiceResponse<{
    totalIncidents: number;
    fatalities: number;
    injuries: number;
    bySeverity: Record<string, number>;
    bySector: Record<string, number>;
    byGovernorate: Record<string, number>;
    trend: Array<{ month: string; count: number }>;
    workplaceComplianceRate: number;
  }>> {
    const params = new URLSearchParams();
    if (filters?.governorate) params.set('governorate', filters.governorate);
    if (filters?.sector) params.set('sector', filters.sector);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    return get<any>(`/reports/institutional/osh-incidents?${params.toString()}`);
  },

  // ==================== SCHEDULED REPORTS ====================

  /**
   * List scheduled reports
   */
  async listSchedules(): Promise<ServiceResponse<{ schedules: ReportSchedule[] }>> {
    return get<any>('/reports/schedules');
  },

  /**
   * Create scheduled report
   */
  async createSchedule(data: Omit<ReportSchedule, 'id' | 'createdBy' | 'createdAt' | 'nextRunAt'>): Promise<ServiceResponse<ReportSchedule>> {
    return post<any>('/reports/schedules', data);
  },

  /**
   * Update scheduled report
   */
  async updateSchedule(id: string, data: Partial<ReportSchedule>): Promise<ServiceResponse<ReportSchedule>> {
    return put<any>(`/reports/schedules/${id}`, data);
  },

  /**
   * Delete scheduled report
   */
  async deleteSchedule(id: string): Promise<ServiceResponse<void>> {
    return del<any>(`/reports/schedules/${id}`);
  },

  /**
   * Trigger schedule manually
   */
  async triggerSchedule(id: string): Promise<ServiceResponse<{ generatedReportId: string }>> {
    return post<any>(`/reports/schedules/${id}/trigger`, {});
  },

  // ==================== CUSTOM BUILDER ====================

  /**
   * Get available data fields for report builder
   */
  async getAvailableFields(dataSource: ReportConfig['dataSource']): Promise<ServiceResponse<{
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'date' | 'boolean';
      description: string;
      table: string;
      filterable: boolean;
      aggregatable: boolean;
      groupable: boolean;
    }>;
  }>> {
    return get<any>(`/reports/builder/fields/${dataSource}`);
  },

  /**
   * Preview report data
   */
  async previewReport(config: ReportConfig): Promise<ServiceResponse<{
    data: any[];
    rowCount: number;
    aggregations?: Record<string, any>;
  }>> {
    return post<any>('/reports/builder/preview', config);
  },
};

export default reportingService;