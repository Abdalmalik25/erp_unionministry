// server/middleware/rbac.js — RBAC + ABAC + Jurisdiction Enforcement
// Law First: كل صلاحية مرتبطة بمصدر قانوني/تنظيمي حيثما يلزم

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MINISTRY_ADMIN: 'ministry_admin',
  MINISTRY_STAFF: 'ministry_staff',
  SUPERVISORY_DIRECTOR: 'supervisory_director',
  LEGAL_COUNSEL: 'legal_counsel',
  LABOR_INSPECTOR: 'labor_inspector',
  COMPLIANCE_OFFICER: 'compliance_officer',
  REGISTRY_OFFICER: 'registry_officer',
  REPORTS_VIEWER: 'reports_viewer',
  UNION_PRESIDENT: 'union_president',
  HR_OFFICER: 'hr_officer',
  FINANCIAL_OFFICER: 'financial_officer',
  EMPLOYER_ADMIN: 'employer_admin',
  WORKER: 'worker',
};

// Permission = action:resource
export const PERMISSIONS = {
  'read:entities': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.MINISTRY_STAFF, ROLES.LABOR_INSPECTOR, ROLES.COMPLIANCE_OFFICER, ROLES.REGISTRY_OFFICER, ROLES.REPORTS_VIEWER],
  'write:entities': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.REGISTRY_OFFICER],
  'read:members': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.MINISTRY_STAFF, ROLES.UNION_PRESIDENT, ROLES.HR_OFFICER],
  'write:members': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.UNION_PRESIDENT, ROLES.HR_OFFICER],
  'read:inspections': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.LABOR_INSPECTOR, ROLES.COMPLIANCE_OFFICER, ROLES.SUPERVISORY_DIRECTOR],
  'write:inspections': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.LABOR_INSPECTOR],
  'read:violations': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.COMPLIANCE_OFFICER, ROLES.LEGAL_COUNSEL],
  'write:violations': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.COMPLIANCE_OFFICER, ROLES.LABOR_INSPECTOR],
  'read:legal': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.LEGAL_COUNSEL, ROLES.LABOR_INSPECTOR, ROLES.COMPLIANCE_OFFICER],
  'write:legal': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.LEGAL_COUNSEL],
  'read:audit': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN, ROLES.SUPERVISORY_DIRECTOR],
  'admin:system': [ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN],
};

export function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
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
  // super_admin و ministry_admin لهم وصول وطني
  if ([ROLES.SUPER_ADMIN, ROLES.MINISTRY_ADMIN].includes(req.user.role)) return next();
  // المفتش وموظف السجل مقيدون بمحافظتهم
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
