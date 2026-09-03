import '../lib/loadEnv.js';
import crypto from 'crypto';

// JWT_SECRET must be set via environment variable — no defaults allowed
// P0 Gate: fail-closed — production must have JWT_SECRET configured
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  if (process.env.VERCEL === '1') {
    console.error('[SECURITY] FATAL: JWT_SECRET is not set — serverless will return 500 on auth routes');
  } else {
    console.error('[SECURITY] FATAL: JWT_SECRET is not set — refusing to start (P0 Gate)');
    process.exit(1);
  }
}
if (SECRET && SECRET.length < 32) {
  if (process.env.VERCEL === '1') {
    console.error('[SECURITY] FATAL: JWT_SECRET must be at least 32 characters — serverless will return 500 on auth routes');
  } else {
    console.error('[SECURITY] FATAL: JWT_SECRET must be at least 32 characters — refusing to start');
    process.exit(1);
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  try {
    const h = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export function signToken(payload) {
  if (!SECRET) throw new Error('JWT_SECRET not configured');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !SECRET) return null;
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Express middleware: authenticates the request from the Authorization header
// and populates req.user with a consistent shape (id = sub + pass-through claims).
// Used as router.use(getAuthUser) by scoped routers (contracts, disputes,
// inspections, cross-portal, ...).
export function getAuthUser(req, res, next) {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) {
      req.user = {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        userType: payload.userType,
        organizationId: payload.organizationId,
        governorate: payload.governorate,
        directorate: payload.directorate,
        sid: payload.sid,
        full_name: payload.full_name,
        portal: payload.portal,
      };
    }
  }
  if (!req.user) {
    return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول', code: 'UNAUTHORIZED' });
  }
  return next();
}
