/**
 * Entity Service â€” Service layer for organizational entity business logic
 * Frontend service layer coordinating API calls and data transformation.
 * 
 * Responsibilities:
 * - Entity data transformation and formatting
 * - Workflow transition validation (client-side checks)
 * - Entity overview preparation for UI display
 * - Consistent state management patterns
 * 
 * Note: This layer assumes API calls go through the backend server.
 * Database queries are handled by the Express server routes.
 */

import { pool } from '../middleware/shared.js';

// Types for entity service responses
export interface EntityOverview {
  entity: any;
  stats: {
    members: any;
    violations: any;
    inspections: any;
    occupations: any;
    relationships: any;
    activities: any;
    documents: any;
    licenses: any;
    dispatches: any;
    riskAssessments: any;
    complianceAlerts: any;
  };
}

export interface EntityListItem {
  entity_id: string;
  name_ar: string;
  name_en: string;
  entity_type: string;
  classification: string;
  sector: string;
  governorate: string;
  city: string;
  status: string;
  compliance_status: string;
  risk_level: string;
  member_count: number;
  branch_count: number;
  created_at: Date;
}

// Transform raw API response to structured entity list
export function transformEntityList(raw: any): EntityListItem[] {
  if (!raw || !raw.data) return [];
  return raw.data.map((row: any) => ({
    entity_id: row.entity_id,
    name_ar: row.name_ar,
    name_en: row.name_en,
    entity_type: row.entity_type,
    classification: row.classification,
    sector: row.sector,
    governorate: row.governorate,
    city: row.city,
    status: row.status,
    compliance_status: row.compliance_status,
    risk_level: row.risk_level,
    member_count: row.member_count || 0,
    branch_count: row.branch_count || 0,
    created_at: new Date(row.created_at),
  }));
}

// Transform raw entity detail with stats to structured overview
export function transformEntityOverview(raw: any): EntityOverview {
  if (!raw || !raw.entity) {
    return {
      entity: {},
      stats: {
        members: {}, violations: {}, inspections: {}, occupations: {},
        relationships: {}, activities: {}, documents: {}, licenses: {},
        dispatches: {}, riskAssessments: {}, complianceAlerts: {},
      },
    };
  }

  const entity = raw.entity;
  const stats = raw.stats || {
    members: {}, violations: {}, inspections: {}, occupations: {},
    relationships: {}, activities: {}, documents: {}, licenses: {},
    dispatches: {}, riskAssessments: {}, complianceAlerts: {},
  };

  return {
    entity,
    stats: {
      members: stats.members ? { ...stats.members } : {},
      violations: stats.violations ? { ...stats.violations } : {},
      inspections: stats.inspections ? { ...stats.inspections } : {},
      occupations: stats.occupations ? { ...stats.occupations } : {},
      relationships: stats.relationships ? { ...stats.relationships } : {},
      activities: stats.activities ? { ...stats.activities } : {},
      documents: stats.documents ? { ...stats.documents } : {},
      licenses: stats.licenses ? { ...stats.licenses } : {},
      dispatches: stats.dispatches ? { ...stats.dispatches } : {},
      riskAssessments: stats.riskAssessments ? { ...stats.riskAssessments } : {},
      complianceAlerts: stats.complianceAlerts ? { ...stats.complianceAlerts } : {},
    },
  };
}

// Validate workflow transition (client-side validation complement to server-side)
export function validateWorkflowTransition(
  currentStatus: string,
  targetStatus: string
): { allowed: boolean; error?: string } {
  const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
    draft: ['submitted'],
    submitted: ['under_review'],
    under_review: ['approved', 'rejected'],
    approved: [],
    rejected: ['draft'],
  };

  const allowed = WORKFLOW_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      allowed: false,
      error: `Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ­ÙˆÙŠÙ„ Ù…Ù† "${currentStatus}" Ø¥Ù„Ù‰ "${targetStatus}". Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ù…Ø³Ù…ÙˆØ­Ø©: ${allowed.join(', ') || 'Ù„Ø§ ØªÙˆØ¬Ø¯'}`,
    };
  }
  return { allowed: true };
}

// Format entity status for display (Arabic labels)
export function formatEntityStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Ù…Ø³ÙˆØ¯Ø©',
    submitted: 'Ù…ØªÙ‚Ø¯Ù…Ø©',
    under_review: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©',
    approved: 'Ù…Approved',
    rejected: 'Ù…Ø±ÙÙˆØ¶Ø©',
  };
  return statusMap[status] || status;
}

// Format compliance status for display
export function formatComplianceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    compliant: 'Ù…ØªÙˆØ§ÙÙ‚Ø©',
    non_compliant: 'ØºÙŠØ± Ù…ØªÙˆØ§ÙÙ‚Ø©',
    pending: 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©',
  };
  return statusMap[status] || status;
}

// Calculate member growth percentage
export function calculateGrowthPercentage(
  current: number,
  previous: number
): { percentage: number; trend: 'up' | 'down' | 'stable' } {
  if (previous === 0) {
    return { percentage: 100, trend: 'up' };
  }
  const diff = ((current - previous) / previous) * 100;
  if (diff > 0) return { percentage: Math.round(diff), trend: 'up' };
  if (diff < 0) return { percentage: Math.round(-diff), trend: 'down' };
  return { percentage: 0, trend: 'stable' };
}
