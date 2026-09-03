import type { PaginationMeta } from '../types/api';
/**
 * crossPortalService.ts — Cross-Portal Integration & Orchestration Service
 * Yemen National Labor Platform
 * 
 * This is the foundational service that coordinates between:
 * - Ministry Workspace
 * - Employer OS
 * - Worker Passport
 * - Union/Organization Portal
 * - Inspector Field App
 * 
 * Implements:
 * - Unified Registries (commercial, profession, union, OSH)
 * - Cross-portal workflow orchestration
 * - Permission & role-based access integration
 * - Notification & messaging hub
 * - Master data governance
 */

import { get, post, put } from './api';




// ============================================================
// UNIFIED REGISTRIES (single source of truth across all portals)
// ============================================================

export interface UnifiedRegistryEntry<T = any> {
  id: string;
  type: 'commercial_establishment' | 'union' | 'profession' | 'worker' | 'employer' | 'license';
  data: T;
  status: 'active' | 'suspended' | 'cancelled' | 'pending' | 'under_review';
  lastModifiedAt: string;
  lastModifiedBy: string;
  version: number;
  hash?: string; // data integrity hash
  syncedAcrossPortals: boolean;
  portals: Array<'ministry' | 'employer' | 'worker' | 'union' | 'inspector'>;
}

export interface CrossPortalUser {
  id: string;
  globalUserId: string; // unified across all portals
  email: string;
  fullName: string;
  nationalId?: string;
  userType: 'ministry' | 'employer' | 'union' | 'worker';
  primaryPortal: string;
  accessiblePortals: string[];
  roles: string[];
  permissions: string[];
  jurisdiction?: {
    governorate?: string;
    directorate?: string;
  };
  linkedEntities: Array<{
    type: 'employer' | 'union' | 'worker';
    id: string;
    name: string;
    role: string;
  }>;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  isActive: boolean;
  consolidatedPermissions: string[];
}

export interface CrossPortalNotification {
  id: string;
  recipientUserId: string;
  recipientUserType: 'ministry' | 'employer' | 'union' | 'worker';
  sourcePortal: 'ministry' | 'employer' | 'worker' | 'union' | 'inspector' | 'system';
  type: 'workflow' | 'approval' | 'violation' | 'renewal' | 'dispute' | 'inspection' | 'contract' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface CrossPortalWorkflow {
  id: string;
  name: string;
  description: string;
  participants: Array<{
    portal: 'ministry' | 'employer' | 'worker' | 'union';
    userId: string;
    role: string;
  }>;
  steps: Array<{
    id: string;
    order: number;
    name: string;
    assignedTo: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
    startedAt?: string;
    completedAt?: string;
    output?: Record<string, any>;
  }>;
  status: 'in_progress' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  errors?: any;
}

// ============================================================
// CROSS-PORTAL SERVICE
// ============================================================

export const crossPortalService = {
  // ==================== UNIFIED REGISTRIES ====================

  /**
   * Get unified registry entry
   */
  async getRegistryEntry<T = any>(
    type: UnifiedRegistryEntry['type'],
    id: string
  ): Promise<ServiceResponse<UnifiedRegistryEntry<T>>> {
    return get<any>(`/cross-portal/registry/${type}/${id}`);
  },

  /**
   * Search unified registry
   */
  async searchRegistry<T = any>(
    type: UnifiedRegistryEntry['type'],
    query: string,
    filters?: Record<string, any>
  ): Promise<ServiceResponse<UnifiedRegistryEntry<T>[]>> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (filters) params.set('filters', JSON.stringify(filters));
    return get<any>(`/cross-portal/registry/${type}/search?${params.toString()}`);
  },

  /**
   * Sync entry across all portals
   */
  async syncRegistryEntry(type: UnifiedRegistryEntry['type'], id: string): Promise<ServiceResponse<{
    syncedPortals: string[];
    failedPortals: string[];
  }>> {
    return post<any>(`/cross-portal/registry/${type}/${id}/sync`, {});
  },

  /**
   * Cross-portal entity lookup (worker/employer/union from any portal)
   */
  async lookupEntity(identifier: {
    type: 'national_id' | 'commercial_record' | 'union_license' | 'passport' | 'entity_id';
    value: string;
  }): Promise<ServiceResponse<{
    type: 'worker' | 'employer' | 'union' | 'agency';
    entity: any;
    portals: string[];
    linkedEntities: any[];
  }>> {
    return post<any>('/cross-portal/lookup', identifier);
  },

  // ==================== CROSS-PORTAL WORKFLOWS ====================

  /**
   * Initiate cross-portal workflow
   */
  async initiateWorkflow(workflowType: string, data: {
    participants: CrossPortalWorkflow['participants'];
    context: Record<string, any>;
  }): Promise<ServiceResponse<CrossPortalWorkflow>> {
    return post<any>(`/cross-portal/workflows/${workflowType}/initiate`, data);
  },

  /**
   * Get workflow status
   */
  async getWorkflow(workflowId: string): Promise<ServiceResponse<CrossPortalWorkflow>> {
    return get<any>(`/cross-portal/workflows/${workflowId}`);
  },

  /**
   * Advance workflow step
   */
  async advanceWorkflowStep(workflowId: string, stepId: string, output?: Record<string, any>): Promise<ServiceResponse<CrossPortalWorkflow>> {
    return post<any>(`/cross-portal/workflows/${workflowId}/steps/${stepId}/advance`, { output });
  },

  /**
   * Pause workflow
   */
  async pauseWorkflow(workflowId: string, reason: string): Promise<ServiceResponse<CrossPortalWorkflow>> {
    return post<any>(`/cross-portal/workflows/${workflowId}/pause`, { reason });
  },

  /**
   * Cancel workflow
   */
  async cancelWorkflow(workflowId: string, reason: string): Promise<ServiceResponse<CrossPortalWorkflow>> {
    return post<any>(`/cross-portal/workflows/${workflowId}/cancel`, { reason });
  },

  // ==================== ORCHESTRATION: MAJOR DOMAIN CROSS-FLOWS ====================

  /**
   * Violation → Inspection → Dispute cascade
   * Triggers an inspection based on a violation, then optionally a dispute
   */
  async orchestrateViolationCascade(data: {
    violationId: string;
    inspectionType: 'OSH' | 'wage_compliance' | 'work_conditions' | 'comprehensive';
    scheduleImmediately: boolean;
    createDisputeIfConfirmed: boolean;
    notifyParties: string[];
  }): Promise<ServiceResponse<{
    inspectionId?: string;
    disputeId?: string;
    workflowId: string;
  }>> {
    return post<any>('/cross-portal/orchestrate/violation-cascade', data);
  },

  /**
   * Contract → Worker Passport → Employer OS sync
   * When a contract is signed, sync to worker passport and employer records
   */
  async orchestrateContractSigning(contractId: string): Promise<ServiceResponse<{
    workerPassportUpdated: boolean;
    employerRecordsUpdated: boolean;
    ministryRegistryUpdated: boolean;
    notificationsSent: number;
  }>> {
    return post<any>(`/cross-portal/orchestrate/contract-signed/${contractId}`, {});
  },

  /**
   * Inspection → Violation → Compliance cascade
   * When an inspection finds violations, generate violation records and trigger compliance review
   */
  async orchestrateInspectionOutcome(inspectionId: string): Promise<ServiceResponse<{
    violationsCreated: number;
    complianceReviewsTriggered: number;
    notificationsDispatched: number;
    employerNotified: boolean;
    unionNotified?: boolean;
  }>> {
    return post<any>(`/cross-portal/orchestrate/inspection-outcome/${inspectionId}`, {});
  },

  /**
   * Dispute → Contract → Employment record cascade
   * When a dispute is resolved, update employment records and contracts
   */
  async orchestrateDisputeResolution(disputeId: string): Promise<ServiceResponse<{
    contractsUpdated: number;
    workerPassportUpdated: boolean;
    employerRecordsUpdated: boolean;
    followUpActions: number;
  }>> {
    return post<any>(`/cross-portal/orchestrate/dispute-resolved/${disputeId}`, {});
  },

  // ==================== UNIFIED IDENTITY & ACCESS ====================

  /**
   * Get unified user identity (across portals)
   */
  async getUnifiedIdentity(userId: string): Promise<ServiceResponse<CrossPortalUser>> {
    return get<any>(`/cross-portal/identity/${userId}`);
  },

  /**
   * Check unified permissions
   */
  async checkUnifiedPermissions(userId: string, action: string, resource: string): Promise<ServiceResponse<{
    allowed: boolean;
    reasons: string[];
    requiredRoles: string[];
    matchedRoles: string[];
  }>> {
    return post<any>(`/cross-portal/identity/${userId}/check-permission`, { action, resource });
  },

  /**
   * Get effective permissions (role + jurisdiction + entity)
   */
  async getEffectivePermissions(userId: string, context?: {
    governorate?: string;
    directorate?: string;
    entityId?: string;
  }): Promise<ServiceResponse<{
    permissions: string[];
    jurisdictions: string[];
    entities: string[];
    scopes: Array<{ resource: string; actions: string[]; constraints?: any }>;
  }>> {
    return post<any>(`/cross-portal/identity/${userId}/effective-permissions`, context || {});
  },

  // ==================== NOTIFICATION HUB ====================

  /**
   * Send cross-portal notification
   */
  async sendNotification(data: {
    recipientUserId?: string;
    recipientRole?: string;
    recipientType?: 'ministry' | 'employer' | 'union' | 'worker';
    sourcePortal: CrossPortalNotification['sourcePortal'];
    type: CrossPortalNotification['type'];
    priority?: CrossPortalNotification['priority'];
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
    expiresAt?: string;
  }): Promise<ServiceResponse<{ notificationId: string }>> {
    return post<any>('/cross-portal/notifications/send', data);
  },

  /**
   * Broadcast notification to multiple recipients
   */
  async broadcastNotification(data: {
    recipients: Array<{ userId?: string; role?: string; type?: 'ministry' | 'employer' | 'union' | 'worker' }>;
    sourcePortal: CrossPortalNotification['sourcePortal'];
    type: CrossPortalNotification['type'];
    priority?: CrossPortalNotification['priority'];
    title: string;
    message: string;
    actionUrl?: string;
  }): Promise<ServiceResponse<{ sentCount: number; failedCount: number }>> {
    return post<any>('/cross-portal/notifications/broadcast', data);
  },

  /**
   * Get user's notifications
   */
  async getNotifications(filters?: {
    read?: boolean;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<ServiceResponse<{ notifications: CrossPortalNotification[]; unreadCount: number }>> {
    const params = new URLSearchParams();
    if (filters?.read !== undefined) params.set('read', String(filters.read));
    if (filters?.type) params.set('type', filters.type);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    return get<any>(`/cross-portal/notifications?${params.toString()}`);
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<ServiceResponse<void>> {
    return put<any>(`/cross-portal/notifications/${notificationId}/read`, {});
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<ServiceResponse<{ updatedCount: number }>> {
    return put<any>('/cross-portal/notifications/read-all', {});
  },

  // ==================== ANALYTICS & INSIGHTS ====================

  /**
   * Get cross-portal analytics
   */
  async getCrossPortalAnalytics(filters?: {
    dateFrom?: string;
    dateTo?: string;
    governorate?: string;
  }): Promise<ServiceResponse<{
    workflowsActive: number;
    workflowsCompleted: number;
    notificationsSent: number;
    entitiesSynced: number;
    byPortal: Record<string, { users: number; activities: number }>;
    topWorkflows: Array<{ type: string; count: number }>;
  }>> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.governorate) params.set('governorate', filters.governorate);
    return get<any>(`/cross-portal/analytics?${params.toString()}`);
  },

  /**
   * Get data lineage (which portal modified what)
   */
  async getDataLineage(entityType: string, entityId: string): Promise<ServiceResponse<{
    lineage: Array<{
      portal: string;
      action: string;
      timestamp: string;
      actor: string;
      changes: Record<string, { from: any; to: any }>;
    }>;
  }>> {
    return get<any>(`/cross-portal/lineage/${entityType}/${entityId}`);
  },

  // ==================== HELPER: HIGH-LEVEL ORCHESTRATIONS ====================

  /**
   * Comprehensive case: dispute + inspection + contract + worker
   * High-level orchestration that ties dispute, contract, inspection, and worker passport
   */
  async getComprehensiveCase(disputeId: string): Promise<ServiceResponse<{
    dispute: any;
    contract?: any;
    inspection?: any;
    workerPassport?: any;
    employer?: any;
    violations: any[];
    timeline: any[];
    notifications: any[];
    auditTrail: any[];
  }>> {
    return get<any>(`/cross-portal/cases/${disputeId}/comprehensive`);
  } };

export default crossPortalService;