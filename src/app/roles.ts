// Unified role definitions —shared between client and server
// Any change here must be reflected in both server/middleware/rbac.js and src/app/hooks/usePermissions.ts

export const ROLE_ALIASES: Record<string, string> = {
  // Arabic/English normalization map for permission strings
  'dashboard:view': 'view.dashboard',
  'compliance.view': 'compliance.view',
  'compliance-view': 'compliance.view',
  'system.audit.view': 'system.audit.view',
  'system-audit-view': 'system.audit.view',
  'members.view': 'members.view',
  'members-view': 'members.view',
  'licenses.view': 'licenses.view',
  'licenses-view': 'licenses.view',
  'occupations.view': 'occupations.view',
  'occupations-view': 'occupations.view',
  'inspections.view': 'inspections.view',
  'inspections-view': 'inspections.view',
  'violations.view': 'violations.view',
  'violations-view': 'violations.view',
  'fees.view': 'fees.view',
  'fees-view': 'fees.view',
  'reports.view': 'reports.view',
  'reports-view': 'reports.view',
  'service.request': 'services.request',
  'service-request': 'services.request',
  'workers.dispatch.view': 'workers.dispatch.view',
  'workers-dispatch-view': 'workers.dispatch-view',
};

export const ROLES = {
  SUPER_ADMIN: 'super_admin' as const,
  MINISTRY_ADMIN: 'ministry_admin' as const,
  DEPUTY_MINISTER: 'deputy_minister' as const,
  MINISTRY_STAFF: 'ministry_staff' as const,
  SUPERVISORY_DIRECTOR: 'supervisory_director' as const,
  LEGAL_COUNSEL: 'legal_counsel' as const,
  LABOR_INSPECTOR: 'labor_inspector' as const,
  COMPLIANCE_OFFICER: 'compliance_officer' as const,
  REGISTRY_OFFICER: 'registry_officer' as const,
  REPORTS_VIEWER: 'reports_viewer' as const,
  UNION_PRESIDENT: 'union_president' as const,
  EMPLOYER_ADMIN: 'employer_admin' as const,
  HR_OFFICER: 'hr_officer' as const,
  FINANCIAL_OFFICER: 'financial_officer' as const,
  WORKER: 'worker' as const,
} as const;

export type ROLE_KEY = 'SUPER_ADMIN' | 'MINISTRY_ADMIN' | 'DEPUTY_MINISTER' | 'MINISTRY_STAFF' | 'SUPERVISORY_DIRECTOR' | 'LEGAL_COUNSEL' | 'LABOR_INSPECTOR' | 'COMPLIANCE_OFFICER' | 'REGISTRY_OFFICER' | 'REPORTS_VIEWER' | 'UNION_PRESIDENT' | 'EMPLOYER_ADMIN' | 'HR_OFFICER' | 'FINANCIAL_OFFICER' | 'WORKER';

export const ROLE_DISPLAY: Record<ROLE_KEY, string> = {
  SUPER_ADMIN: 'مدير النظام والوزارة',
  MINISTRY_ADMIN: 'مدير الوزارة',
  DEPUTY_MINISTER: 'وكيل الوزارة',
  MINISTRY_STAFF: 'مستخدم وزارة',
  SUPERVISORY_DIRECTOR: 'مدير عام الرقابة والتفتيش',
  LEGAL_COUNSEL: 'المستشار القانوني',
  LABOR_INSPECTOR: 'مفتش عمل وميدان',
  COMPLIANCE_OFFICER: 'مسؤول الامتثال',
  REGISTRY_OFFICER: 'موظف السجل الوطني',
  REPORTS_VIEWER: 'محلل البيانات والذكاء',
  UNION_PRESIDENT: 'رئيس النقابة أو منظمة',
  EMPLOYER_ADMIN: 'صاحب عمل / منشأة',
  HR_OFFICER: 'مسؤول موارد بشرية',
  FINANCIAL_OFFICER: 'مسؤول مالي',
  WORKER: 'عامل — الجواز المهني الرقمي',
};

export const ROLE_USER_TYPE: Record<ROLE_KEY, 'ministry' | 'organization'> = {
  SUPER_ADMIN: 'ministry',
  MINISTRY_ADMIN: 'ministry',
  DEPUTY_MINISTER: 'ministry',
  MINISTRY_STAFF: 'ministry',
  SUPERVISORY_DIRECTOR: 'ministry',
  LEGAL_COUNSEL: 'ministry',
  LABOR_INSPECTOR: 'ministry',
  COMPLIANCE_OFFICER: 'ministry',
  REGISTRY_OFFICER: 'ministry',
  REPORTS_VIEWER: 'ministry',
  UNION_PRESIDENT: 'organization',
  EMPLOYER_ADMIN: 'organization',
  HR_OFFICER: 'organization',
  FINANCIAL_OFFICER: 'organization',
  WORKER: 'organization',
};