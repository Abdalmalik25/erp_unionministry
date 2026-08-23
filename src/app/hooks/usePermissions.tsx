/**
 * usePermissions — نظام صلاحيات RBAC
 * Role-Based Access Control لجميع عمليات المنصة
 * مفتاح الخريطة هو «الدور» (role) وليس نوع المستخدم.
 */

import { useCallback, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  ministry_admin: { label: 'مدير النظام والوزارة', userType: 'ministry', color: 'violet', description: 'صلاحيات كاملة على جميع شاشات وخدمات الوزارة' },
  supervisory_director: { label: 'مدير عام الرقابة والتفتيش', userType: 'ministry', color: 'rose', description: 'إشراف كامل على خطط التفتيش والمخالفات والامتثال' },
  legal_counsel: { label: 'المستشار القانوني', userType: 'ministry', color: 'amber', description: 'التحكيم في المنازعات العمالية وتعزيز اللوائح والعقود' },
  labor_inspector: { label: 'مفتش عمل وميدان', userType: 'ministry', color: 'amber', description: 'التفتيش الميداني والمخالفات والسلامة المهنية' },
  compliance_officer: { label: 'مسؤول الامتثال', userType: 'ministry', color: 'emerald', description: 'الامتثال وتقييم المخاطر وتصاريح العمل' },
  registry_officer: { label: 'موظف السجل الوطني', userType: 'ministry', color: 'sky', description: 'سجل المنشآت والنقابات والمنظمات والأعضاء والمهن' },
  reports_viewer: { label: 'محلل البيانات والذكاء', userType: 'ministry', color: 'slate', description: 'عرض التقارير والمؤشرات والتحليلات فقط' },
  union_president: { label: 'رئيس النقابة أو منظمة / المنشأة', userType: 'organization', color: 'violet', description: 'صلاحيات الإشراف على النقابة أو منظمة أو المنشأة' },
  hr_officer: { label: 'مسؤول موارد بشرية', userType: 'organization', color: 'sky', description: 'إدارة الأعضاء والملفات والأنشطة' },
  financial_officer: { label: 'مسؤول مالي', userType: 'organization', color: 'emerald', description: 'إدارة الرسوم والخدمات المالية' },
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
  ministry_admin: ['admin:all'],

  supervisory_director: [
    ...VIEW_ALL,
    'inspections:view', 'inspections:create', 'inspections:edit', 'inspections:delete', 'inspections:export',
    'violations:view', 'violations:create', 'violations:edit', 'violations:delete', 'violations:resolve', 'violations:export',
    'laborDisputes:view', 'laborDisputes:resolve',
    'compliance:view', 'compliance:create', 'compliance:edit', 'compliance:delete',
    'risk:view', 'risk:create', 'risk:edit',
    'evaluation:view', 'evaluation:create', 'evaluation:edit', 'evaluation:delete',
    'reports:generate', 'reports:export',
  ],

  legal_counsel: [
    ...VIEW_ALL,
    'laborDisputes:view', 'laborDisputes:create', 'laborDisputes:edit', 'laborDisputes:delete', 'laborDisputes:resolve',
    'documents:view', 'documents:approve', 'documents:reject',
    'reduction:view', 'reduction:approve',
    'legal:view', 'legal:create', 'legal:edit', 'legal:delete',
    'violations:view', 'violations:resolve',
    'reports:export',
  ],

  labor_inspector: [
    ...VIEW_ALL,
    'inspections:view', 'inspections:create', 'inspections:edit', 'inspections:delete', 'inspections:export',
    'violations:view', 'violations:create', 'violations:edit', 'violations:delete', 'violations:resolve', 'violations:export',
    'laborDisputes:view', 'laborDisputes:create', 'laborDisputes:edit', 'laborDisputes:delete', 'laborDisputes:resolve',
    'expatriate:view', 'expatriate:create', 'expatriate:edit', 'expatriate:delete',
    'compliance:view', 'risk:view', 'evaluation:view', 'evaluation:create', 'evaluation:edit', 'evaluation:delete',
    'reports:export',
  ],

  compliance_officer: [
    ...VIEW_ALL,
    'compliance:view', 'compliance:create', 'compliance:edit', 'compliance:delete',
    'risk:view', 'risk:create', 'risk:edit',
    'evaluation:view', 'evaluation:create', 'evaluation:edit', 'evaluation:delete',
    'violations:view', 'violations:resolve',
    'reports:generate', 'reports:export',
  ],

  registry_officer: [
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

  reports_viewer: [
    ...VIEW_ALL,
    'reports:view', 'reports:generate', 'reports:export', 'comparative:view', 'audit:view',
  ],

  union_president: [
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

  hr_officer: [
    ...VIEW_ALL,
    'members:view', 'members:create', 'members:edit', 'members:delete', 'members:export',
    'workerProfiles:view', 'workerProfiles:create', 'workerProfiles:edit', 'workerProfiles:delete',
    'training:view', 'training:create', 'training:edit', 'training:delete',
    'board:view', 'elections:view', 'activities:view', 'activities:create', 'activities:edit', 'activities:delete',
    'documents:view', 'documents:upload', 'services:view', 'services:request',
    'reports:export', 'profile:view',
  ],

  financial_officer: [
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
// Hook
// ============================================================

export function usePermissions() {
  const { user } = useAuth();

  const userPermissions: string[] = user
    ? (ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.reports_viewer)
    : [];

  const can = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (userPermissions.includes('admin:all')) return true;
    return userPermissions.includes(permission);
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
