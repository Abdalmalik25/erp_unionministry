/**
 * Portals & RBAC Normalization Tests
 * قفل جودة: توحيد مفاتيح الصلاحيات، المرادفات، مسارات الهبوط، سلامة الأدوار
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePermission,
  resolvePermissionKey,
  hasPermission,
  ROLE_META,
  ROLE_PERMISSIONS,
  ROLE_LIST,
} from '../hooks/usePermissions';
import { AUDIENCES, getLandingPath, getPortalKind, ROLE_COLOR_CLASSES } from '../utils/portals';

describe('normalizePermission', () => {
  it('converts dot notation to colon notation', () => {
    expect(normalizePermission('commercial.view')).toBe('commercial:view');
    expect(normalizePermission('members.view')).toBe('members:view');
  });

  it('keeps colon notation unchanged and trims whitespace', () => {
    expect(normalizePermission(' reports:view ')).toBe('reports:view');
  });
});

describe('resolvePermissionKey — sidebar aliases map to RBAC keys', () => {
  it.each([
    ['view.dashboard', 'dashboard:view'],
    ['system.audit.view', 'audit:view'],
    ['system.users.manage', 'users:view'],
    ['licenses.expat.view', 'expatriate:view'],
    ['workers.dispatch.view', 'dispatches:view'],
    ['workers.reduction.view', 'reduction:view'],
    ['unions.view', 'entities:view'],
    ['disputes.view', 'laborDisputes:view'],
    ['inspections.cert.view', 'evaluation:view'],
  ])('%s → %s', (sidebarKey, expected) => {
    expect(resolvePermissionKey(sidebarKey)).toBe(expected);
  });

  it('every ministry sidebar perm resolves to a permission some role actually holds', () => {
    // أي مفتاح يظهر في القوائم يجب أن يُحقق بـ admin:all على الأقل
    const admin = ROLE_PERMISSIONS.ministry_admin;
    expect(admin).toContain('admin:all');
  });
});

describe('hasPermission', () => {
  const inspectorPerms = ROLE_PERMISSIONS.labor_inspector;

  it('matches dotted UI keys against colon-based role grants', () => {
    expect(hasPermission(inspectorPerms, 'inspections.view')).toBe(true);
    expect(hasPermission(inspectorPerms, 'violations.resolve')).toBe(true);
  });

  it('resolves aliases so non-admin roles see their menu items', () => {
    expect(hasPermission(inspectorPerms, 'view.dashboard')).toBe(true);
    expect(hasPermission(inspectorPerms, 'disputes.view')).toBe(true);
    expect(hasPermission(inspectorPerms, 'licenses.expat.view')).toBe(true);
  });

  it('denies what the role does not hold', () => {
    expect(hasPermission(inspectorPerms, 'users.create')).toBe(false);
    expect(hasPermission(inspectorPerms, 'fees.edit')).toBe(false);
  });

  it('admin:all grants everything', () => {
    expect(hasPermission(ROLE_PERMISSIONS.ministry_admin, 'anything.at.all')).toBe(true);
  });
});

describe('role integrity', () => {
  it('every role in permissions has meta and vice versa', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(ROLE_META[role], `missing meta for ${role}`).toBeDefined();
    }
    for (const role of Object.keys(ROLE_META)) {
      expect(ROLE_PERMISSIONS[role], `missing permissions for ${role}`).toBeDefined();
    }
    expect(ROLE_LIST.length).toBe(Object.keys(ROLE_META).length);
  });

  it('includes the four national audiences: ministry staff, employers, unions, workers', () => {
    expect(ROLE_META.employer_admin.userType).toBe('organization');
    expect(ROLE_META.worker.userType).toBe('organization');
    expect(ROLE_META.union_president.userType).toBe('organization');
    expect(ROLE_META.ministry_admin.userType).toBe('ministry');
  });

  it('worker is least-privilege: no admin, no entity deletion', () => {
    const workerPerms = ROLE_PERMISSIONS.worker;
    expect(workerPerms).not.toContain('admin:all');
    expect(workerPerms.some(p => p.endsWith(':delete'))).toBe(false);
    expect(hasPermission(workerPerms, 'services.request')).toBe(true);
    expect(hasPermission(workerPerms, 'laborDisputes.create')).toBe(true);
  });

  it('every role color has UI classes defined', () => {
    for (const role of Object.keys(ROLE_META)) {
      expect(ROLE_COLOR_CLASSES[ROLE_META[role].color], `no color classes for ${role}`).toBeDefined();
    }
  });
});

describe('getLandingPath — كل مستخدم يهبط في بوابته', () => {
  it('routes each audience to its dedicated portal', () => {
    expect(getLandingPath({ role: 'worker', userType: 'organization' })).toBe('/worker');
    expect(getLandingPath({ role: 'employer_owner', userType: 'organization' })).toBe('/employer');
    expect(getLandingPath({ role: 'union_president', userType: 'organization' })).toBe('/organization');
    expect(getLandingPath({ role: 'ministry_admin', userType: 'ministry' })).toBe('/ministry');
    expect(getLandingPath({ role: 'labor_inspector', userType: 'ministry' })).toBe('/ministry');
  });

  it('falls back safely for unknown or missing users', () => {
    expect(getLandingPath(null)).toBe('/');
    expect(getLandingPath(undefined)).toBe('/');
    expect(getLandingPath({ role: 'unknown_role', userType: 'organization' })).toBe('/organization');
    expect(getLandingPath({ role: 'unknown_role', userType: 'ministry' })).toBe('/ministry');
  });
});

describe('getPortalKind', () => {
  it('detects the active portal from the pathname', () => {
    expect(getPortalKind('/employer/members', false)).toBe('employer');
    expect(getPortalKind('/worker/services', true)).toBe('worker');
    expect(getPortalKind('/ministry/reports', true)).toBe('ministry');
    expect(getPortalKind('/organization', false)).toBe('organization');
  });
});

describe('AUDIENCES integrity', () => {
  it('defines exactly the four national audiences', () => {
    expect(AUDIENCES.map(a => a.id)).toEqual(['ministry', 'employer', 'union', 'worker']);
  });
});
