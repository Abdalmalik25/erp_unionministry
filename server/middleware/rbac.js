// server/middleware/rbac.js — RBAC + ABAC + Jurisdiction Enforcement
// Law First: كل صلاحية مرتبطة بمصدر قانوني/تنظيمي حيثما يلزم
// Uses unified role strings matching client-side usePermissions definitions

// Unified role strings — must match src/app/roles.ts and client ROLE_PERMISSIONS keys
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MINISTRY_ADMIN: 'ministry_admin',
  DEPUTY_MINISTER: 'deputy_minister',
  MINISTRY_STAFF: 'ministry_staff',
  SUPERVISORY_DIRECTOR: 'supervisory_director',
  LEGAL_COUNSEL: 'legal_counsel',
  LABOR_INSPECTOR: 'labor_inspector',
  COMPLIANCE_OFFICER: 'compliance_officer',
  REGISTRY_OFFICER: 'registry_officer',
  REPORTS_VIEWER: 'reports_viewer',
  UNION_PRESIDENT: 'union_president',
  EMPLOYER_ADMIN: 'employer_admin',
  HR_OFFICER: 'hr_officer',
  FINANCIAL_OFFICER: 'financial_officer',
  WORKER: 'worker',
};

// Permission = action:resource
// وكيل الوزارة (DEPUTY_MINISTER): قراءة/كتابة شاملة على الموارد التشغيلية
// والإطلاع على سجل التدقيق — دون صلاحيات إدارة النظام (admin:system)
export const PERMISSIONS = {
  'read:entities': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.MINISTRY_STAFF, ROLES.LABOR_INSPECTOR, ROLES.COMPLIANCE_OFFICER, ROLES.REGISTRY_OFFICER, ROLES.REPORTS_VIEWER],
  'write:entities': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.REGISTRY_OFFICER],
  'read:members': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.MINISTRY_STAFF, ROLES.UNION_PRESIDENT, ROLES.HR_OFFICER],
  'write:members': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.UNION_PRESIDENT, ROLES.HR_OFFICER],
  'read:inspections': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.LABOR_INSPECTOR, ROLES.COMPLIANCE_OFFICER, ROLES.SUPERVISORY_DIRECTOR],
  'write:inspections': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.LABOR_INSPECTOR],
  'read:violations': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.COMPLIANCE_OFFICER, ROLES.LEGAL_COUNSEL],
  'write:violations': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.COMPLIANCE_OFFICER, ROLES.LABOR_INSPECTOR],
  'read:legal': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.LEGAL_COUNSEL, ROLES.LABOR_INSPECTOR, ROLES.COMPLIANCE_OFFICER],
  'write:legal': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.LEGAL_COUNSEL],
  'read:audit': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.DEPUTY_MINISTER, ROLES.SUPERVISORY_DIRECTOR],
  'admin:system': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN],
};

// Map client role keys to server role strings for consistency
// This ensures ProtectedRoute checks and server RBAC use the same strings
export const ROLE_ALIASES: Record<string, string> = {
  // Client role keys -> server role strings
  ministry_admin: ROLES.MINISTRY_ADMIN,
  supervisory_director: ROLES.SUPERVISORY_DIRECTOR,
  legal_counsel: ROLES.LEGAL_COUNSEL,
  labor_inspector: ROLES.LABOR_INSPECTOR,
  compliance_officer: ROLES.COMPLIANCE_OFFICER,
  registry_officer: ROLES.REGISTRY_OFFICER,
  reports_viewer: ROLES.REPORTS_VIEWER,
  union_president: ROLES.UNION_PRESIDENT,
  employer_owner: ROLES.EMPLOYER_ADMIN,
  worker: ROLES.WORKER,
  hr_officer: ROLES.HR_OFFICER,
  financial_officer: ROLES.FINANCIAL_OFFICER,
};

export function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  // role can be either a raw string or a client key — normalize it
  const normalizedRole = ROLE_ALIASES[role] || role;
  return allowed.includes(normalizedRole);
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول', code: 'UNAUTHORIZED' });
    // الإدارة العليا للوزارة (مدير النظام) لها وصول شامل لكل مكونات المنظومة
    if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.MINISTRY_ADMIN) return next();
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للوصول', code: 'FORBIDDEN', required: permission, role: req.user.role });
    }
    next();
  };
}

// ABAC: jurisdiction enforcement — محافظة/مديرية/مكتب
export function requireJurisdiction(req, res, next) {
  if (!req.user) return next();
  // super_admin و ministry_admin لهم وصول وطني وشامل
  if ([ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN].includes(req.user.role)) return next();
  // المديرون المشرفون مقيدون بمديريتهم
  if (req.user.governorate && req.user.directorate && req.query.governorate && req.query.directorate) {
    if (req.user.governorate !== req.query.governorate || req.user.directorate !== req.query.directorate) {
      return res.status(403).json({ error: 'خارج نطاق اختصاصك الإداري', code: 'JURISDICTION_DENIED' });
    }
  }
  // المفتش وموظف السجل مقيدون بمحافظتهم فقط (بدون مديرية)
  if (req.user.governorate && req.query.governorate && req.user.governorate !== req.query.governorate) {
    return res.status(403).json({ error: 'خارج نطاق اختصاصك الجغرافي', code: 'JURISDICTION_DENIED' });
  }
  next();
}

export function auditContext(req, _res, next) {
  req.audit = {
    actorId: req.user?.id || req.headers['x-user-id'] || 'anonymous',
    actorRole: req.user?.role || 'anonymous',
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    correlationId: req.headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
  };
  next();
}