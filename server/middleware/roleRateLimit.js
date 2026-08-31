/**
 * Role-Based Rate Limiter — Phase 5
 * Different rate limits per user role:
 *   - public/anonymous: strict (60 req/min)
 *   - worker: standard (120 req/min)
 *   - employer/union: enhanced (300 req/min)
 *   - ministry/admin: highest (600 req/min)
 *   - system/service: bypass
 */

import { rateLimit } from './rateLimit.js';

const ROLE_LIMITS = {
  public: { windowMs: 60_000, max: 60 },
  worker: { windowMs: 60_000, max: 120 },
  employer: { windowMs: 60_000, max: 300 },
  union: { windowMs: 60_000, max: 300 },
  organization: { windowMs: 60_000, max: 300 },
  ministry: { windowMs: 60_000, max: 600 },
  admin: { windowMs: 60_000, max: 600 },
  system: { windowMs: 60_000, max: 5000 },
  service: { windowMs: 60_000, max: 5000 },
};

function getRole(req) {
  if (!req.user) return 'public';
  const role = (req.user.role || '').toLowerCase();
  const userType = (req.user.userType || '').toLowerCase();
  // Map known userTypes to roles
  if (userType === 'worker' || role === 'worker') return 'worker';
  if (userType === 'employer' || role === 'employer') return 'employer';
  if (userType === 'union' || role === 'union') return 'union';
  if (userType === 'organization' || role === 'organization') return 'organization';
  if (userType === 'ministry' || role === 'ministry') return 'ministry';
  if (userType === 'admin' || role === 'admin' || role === 'super_admin') return 'admin';
  if (userType === 'system' || role === 'system' || role === 'service') return 'system';
  return 'public';
}

/**
 * Build a per-role rate limit middleware stack
 * Implemented as a single dispatcher middleware
 */
export function roleBasedLimit() {
  const limiters = {};
  for (const [role, opts] of Object.entries(ROLE_LIMITS)) {
    limiters[role] = rateLimit({
      windowMs: opts.windowMs,
      max: opts.max,
      keyGenerator: (req) => `${req.ip || 'ip'}:${req.user?.id || 'anon'}`,
      skip: () => false,
      message: `تجاوزت الحد المسموح لدور "${role}" — حاول بعد دقيقة`,
    });
  }

  return (req, res, next) => {
    const role = getRole(req);
    const limiter = limiters[role] || limiters.public;
    limiter(req, res, next);
  };
}

/**
 * Get role-based limits info (for documentation)
 */
export function getRoleLimits() {
  return { ...ROLE_LIMITS };
}

/**
 * Classify endpoint categories for finer-grained limits
 */
export const ENDPOINT_CATEGORIES = {
  auth: { windowMs: 60_000, max: 10 },     // 10 req/min for auth
  upload: { windowMs: 60_000, max: 20 },   // 20 req/min for file uploads
  report: { windowMs: 300_000, max: 10 },  // 10 req/5min for heavy reports
  search: { windowMs: 60_000, max: 60 },   // 60 req/min for search
  webhook: { windowMs: 60_000, max: 100 }, // 100 req/min for webhooks
};

export function categoryLimit(category) {
  const opts = ENDPOINT_CATEGORIES[category];
  if (!opts) return (_req, _res, next) => next();
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    keyGenerator: (req) => `${req.ip || 'ip'}:${req.user?.id || 'anon'}:${category}`,
    message: `تجاوزت الحد المسموح لفئة "${category}"`,
  });
}

export default { roleBasedLimit, getRoleLimits, categoryLimit };
