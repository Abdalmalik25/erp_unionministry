/**
 * usePermissions — نظام صلاحيات RBAC
 * Role-Based Access Control لجميع عمليات المنصة
 */

import { useCallback, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// تعريف الصلاحيات
// ============================================================

export type Permission =
  // الكيانات
  | 'entities:view' | 'entities:create' | 'entities:edit' | 'entities:delete' | 'entities:export'
  // الأعضاء
  | 'members:view' | 'members:create' | 'members:edit' | 'members:delete' | 'members:export'
  // الانتخابات
  | 'elections:view' | 'elections:create' | 'elections:edit' | 'elections:approve'
  // الأنشطة
  | 'activities:view' | 'activities:create' | 'activities:edit' | 'activities:delete'
  // الوثائق
  | 'documents:view' | 'documents:upload' | 'documents:approve' | 'documents:reject'
  // الخدمات
  | 'services:view' | 'services:request' | 'services:approve' | 'services:reject'
  // المخالفات
  | 'violations:view' | 'violations:create' | 'violations:edit' | 'violations:resolve'
  // التقارير
  | 'reports:view' | 'reports:generate' | 'reports:export'
  // سجل التدقيق
  | 'audit:view'
  // الإعدادات
  | 'settings:view' | 'settings:edit'
  // الإدارة العليا
  | 'admin:all';

// ============================================================
// خريطة الصلاحيات لكل دور
// ============================================================

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ministry: [
    'entities:view', 'entities:create', 'entities:edit', 'entities:delete', 'entities:export',
    'members:view', 'members:create', 'members:edit', 'members:delete', 'members:export',
    'elections:view', 'elections:create', 'elections:edit', 'elections:approve',
    'activities:view', 'activities:create', 'activities:edit', 'activities:delete',
    'documents:view', 'documents:upload', 'documents:approve', 'documents:reject',
    'services:view', 'services:approve', 'services:reject',
    'violations:view', 'violations:create', 'violations:edit', 'violations:resolve',
    'reports:view', 'reports:generate', 'reports:export',
    'audit:view',
    'settings:view', 'settings:edit',
    'admin:all',
  ],
  organization: [
    'entities:view',
    'members:view', 'members:create', 'members:edit',
    'elections:view',
    'activities:view', 'activities:create', 'activities:edit',
    'documents:view', 'documents:upload',
    'services:view', 'services:request',
    'violations:view',
    'reports:view',
  ],
  auditor: [
    'entities:view', 'entities:export',
    'members:view', 'members:export',
    'elections:view',
    'activities:view',
    'documents:view',
    'services:view',
    'violations:view',
    'reports:view', 'reports:generate', 'reports:export',
    'audit:view',
  ],
  viewer: [
    'entities:view',
    'members:view',
    'elections:view',
    'activities:view',
    'documents:view',
    'services:view',
    'violations:view',
    'reports:view',
  ],
};

// ============================================================
// Hook
// ============================================================

export function usePermissions() {
  const { user } = useAuth();

  const userPermissions: Permission[] = user
    ? (ROLE_PERMISSIONS[user.userType] || ROLE_PERMISSIONS.viewer)
    : [];

  const can = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    if (userPermissions.includes('admin:all')) return true;
    return userPermissions.includes(permission);
  }, [user, userPermissions]);

  const canAny = useCallback((...permissions: Permission[]): boolean => {
    return permissions.some(p => can(p));
  }, [can]);

  const canAll = useCallback((...permissions: Permission[]): boolean => {
    return permissions.every(p => can(p));
  }, [can]);

  return {
    can,
    canAny,
    canAll,
    userPermissions,
    isMinistry: user?.userType === 'ministry',
    isOrganization: user?.userType === 'organization',
    userType: user?.userType,
  };
}

// ============================================================
// مكوّن حارث الصلاحية
// ============================================================

interface PermissionGateProps {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
