/**
 * Smart Dashboard Service — Unified Intelligence Layer
 * Aggregates data from all portals: Ministry, Organization, Employer, Worker, Union
 * Provides AI-powered insights, predictions, and recommendations
 */

import api from './api';

// ============================================================================
// Types
// ============================================================================

export interface DashboardSummary {
  totalEntities: number;
  activeEntities: number;
  pendingRequests: number;
  openViolations: number;
  activeAlerts: number;
  recentActivity: ActivityItem[];
  systemHealth: SystemHealth;
  aiInsights: AIInsight[];
  quickActions: QuickAction[];
  charts: DashboardCharts;
}

export interface ActivityItem {
  id: string;
  type: 'contract' | 'violation' | 'inspection' | 'complaint' | 'registration' | 'renewal';
  title: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity_type?: string;
  entity_id?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  responseTime: number;
  dbConnections: number;
  cacheHitRate: number;
  errorRate: number;
  lastCheck: string;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-100
  action?: string;
  action_url?: string;
  impact: 'low' | 'medium' | 'high';
  category: 'compliance' | 'efficiency' | 'risk' | 'opportunity';
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  badge?: number;
  priority: 'high' | 'medium' | 'low';
  permission?: string;
}

export interface DashboardCharts {
  entitiesByStatus: ChartData;
  violationsByType: ChartData;
  monthlyTrend: ChartData;
  complianceRate: GaugeData;
  workforceDistribution: ChartData;
  contractTypes: ChartData;
}

export interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

export interface GaugeData {
  value: number;
  min: number;
  max: number;
  label: string;
}

// ============================================================================
// AI Insight Generation
// ============================================================================

function generateAIInsights(data: any): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Check for compliance anomalies
  if (data.openViolations > 10) {
    insights.push({
      id: 'ins-001',
      type: 'warning',
      title: 'ارتفاع ملحوظ في المخالفات المفتوحة',
      description: `يوجد ${data.openViolations} مخالفة مفتوحة — يُنصح بمراجعة المخالفات المتأخرة فوراً.`,
      confidence: 92,
      action: 'مراجعة المخالفات',
      action_url: '/ministry/violations',
      impact: 'high',
      category: 'compliance',
    });
  }

  // Check for contract renewals
  if (data.expiringContracts > 5) {
    insights.push({
      id: 'ins-002',
      type: 'opportunity',
      title: 'عقود قاربت على الانتهاء',
      description: `${data.expiringContracts} عقد يحتاجون تجديد — فرصة للتواصل الاستباقي.`,
      confidence: 88,
      action: 'عرض العقود',
      action_url: '/ministry/contracts',
      impact: 'medium',
      category: 'efficiency',
    });
  }

  // Check for inspection coverage
  if (data.inspectionCoverage < 70) {
    insights.push({
      id: 'ins-003',
      type: 'anomaly',
      title: 'تغطية تفتيشية منخفضة',
      description: `تغطية التفتيش ${data.inspectionCoverage}% فقط — أقل من الهدف 85%.`,
      confidence: 95,
      action: 'جدولة تفتيشات',
      action_url: '/ministry/inspections/schedule',
      impact: 'high',
      category: 'risk',
    });
  }

  // Check for worker trends
  if (data.newWorkersThisMonth > 100) {
    insights.push({
      id: 'ins-004',
      type: 'trend',
      title: 'نمو في سوق العمل',
      description: `تم تسجيل ${data.newWorkersThisMonth} عامل جديد هذا الشهر — نمو إيجابي.`,
      confidence: 90,
      impact: 'low',
      category: 'opportunity',
    });
  }

  // General recommendation
  insights.push({
    id: 'ins-005',
    type: 'recommendation',
    title: 'تحسين كفاءة العمليات',
    description: 'يُنصح بتحديث الأدلة الوطنية بانتظام لضمان دقة البيانات.',
    confidence: 75,
    action: 'إدارة الأدلة',
    action_url: '/ministry/national-directories',
    impact: 'medium',
    category: 'efficiency',
  });

  return insights;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getMinistryDashboard(): Promise<DashboardSummary | null> {
  try {
    const response = await api.get('/dashboard/smart') as any;
    return response?.data as DashboardSummary | null;
  } catch (error) {
    console.error('Failed to fetch ministry dashboard:', error);
    return null;
  }
}

export interface IntelligenceDashboard {
  generated_at: string;
  took_ms?: number;
  optimized?: boolean;
  professions: { total: number; detailed: number; hazardous: number };
  inspections: { total: number; compliant: number; non_compliant: number; avg_score: number | null };
  evaluations: { total: number; passing: number; avg_score: number | null };
  entities: { total: number; active: number };
  violations: { open: number };
  alerts: { unresolved: number };
  service_requests: { pending: number };
}

// Optimized intelligence dashboard — backed by fn_intelligence_dashboard_fast() (single query)
export async function getIntelligenceDashboard(): Promise<IntelligenceDashboard | null> {
  try {
    const response = await api.get('/v2/intelligence/dashboard') as any;
    return response?.data as IntelligenceDashboard | null;
  } catch (error) {
    console.error('Failed to fetch intelligence dashboard:', error);
    return null;
  }
}

export async function getOrganizationDashboard(orgId: string): Promise<DashboardSummary | null> {
  try {
    const response = await api.get(`/dashboard/organization/${orgId}`) as any;
    return response?.data as DashboardSummary | null;
  } catch (error) {
    console.error('Failed to fetch organization dashboard:', error);
    return null;
  }
}

export async function getEmployerDashboard(): Promise<DashboardSummary | null> {
  try {
    const response = await api.get('/dashboard/employer') as any;
    return response?.data as DashboardSummary | null;
  } catch (error) {
    console.error('Failed to fetch employer dashboard:', error);
    return null;
  }
}

export async function getWorkerDashboard(personId: string): Promise<DashboardSummary | null> {
  try {
    const response = await api.get(`/worker-portal/${personId}/dashboard`) as any;
    return response?.data as DashboardSummary | null;
  } catch (error) {
    console.error('Failed to fetch worker dashboard:', error);
    return null;
  }
}

export async function getSystemHealth(): Promise<SystemHealth | null> {
  try {
    const response = await api.get('/health/detailed') as any;
    return response?.data as SystemHealth | null;
  } catch (error) {
    console.error('Failed to fetch system health:', error);
    return null;
  }
}

// ============================================================================
// Smart Notifications
// ============================================================================

export interface SmartNotification {
  id: string;
  type: 'expiry' | 'renewal' | 'deadline' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export async function getSmartNotifications(): Promise<SmartNotification[]> {
  try {
    const response = await api.get('/notifications/smart') as any;
    return response?.data?.notifications || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    await api.put(`/notifications/${id}/read`, {});
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Quick Actions Generator
// ============================================================================

export function getQuickActionsForRole(role: string): QuickAction[] {
  const base: QuickAction[] = [
    {
      id: 'qa-profile',
      title: 'الملف الشخصي',
      description: 'عرض وتعديل بياناتك',
      icon: 'User',
      url: '/profile',
      priority: 'medium',
    },
    {
      id: 'qa-notifications',
      title: 'الإشعارات',
      description: 'عرض الإشعارات والتنبيهات',
      icon: 'Bell',
      url: '/notifications',
      priority: 'high',
    },
  ];

  const roleSpecific: Record<string, QuickAction[]> = {
    ministry_admin: [
      {
        id: 'qa-new-entity',
        title: 'تسجيل كيان جديد',
        description: 'إضافة منشأة أو نقابة جديدة',
        icon: 'Building2',
        url: '/ministry/register',
        priority: 'high',
      },
      {
        id: 'qa-pending-reviews',
        title: 'مراجعة معلقة',
        description: 'طلبات بانتظار المراجعة',
        icon: 'ClipboardCheck',
        url: '/ministry/reviews',
        badge: 0,
        priority: 'high',
      },
      {
        id: 'qa-alerts',
        title: 'إدارة التنبيهات',
        description: 'عرض وتنبيه المخالفات',
        icon: 'AlertTriangle',
        url: '/ministry/alerts',
        priority: 'medium',
      },
      {
        id: 'qa-directories',
        title: 'الأدلة الوطنية',
        description: 'إدارة الأدلة والمصنفات',
        icon: 'BookOpen',
        url: '/ministry/national-directories',
        priority: 'medium',
      },
    ],
    organization: [
      {
        id: 'qa-workers',
        title: 'إدارة العمال',
        description: 'عرض وتعديل بيانات العمال',
        icon: 'Users',
        url: '/organization/workers',
        priority: 'high',
      },
      {
        id: 'qa-contracts',
        title: 'العقود',
        description: 'إدارة عقود العمل',
        icon: 'FileText',
        url: '/organization/contracts',
        priority: 'high',
      },
      {
        id: 'qa-compliance',
        title: 'الامتثال',
        description: 'تقارير الامتثال',
        icon: 'Shield',
        url: '/organization/compliance',
        priority: 'medium',
      },
    ],
    employer: [
      {
        id: 'qa-permits',
        title: 'تصاريح العمل',
        description: 'إدارة تصاريح العمل',
        icon: 'IdCard',
        url: '/employer/permits',
        priority: 'high',
      },
      {
        id: 'qa-worker-reg',
        title: 'تسجيل عامل',
        description: 'إضافة عامل جديد',
        icon: 'UserPlus',
        url: '/employer/workers/new',
        priority: 'high',
      },
    ],
    worker: [
      {
        id: 'qa-passport',
        title: 'جواز العمل',
        description: 'عرض جواز العمل الرقمي',
        icon: 'CreditCard',
        url: '/worker-passport',
        priority: 'high',
      },
      {
        id: 'qa-services',
        title: 'الخدمات',
        description: 'طلب خدمة جديدة',
        icon: 'FilePlus',
        url: '/worker/services',
        priority: 'medium',
      },
      {
        id: 'qa-complaints',
        title: 'الشكاوى',
        description: 'تقديم شكوى',
        icon: 'MessageSquare',
        url: '/worker/complaints',
        priority: 'medium',
      },
    ],
  };

  return [...base, ...(roleSpecific[role] || [])];
}

// ============================================================================
// Chart Data Helpers
// ============================================================================

export function formatChartData(rawData: any): DashboardCharts {
  return {
    entitiesByStatus: {
      labels: rawData.statusLabels || ['نشط', 'معلق', 'موقف'],
      values: rawData.statusValues || [0, 0, 0],
      colors: ['#22c55e', '#eab308', '#ef4444'],
    },
    violationsByType: {
      labels: rawData.violationLabels || [],
      values: rawData.violationValues || [],
      colors: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6'],
    },
    monthlyTrend: {
      labels: rawData.monthLabels || [],
      values: rawData.monthValues || [],
    },
    complianceRate: {
      value: rawData.complianceRate || 0,
      min: 0,
      max: 100,
      label: 'معدل الامتثال',
    },
    workforceDistribution: {
      labels: rawData.distributionLabels || [],
      values: rawData.distributionValues || [],
    },
    contractTypes: {
      labels: rawData.contractTypeLabels || [],
      values: rawData.contractTypeValues || [],
    },
  };
}

// ============================================================================
// Time Intelligence
// ============================================================================

export function getTimeRangeLabel(range: 'today' | 'week' | 'month' | 'quarter' | 'year'): string {
  const labels = {
    today: 'اليوم',
    week: 'الأسبوع الحالي',
    month: 'الشهر الحالي',
    quarter: 'الربع الحالي',
    year: 'السنة الحالية',
  };
  return labels[range] || 'غير محدد';
}

export function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return date.toLocaleDateString('ar-YE');
}
