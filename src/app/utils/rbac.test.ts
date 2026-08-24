/**
 * RBAC Tests — اختبارات التحكم القائم على الدور
 * تغطية الصلاحيات، الفصل بين المهام، وصحة البيانات التعريفية للأدوار
 * مصدر الحقيقة الوحيد: hooks/usePermissions.tsx
 */

import { describe, it, expect } from 'vitest';
import {
  ROLE_PERMISSIONS,
  ROLE_META,
  ROLE_LIST,
  hasPermission,
} from '../hooks/usePermissions';

describe('ROLE_PERMISSIONS structure', () => {
  it('يجب تعريف جميع أدوار المنظومة الأربعة عشر', () => {
    const expectedRoles = [
      'ministry_admin',
      'supervisory_director',
      'legal_counsel',
      'labor_inspector',
      'compliance_officer',
      'registry_officer',
      'reports_viewer',
      'union_president',
      'employer_owner',
      'worker',
      'hr_officer',
      'financial_officer',
    ];

    for (const role of expectedRoles) {
      expect(ROLE_PERMISSIONS).toHaveProperty(role);
    }
    expect(ROLE_LIST.length).toBe(Object.keys(ROLE_META).length);
  });

  it('كل دور يملك مصفوفة صلاحيات غير فارغة', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(ROLE_PERMISSIONS[role]).toBeInstanceOf(Array);
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it('كل دور في ROLE_META له صلاحيات والعكس', () => {
    for (const role of Object.keys(ROLE_META)) {
      expect(ROLE_PERMISSIONS[role], `صلاحيات مفقودة للدور ${role}`).toBeDefined();
    }
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(ROLE_META[role], `بيانات تعريفية مفقودة للدور ${role}`).toBeDefined();
    }
  });
});

describe('ROLE_META structure', () => {
  it('لكل دور تسمية ولون ونوع مستخدم ووصف', () => {
    for (const role of Object.keys(ROLE_META)) {
      const meta = ROLE_META[role];
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('color');
      expect(meta).toHaveProperty('userType');
      expect(meta).toHaveProperty('description');
      expect(typeof meta.label).toBe('string');
      expect(typeof meta.color).toBe('string');
    }
  });

  it('التسميات معرّبة بالكامل — لا أجنبية ولا محارف مشوهة', () => {
    for (const role of Object.keys(ROLE_META)) {
      const label = ROLE_META[role].label;
      expect(label.length).toBeGreaterThan(0);
      // يجب أن تحتوي حروفاً عربية
      expect(label, `تسمية ${role} غير عربية: ${label}`).toMatch(/[\u0600-\u06FF]/);
      // لا محارف كورية/يابانية/صينية أو لاتينية متبقية من مشاريع أخرى
      expect(label, `تسمية ${role} تحوي محارف أجنبية: ${label}`).not.toMatch(/[\uac00-\ud7af\u3040-\u30ff\u4e00-\u9fff]/);
      expect(label, `تسمية ${role} تحوي أحجاماً لاتينية: ${label}`).not.toMatch(/[A-Za-z]/);
    }
  });
});

describe('permission segregation', () => {
  it('مفتش العمل لا يملك صلاحيات إدارة المستخدمين', () => {
    const inspectorPerms = ROLE_PERMISSIONS.labor_inspector;
    const hasUserManagement = inspectorPerms.some(
      (p) => p.startsWith('users:') || p.includes('users:manage')
    );
    expect(hasUserManagement).toBe(false);
  });

  it('مفتش العمل يملك صلاحيات التفتيش والمخالفات', () => {
    const inspectorPerms = ROLE_PERMISSIONS.labor_inspector;
    const hasInspectionPerms = inspectorPerms.some(
      (p) => p.includes('inspections') || p.includes('violations')
    );
    expect(hasInspectionPerms).toBe(true);
  });

  it('العامل لا يملك صلاحيات إدارية وزارية', () => {
    const workerPerms = ROLE_PERMISSIONS.worker;
    expect(workerPerms).not.toContain('admin:all');
    expect(workerPerms.some((p) => p.startsWith('users:'))).toBe(false);
  });
});

describe('ministry_admin wildcard', () => {
  it('مدير الوزارة يملك الصلاحية الشاملة admin:all', () => {
    const adminPerms = ROLE_PERMISSIONS.ministry_admin;
    expect(adminPerms).toContain('admin:all');
  });

  it('hasPermission يتجاوز كل فحص عند وجود admin:all', () => {
    expect(hasPermission(['admin:all'], 'anything:at:all')).toBe(true);
  });
});

describe('hasPermission logic', () => {
  it('يفحص صلاحية مفردة بدقة', () => {
    const permissions = ['entities:view', 'entities:create'];
    expect(hasPermission(permissions, 'entities:view')).toBe(true);
    expect(hasPermission(permissions, 'entities:edit')).toBe(false);
    expect(hasPermission(permissions, 'users:view')).toBe(false);
  });

  it('يوحّد النقاط والنقطتين عبر normalizePermission', () => {
    expect(hasPermission(['entities:view'], 'entities.view')).toBe(true);
  });
});
