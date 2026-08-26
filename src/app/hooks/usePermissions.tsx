/**
 * usePermissions — نظام صلاحيات RBAC
 * Role-Based Access Control لجميع عمليات المنصة
 * مفتاح الخريطة هو «الدور» (role) وليس نوع المستخدم.
 * موحد مع server/middleware/rbac.js عبر strings موحدة في src/app/roles.ts
 */

import { useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, ROLE_ALIASES } from '../roles';

// ============================================================
// تعريف الصلاحيات
// ============================================================

export type Permission =
  | 'dashboard:view'
  | 'entities:view' | 'entities:create' | 'entities:edit' | 'entities:delete' | 'entities:export'
  | 'members:view' | 'members:create' | 'members:edit' | 'members:delete' | 'members:export'
  | 'elections:view' | 'elections:create' | 'elections:edit' | 'elections:delete' | 'elections:approve' | 'elections:export'
  | 'activities:view' | 'activities:create' | 'activities:edit' | 'activities:delete' | 'activities:export'
  | 'documents:view' | 'documents:upload' | 'documents:approve' | 'documents:reject'
  | 'services:view' | 'services:request' | 'services:approve' | 'services:reject'
  | 'violations:view' | 'violations:create' | 'violations:edit' | 'violations:delete' | 'violations:resolve' | 'violations:export'
  | 'inspections:view' | 'inspections:create' | 'inspections:edit' | 'inspections:delete' | 'inspections:export'
  | 'compliance:view' | 'compliance:create' | 'compliance:edit' | 'compliance:delete'
  | 'risk:view' | 'risk:create' | 'risk:edit'
  | 'evaluation:view' | 'evaluation:create' | 'evaluation:edit' | 'evaluation:delete'
  | 'licenses:view' | 'licenses:create' | 'licenses:edit' | 'licenses:delete'
  | 'training:view' | 'training:create' | 'training:edit' | 'training:delete' | 'training:export'
  | 'dispatches:view' | 'dispatches:create' | 'dispatches:edit' | 'dispatches:delete' | 'dispatches:approve'
  | 'reduction:view' | 'reduction:create' | 'reduction:edit' | 'reduction:delete' | 'reduction:approve'
  | 'laborDisputes:view' | 'laborDisputes:create' | 'laborDisputes:edit' | 'laborDisputes:delete' | 'laborDisputes:resolve'
  | 'expatriate:view' | 'expatriate:create' | 'expatriate:edit' | 'expatriate:delete'
  | 'commercial:view' | 'commercial:create' | 'commercial:edit' | 'commercial:delete' | 'commercial:export'
  | 'professions:view' | 'professions:create' | 'professions:edit' | 'professions:delete'
  | 'workerProfiles:view' | 'workerProfiles:create' | 'workerProfiles:edit' | 'workerProfiles:delete'
  | 'board:view' | 'board:create' | 'board:edit' | 'board:delete'
  | 'occupations:view' | 'occupations:create' | 'occupations:edit' | 'occupations:delete'
  | 'fees:view' | 'fees:create' | 'fees:edit' | 'fees:delete'
  | 'notifications:view' | 'notifications:create' | 'notifications:edit' | 'notifications:delete'
  | 'legal:view' | 'legal:create' | 'legal:edit' | 'legal:delete'
  | 'reports:view' | 'reports:generate' | 'reports:export'
  | 'comparative:view'
  | 'audit:view'
  | 'users:view' | 'users:create' | 'users:edit' | 'users:delete'
  | 'profile:view'
  | 'admin:all';

// ============================================================
// بيانات الأدوار (التسمية، النوع، اللون، الوصف)
// ============================================================

export interface RoleMeta {
  label: string;
  userType: 'ministry' | 'organization';
  color: string;
  description: string;
}

export const ROLE_META: Record<string, RoleMeta> = {
  [ROLES.SUPER_ADMIN]: { label: 'مدير النظام والوزارة', userType: 'ministry', color: 'violet', description: 'صلاحيات كاملة على جميع شاشات وخدمات الوزارة' },
  [ROLES.MINISTRY_ADMIN]: { label: 'مدير الوزارة', userType: 'ministry', color: 'violet', description: 'صلاحيات كاملة على جميع شاشات وخدمات الوزارة' },
  [ROLES.DEPUTY_MINISTER]: { label: 'وكيل الوزارة', userType: 'ministry', color: 'indigo', description: 'صلاحيات شاملة على جميع الشاشات والتقارير والاعتمادات (دون إدارة المستخدمين)' },
  [ROLES.MINISTRY_STAFF]: { label: 'مستخدم وزارة', userType: 'ministry', color: 'sky', description: 'مستخدمو الوزارة والوحدات التنظيمية' },
  [ROLES.SUPERVISORY_DIRECTOR]: { label: 'مدير عام الرقابة والتفتيش', userType: 'ministry', color: 'rose', description: 'إشراف كامل على خطط التفتيش والمخالفات والامتثال' },
  [ROLES.LEGAL_COUNSEL]: { label: 'المستشار القانوني', userType: 'ministry', color: 'amber', description: 'التحكيم في المنازعات العمالية وتعزيز اللوائح والعقود' },
  [ROLES.LABOR_INSPECTOR]: { label: 'مفتش عمل وميدان', userType: 'ministry', color: 'amber', description: 'التفتيش الميداني والمخالفات والسلامة المهنية' },
  [ROLES.COMPLIANCE_OFFICER]: { label: 'مسؤول الامتثال', userType: 'ministry', color: 'emerald', description: 'الامتثال وتقييم المخاطر وتصاريح العمل' },
  [ROLES.REGISTRY_OFFICER]: { label: 'موظف السجل الوطني', userType: 'ministry', color: 'sky', description: 'سجل المنشآت والنقابات والمنظمات والأعضاء والمهن' },
  [ROLES.REPORTS_VIEWER]: { label: 'محلل البيانات والذكاء', userType: 'ministry', color: 'slate', description: 'عرض التقارير والمؤشرات والتحليلات فقط' },
  [ROLES.UNION_PRESIDENT]: { label: 'رئيس النقابة أو منظمة', userType: 'organization', color: 'violet', description: 'صلاحيات الإشراف على النقابة أو المنظمة العمالية' },
  [ROLES.EMPLOYER_ADMIN]: { label: 'صاحب عمل / منشأة', userType: 'organization', color: 'blue', description: 'إدارة المنشأة والعاملين والامتثال والخدمات الحكومية والرسوم' },
  [ROLES.HR_OFFICER]: { label: 'مسؤول موارد بشرية', userType: 'organization', color: 'sky', description: 'إدارة الأعضاء والملفات والأنشطة' },
  [ROLES.FINANCIAL_OFFICER]: { label: 'مسؤول مالي', userType: 'organization', color: 'emerald', description: 'إدارة الرسوم والخدمات المالية' },
  [ROLES.WORKER]: { label: 'عامل — الجواز المهني الرقمي', userType: 'organization', color: 'cyan', description: 'جواز العمل والعقود والأجور واللياقة والتدريب والشكاوى' },
};

export const ROLE_LIST = Object.keys(ROLE_META);

// ============================================================
// خريطة الصلاحيات لكل دور (مفتاح = role)
// ============================================================

const VIEW_ALL = [
  'dashboard:view', 'entities:view', 'members:view', 'elections:view', 'activities:view',
  'documents:view', 'services:view', 'violations:view', 'inspections:view', 'compliance:view',
  'risk:view', 'evaluation:view', 'licenses:view', 'training:view', 'dispatches:view',
  'reduction:view', 'laborDisputes:view', 'expatriate:view', 'commercial:view', 'professions:view',
  'workerProfiles:view', 'board:view', 'occupations:view', 'fees:view', 'notifications:view',
  'legal:view', 'reports:view', 'comparative:view', 'audit:view', 'profile:view',
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: ['admin:all'],

  [ROLES.MINISTRY_ADMIN]: ['admin:all'],

  // وكيل الوزارة — شامل تشغيلياً على كل المجالات والاعتمادات والتقارير
  // (يُستثنى منه إدارة المستخدمين admin:all / users:* المحفوظة لمدير النظام)

  [ROLES.MINISTRY_STAFF]: [
    ...VIEW_ALL,
    'members:create', 'members:edit', 'members:export',
    'activities:create', 'activities:edit', 'activities:export',
    'documents:upload',
    'services:request',
    'workerProfiles:create', 'workerProfiles:edit',
    'reports:export',
  ],

  [ROLES.DEPUTY_MINISTER]: [
    ...VIEW_ALL,
    'entities:create', 'entities:edit', 'entities:export',
    'members:create', 'members:edit', 'members:export',
    'elections:create', 'elections:edit', 'elections:approve', 'elections:export',
    'activities:create', 'activities:edit', 'activities:export',
    'documents:upload', 'documents:approve', 'documents:reject',
    'services:approve', 'services:reject',
    'violations:create', 'violations:edit', 'violations:resolve', 'violations:export',
    'inspections:create', 'inspections:edit', 'inspections:export',
    'compliance:create', 'compliance:edit',
    'risk:create', 'risk:edit',
    'evaluation:create', 'evaluation:edit',
    'licenses:create', 'licenses:edit',
    'training:create', 'training:edit', 'training:export',
    'dispatches:create', 'dispatches:edit', 'dispatches:approve',
    'reduction:create', 'reduction:edit', 'reduction:approve',
    'laborDisputes:create', 'laborDisputes:edit', 'laborDisputes:resolve',
    'expatriate:create', 'expatriate:edit',
    'commercial:create', 'commercial:edit', 'commercial:export',
    'professions:create', 'professions:edit',
    'workerProfiles:create', 'workerProfiles:edit',
    'board:create', 'board:edit',
    'occupations:create', 'occupations:edit',
    'fees:create', 'fees:edit',
    'notifications:create', 'notifications:edit',
    'legal:create', 'legal:edit',
    'reports:generate', 'reports:export',
  ],

  [ROLES.SUPERVISORY_DIRECTOR]: [
    ...VIEW_ALL,
    'inspections:view', 'inspections:create', 'inspections:edit', 'inspections:delete', 'inspections:export',
    'violations:view', 'violations:create', 'violations:edit', 'violations:delete', 'violations:resolve', 'violations:export',
    'laborDisputes:view', 'laborDisputes:resolve',
    'compliance:view', 'compliance:create', 'compliance:edit', 'compliance:delete',
    'risk:view', 'risk:create', 'risk:edit',
    'evaluation:view', 'evaluation:create', 'evaluation:edit', 'evaluation:delete',
    'reports:generate', 'reports:export',
  ],

  [ROLES.LEGAL_COUNSEL]: [
    ...VIEW_ALL,
    'laborDisputes:view', 'laborDisputes:create', 'laborDisputes:edit', 'laborDisputes:delete', 'laborDisputes:resolve',
    'documents:view', 'documents:approve', 'documents:reject',
    'reduction:view', 'reduction:approve',
    'legal:view', 'legal:create', 'legal:edit', 'legal:delete',
    'violations:view', 'violations:resolve',
    'reports:export',
  ],

  [ROLES.LABOR_INSPECTOR]: [
    ...VIEW_ALL,
    'inspections:view', 'inspections:create', 'inspections:edit', 'inspections:delete', 'inspections:export',
    'violations:view', 'violations:create', 'violations:edit', 'violations:delete', 'violations:resolve', 'violations:export',
    'laborDisputes:view', 'laborDisputes:create', 'laborDisputes:edit', 'laborDisputes:delete', 'laborDisputes:resolve',
    'expatriate:view', 'expatriate:create', 'expatriate:edit', 'expatriate:delete',
    'compliance:view', 'risk:view', 'evaluation:view', 'evaluation:create', 'evaluation:edit', 'evaluation:delete',
    'reports:export',
  ],

  [ROLES.COMPLIANCE_OFFICER]: [
    ...VIEW_ALL,
    'compliance:view', 'compliance:create', 'compliance:edit', 'compliance:delete',
    'risk:view', 'risk:create', 'risk:edit',
    'evaluation:view', 'evaluation:create', 'evaluation:edit', 'evaluation:delete',
    'violations:view', 'violations:resolve',
    'reports:generate', 'reports:export',
  ],

  [ROLES.REGISTRY_OFFICER]: [
    ...VIEW_ALL,
    'entities:view', 'entities:create', 'entities:edit', 'entities:delete', 'entities:export',
    'members:view', 'members:create', 'members:edit', 'members:delete', 'members:export',
    'board:view', 'board:create', 'board:edit', 'board:delete',
    'elections:view', 'elections:create', 'elections:edit', 'elections:delete', 'elections:approve', 'elections:export',
    'activities:view', 'activities:create', 'activities:edit', 'activities:delete', 'activities:export',
    'documents:view', 'documents:upload', 'documents:approve', 'documents:reject',
    'services:view', 'services:request', 'services:approve', 'services:reject',
    'commercial:view', 'commercial:create', 'commercial:edit', 'commercial:delete', 'commercial:export',
    'professions:view', 'professions:create', 'professions:edit', 'professions:delete',
    'occupations:view', 'occupations:create', 'occupations:edit', 'occupations:delete',
    'workerProfiles:view', 'workerProfiles:create', 'workerProfiles:edit', 'workerProfiles:delete',
    'reports:export',
  ],

  [ROLES.REPORTS_VIEWER]: [
    ...VIEW_ALL,
    'reports:view', 'reports:generate', 'reports:export', 'comparative:view', 'audit:view',
  ],

  [ROLES.UNION_PRESIDENT]: [
    ...VIEW_ALL,
    'members:view', 'members:create', 'members:edit', 'members:delete', 'members:export',
    'elections:view', 'elections:create', 'elections:edit', 'elections:delete', 'elections:approve', 'elections:export',
    'activities:view', 'activities:create', 'activities:edit', 'activities:delete', 'activities:export',
    'documents:view', 'documents:upload',
    'services:view', 'services:request',
    'board:view', 'board:create', 'board:edit', 'board:delete',
    'workerProfiles:view', 'workerProfiles:create', 'workerProfiles:edit', 'workerProfiles:delete',
    'training:view', 'training:create', 'training:edit', 'training:delete', 'training:export',
    'dispatches:view', 'dispatches:create', 'dispatches:edit', 'dispatches:delete',
    'reduction:view', 'reduction:create', 'reduction:edit', 'reduction:delete', 'reduction:approve',
    'reports:export', 'profile:view',
  ],

  [ROLES.EMPLOYER_ADMIN]: [
    ...VIEW_ALL,
    'members:view', 'members:create', 'members:edit', 'members:export',
    'workerProfiles:view', 'workerProfiles:create', 'workerProfiles:edit', 'workerProfiles:delete',
    'documents:view', 'documents:upload',
    'services:view', 'services:request',
    'fees:view', 'fees:create', 'fees:edit',
    'dispatches:view', 'dispatches:create', 'dispatches:edit',
    'reduction:view', 'reduction:create', 'reduction:edit',
    'violations:view', 'inspections:view', 'compliance:view', 'risk:view',
    'training:view', 'training:create',
    'reports:export', 'profile:view',
  ],

  [ROLES.WORKER]: [
    'dashboard:view', 'profile:view',
    'workerProfiles:view',
    'services:view', 'services:request',
    'laborDisputes:view', 'laborDisputes:create',
    'training:view', 'documents:view', 'notifications:view',
    'evaluation:view', 'licenses:view',
  ],

  [ROLES.HR_OFFICER]: [
    ...VIEW_ALL,
    'members:view', 'members:create', 'members:edit', 'members:delete', 'members:export',
    'workerProfiles:view', 'workerProfiles:create', 'workerProfiles:edit', 'workerProfiles:delete',
    'training:view', 'training:create', 'training:edit', 'training:delete',
    'board:view', 'elections:view', 'activities:view', 'activities:create', 'activities:edit', 'activities:delete',
    'documents:view', 'documents:upload', 'services:view', 'services:request',
    'reports:export', 'profile:view',
  ],

  [ROLES.FINANCIAL_OFFICER]: [
    ...VIEW_ALL,
    'fees:view', 'fees:create', 'fees:edit', 'fees:delete',
    'services:view', 'services:request', 'services:approve', 'services:reject',
    'reduction:view', 'reduction:create', 'reduction:edit', 'reduction:delete', 'reduction:approve',
    'dispatches:view', 'dispatches:create', 'dispatches:edit', 'dispatches:delete',
    'commercial:view', 'commercial:create', 'commercial:edit', 'commercial:delete',
    'reports:export', 'profile:view',
  ],
};

// ============================================================
// توحيد مفاتيح الصلاحيات (نقطة/نقطتان) + مرادفات الواجهة
// تضمن أن أي صياغة للمفتاح في القوائم ('commercial.view')
// تطابق مفتاح النظام ('commercial:view')
// ============================================================

const PERMISSION_ALIASES: Record<string, string> = {
  'view.dashboard': 'dashboard:view',
  'system.audit.view': 'audit:view',
  'system.users.manage': 'users:view',
  'licenses.expat.view': 'expatriate:view',
  'workers.dispatch.view': 'dispatches:view',
  'workers.reduction.view': 'reduction:view',
  'unions.view': 'entities:view',
  'disputes.view': 'laborDisputes:view',
  'inspections.cert.view': 'evaluation:view',
};

export function normalizePermission(key: string): string {
  return key.trim().replace(/\./g, ':');
}

export function resolvePermissionKey(key: string): string {
  return normalizePermission(PERMISSION_ALIASES[key] ?? key);
}

/** فحص صلاحية نقدي قابل للاختبار — يُستخدم من قبل الـ Hook واختبارات الوحدة */
export function hasPermission(userPermissions: readonly string[], permission: string): boolean {
  if (userPermissions.includes('admin:all')) return true;
  const target = resolvePermissionKey(permission);
  return userPermissions.some(p => normalizePermission(p) === target);
}

// ============================================================
// Hook
// ============================================================

export function usePermissions() {
  const { user } = useAuth();

  const userRole = user?.role;
  const userPermissions: string[] = useMemo(() => {
    if (!userRole)
      return [];
    return ROLE_PERMISSIONS[userRole] || (() => {
      // fallback: try to find by alias
      const aliasKey = Object.keys(ROLE_ALIASES).find(k => ROLE_ALIASES[k] === userRole);
      const permissions = aliasKey ? ROLE_PERMISSIONS[aliasKey] : undefined;
      return permissions || ROLE_PERMISSIONS[ROLES.REPORTS_VIEWER];
    })();
  }, [userRole]);

  const can = useCallback((permission: string): boolean => {
    if (!user) return false;
    return hasPermission(userPermissions, permission);
  }, [user, userPermissions]);

  const canAny = useCallback((...permissions: string[]): boolean => {
    return permissions.some(p => can(p));
  }, [can]);

  const canAll = useCallback((...permissions: string[]): boolean => {
    return permissions.every(p => can(p));
  }, [can]);

  const roleMeta = user ? ROLE_META[user.role] : undefined;
  const meta = useCallback((role?: string): RoleMeta | undefined => {
    return role ? ROLE_META[role] : roleMeta;
  }, [roleMeta]);

  return {
    can,
    canAny,
    canAll,
    meta,
    userPermissions,
    role: user?.role,
    roleLabel: roleMeta?.label,
    roleColor: roleMeta?.color,
    isMinistry: user?.userType === 'ministry',
    isOrganization: user?.userType === 'organization',
    userType: user?.userType,
  };
}

// ============================================================
// مكوّن حارث الصلاحية
// ============================================================

interface PermissionGateProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
