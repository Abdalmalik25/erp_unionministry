// server/index.js — Lean entry point
// All routes are in server/routes/*.js modules
// Shared utilities in server/middleware/shared.js

// تحميل البيئة أولاً — يُنفذ قبل أي وحدة تقرأ process.env (ترتيب ESM)
import './lib/loadEnv.js';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

// ===================== Core Middleware — Nuclear Hardening =====================
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
// Security hardening (sanitization + CSRF + MFA) — TD-006/022/028/029
import { sanitizeBody, csrfMiddleware, requireMFA } from './middleware/security.js';
import { sanitizeQuery } from './middleware/validation.js';
import { structuredLogger, metricsEndpoint, errorHandler } from './middleware/observability.js';
app.use(sanitizeQuery);
app.use(sanitizeBody);
app.use(csrfMiddleware);
app.use(requireMFA);
app.use(structuredLogger);

// ===================== Response Compression (dependency-free gzip) =====================
import zlib from 'zlib';
app.use((req, res, next) => {
  const accept = String(req.headers['accept-encoding'] || '');
  if (!/\bgzip\b/.test(accept)) return next();
  const chunks = [];
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);
  res.write = function (chunk, ...args) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  };
  res.end = function (chunk, ...args) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const ctype = String(res.getHeader('Content-Type') || '');
    const buf = Buffer.concat(chunks);
    // Skip tiny payloads, already-encoded streams, and SSE
    if (buf.length < 1024 || ctype.includes('event-stream') || res.getHeader('Content-Encoding')) {
      return origEnd(buf, ...args);
    }
    zlib.gzip(buf, { level: 6 }, (err, zipped) => {
      if (err || zipped.length >= buf.length) return origEnd(buf, ...args);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', String(zipped.length));
      origEnd(zipped);
    });
  };
  next();
});

// ===================== Standardized API Response =====================
app.use((_req, res, next) => {
  // Wrap res.json to standardize format
  const originalJson = res.json;
  res.json = function (data) {
    const isError = res.statusCode >= 400;
    const standardized = {
      success: !isError,
      data: isError ? null : data,
      meta: {
        timestamp: new Date().toISOString(),
        path: _req.path,
        method: _req.method,
      },
      errors: isError ? (typeof data === 'object' && data !== null ? data : { message: String(data) }) : null,
    };
    return originalJson.call(this, standardized);
  };
  next();
});

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // سياسة المحتوى للواجهة تأتي من meta مفصلة في index.html (تسمح بخطوط Google الرسمية)
  // أما API فلا تحتاج CSP — نمنع التفسير كصفحة فقط
  if (_req.path.startsWith('/api')) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  next();
});

// ===================== Rate Limiting =====================
const rateLimitMap = new Map();
// تنظيف دوري لسجل المحدد — يمنع تضخم الذاكرة على المدى الطويل
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > 60000) rateLimitMap.delete(ip);
  }
}, 120000).unref();
app.use('/api', (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > 60000) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return next();
  }
  entry.count++;
  if (entry.count > 200) return res.status(429).json({ error: 'تم تجاوز الحد المسموح' });
  next();
});

// ===================== Brute-Force Guard (login) =====================
// 8 محاولات لكل 5 دقائق لكل زوج IP+بريد — حماية من تخمين كلمات المرور
const loginGuard = new Map();
app.use('/api/auth/login', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const email = String(req.body?.email || '').toLowerCase().trim();
  const key = `${ip}|${email}`;
  const now = Date.now();
  let entry = loginGuard.get(key);
  if (!entry || now - entry.start > 5 * 60 * 1000) {
    entry = { start: now, count: 0 };
    loginGuard.set(key, entry);
  }
  entry.count++;
  if (loginGuard.size > 5000) loginGuard.clear(); // حماية من تضخم الذاكرة
  if (entry.count > 8) {
    return res.status(429).json({ error: 'تم تجاوز عدد محاولات الدخول — أعد المحاولة بعد 5 دقائق', code: 'LOGIN_RATE_LIMITED' });
  }
  next();
});

// ===================== Cache-Control للقواميس الرسمية =====================
// بيانات مرجعية نادر التغير — تُخزن مؤقتاً 5 دقائق لتسريع التنقل
app.use((req, res, next) => {
  if (req.method === 'GET') {
    const dictPaths = ['/api/geography/governorates', '/api/isic4', '/api/national-directories', '/api/national-occupations', '/api/sector-properties'];
    if (dictPaths.some(p => req.path.startsWith(p))) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Vary', 'Accept-Encoding');
    }
  }
  next();
});

// ===================== Auth Middleware (enforced) =====================
import { verifyToken } from './middleware/auth.js';
import { auditContext } from './middleware/rbac.js';
const AUTH_ENABLED = process.env.ENABLE_AUTH === 'true';

// P0 Gate: fail-closed in production — never allow unauthenticated sensitive APIs
if (process.env.NODE_ENV === 'production' && !AUTH_ENABLED) {
  console.error('[SECURITY] FATAL: ENABLE_AUTH=false in production — refusing to start (P0 Gate fail-closed)');
  process.exit(1);
}

app.use((req, res, next) => {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    // Verify issuer/audience/algorithm restriction
    if (payload) {
      if (payload.iss && payload.iss !== 'national-labor-platform') {
        return res.status(401).json({ error: 'جهة إصدار غير صالحة', code: 'INVALID_ISSUER' });
      }
      req.user = { id: payload.sub, email: payload.email, role: payload.role, userType: payload.userType, organizationId: payload.organizationId, governorate: payload.governorate, directorate: payload.directorate, sid: payload.sid };
    }
  }
  // Enforce auth for all /api except health, auth/login, public dictionaries
  const publicPaths = ['/api/health','/api/auth/login','/api/auth/me','/api/isic4','/api/geography/governorates'];
  // مسارات البوابة العامة المقيدة بالطريقة — شاشة الدخول وطلبات فتح الحسابات
  const PUBLIC_GET = ['/api/system/branding', '/api/system/policy', '/api/establishments/lookup'];
  const PUBLIC_POST = ['/api/account-requests', '/api/audit-log'];

// مانع إغراق مخصص لقيود التدقيق العامة: 30 طلباً/دقيقة لكل عنوان — يحمي جدول التدقيق من التعبئة
const AUDIT_POST_LIMITER = (() => {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now - v.t > 60000) hits.delete(k); }, 30000).unref();
  return (req, res, next) => {
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'x').toString().slice(0, 50);
    const now = Date.now();
    const e = hits.get(ip);
    if (!e || now - e.t > 60000) { hits.set(ip, { t: now, n: 1 }); return next(); }
    e.n += 1;
    if (e.n > 30) return res.status(429).json({ error: 'عدد كبير من الطلبات — حاول لاحقاً', code: 'RATE_LIMITED' });
    next();
  };
})();
  const isPublic = publicPaths.some(p => req.path === p || req.path.startsWith(p + '/')) || req.path.startsWith('/api/v1/legal/sources')
    || (req.method === 'GET' && PUBLIC_GET.includes(req.path))
    || (req.method === 'POST' && PUBLIC_POST.includes(req.path));
  if (req.method === 'POST' && req.path === '/api/audit-log') return AUDIT_POST_LIMITER(req, res, () => {
    // قيود التدقيق العامة مسموحة حتى قبل الدخول (توثيق محاولات الاختراق) لكنها لا تتجاوز الليمنتر
    next();
  });
  if (AUTH_ENABLED && !isPublic && req.path.startsWith('/api') && !req.user) {
    return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول', code: 'UNAUTHORIZED' });
  }
  // In production with AUTH_ENABLED, also fail-closed for sensitive writes even if flag misconfigured
  if (!AUTH_ENABLED && process.env.NODE_ENV === 'production' && req.path.startsWith('/api/v1/') && ['POST','PUT','DELETE','PATCH'].includes(req.method)) {
    return res.status(401).json({ error: 'الإنتاج يتطلب مصادقة — P0 Gate', code: 'P0_FAIL_CLOSED' });
  }
  next();
});

app.use(auditContext);

// مانع صلاحيات بسيط للطرق المحمية
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'ليس لديك صلاحية للوصول' });
    next();
  };
}

// ===================== Route Modules =====================
import entitiesRouter from './routes/entities.js';
import registrationRouter from './routes/registration.js';
import accountsRouter from './routes/accounts.js';
import workersRouter from './routes/workers.js';
import occupationsRouter from './routes/occupations.js';
import complianceRouter from './routes/compliance.js';
import operationsRouter from './routes/operations.js';
import legalRouter from './routes/legal.js';
import financialRouter from './routes/financial.js';
import systemRouter from './routes/system.js';
import aiComplianceRouter from './routes/aiCompliance.js';
import dynamicFieldsRouter from './routes/dynamicFields.js';
import laborRecordsRouter from './routes/laborRecords.js';
import nationalDirectoriesRouter from './routes/nationalDirectories.js';
import administrationRouter from './routes/administration.js';
import regulatoryRouter from './routes/regulatory.js';
import workflowRouter from './routes/workflow.js';
import contractsRouter from './routes/contracts.js';
import integrationRouter from './routes/integration.js';
import serviceCatalogRouter from './routes/serviceCatalog.js';
import paymentsRouter from './routes/payments.js';
import excellenceRouter from './routes/excellence.js';
import dataQualityRouter from './routes/dataQuality.js';
import chronologyRouter from './routes/chronology.js';
import externalIntegrationsRouter from './routes/externalIntegrations.js';
import intelligenceRouter from './routes/intelligence.js';

// ===================== Automated Server-Side Mutation Audit =====================
import { auditLog } from './middleware/shared.js';
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.path.startsWith('/api/audit-log') && !req.path.startsWith('/api/auth/login')) {
    const originalSend = res.send;
    res.send = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resource = req.path.split('/')[2] || 'api';
        const userId = req.user?.id || req.headers['x-user-id'] || 'system';
        auditLog(req.method.toLowerCase(), resource, userId, {
          path: req.path,
          ip: req.ip || req.connection?.remoteAddress,
          timestamp: Date.now(),
        }).catch(() => {});
      }
      return originalSend.apply(res, arguments);
    };
  }
  next();
});

app.use(entitiesRouter);
app.use(registrationRouter);
app.use(accountsRouter);
app.use(workersRouter);
app.use(occupationsRouter);
app.use(complianceRouter);
app.use(operationsRouter);
app.use(legalRouter);
app.use(financialRouter);
app.use(systemRouter);
app.use(aiComplianceRouter);
app.use(dynamicFieldsRouter);
app.use(laborRecordsRouter);
app.use(nationalDirectoriesRouter);
app.use(administrationRouter);
app.use(regulatoryRouter);
app.use(workflowRouter);
app.use(contractsRouter);
app.use(integrationRouter);
app.use(serviceCatalogRouter);
app.use(paymentsRouter);
app.use(excellenceRouter);
app.use(dataQualityRouter);
app.use(chronologyRouter);
app.use(externalIntegrationsRouter);
app.use(intelligenceRouter);

// ===================== Dashboard (inline — uses shared pool) =====================
import { pool, paginate, countQuery } from './middleware/shared.js';

app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL) AS total_entities,
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL AND status = 'active') AS active_entities,
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL AND compliance_status = 'compliant') AS compliant_entities,
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL AND risk_level = 'high') AS high_risk_entities,
        (SELECT COALESCE(SUM(member_count), 0)::int FROM organizational_entities WHERE deleted_at IS NULL) AS total_members,
        (SELECT COUNT(*)::int FROM activities WHERE deleted_at IS NULL) AS total_activities,
        (SELECT COUNT(*)::int FROM violations WHERE deleted_at IS NULL AND status = 'open') AS open_violations,
        (SELECT COUNT(*)::int FROM licenses WHERE deleted_at IS NULL AND status = 'valid') AS valid_licenses,
        (SELECT COUNT(*)::int FROM compliance_alerts WHERE is_resolved = false) AS unresolved_alerts
    `);
    res.json(stats.rows[0]);
  } catch (_err) {
    res.status(500).json({ error: 'خطأ داخلي — تم تسجيل الحادثة', code:'INTERNAL_ERROR' });
  }
});

// Optimized single-query enhanced stats — replaces 11 parallel queries with 1
app.get('/api/dashboard/enhanced-stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL) AS total_entities,
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL AND status = 'active') AS active_entities,
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL AND compliance_status = 'compliant') AS compliant_entities,
        (SELECT COUNT(*)::int FROM organizational_entities WHERE deleted_at IS NULL AND risk_level = 'high') AS high_risk_entities,
        (SELECT COALESCE(SUM(member_count), 0)::int FROM organizational_entities WHERE deleted_at IS NULL) AS total_members,
        (SELECT COUNT(*)::int FROM activities WHERE deleted_at IS NULL) AS total_activities,
        (SELECT COUNT(*)::int FROM violations WHERE deleted_at IS NULL AND status = 'open') AS open_violations,
        (SELECT COUNT(*)::int FROM licenses WHERE deleted_at IS NULL AND status = 'valid') AS valid_licenses,
        (SELECT COUNT(*)::int FROM compliance_alerts WHERE is_resolved = false) AS unresolved_alerts,
        (SELECT COUNT(*)::int FROM worker_dispatches WHERE deleted_at IS NULL) AS total_dispatches,
        (SELECT COUNT(*)::int FROM worker_reduction_requests) AS total_reduction_requests,
        (SELECT COUNT(*)::int FROM services) AS total_services
    `);
    res.json({
      entities: result.rows[0].total_entities,
      activeEntities: result.rows[0].active_entities,
      compliantEntities: result.rows[0].compliant_entities,
      highRiskEntities: result.rows[0].high_risk_entities,
      totalMembers: result.rows[0].total_members,
      totalActivities: result.rows[0].total_activities,
      openViolations: result.rows[0].open_violations,
      validLicenses: result.rows[0].valid_licenses,
      unresolvedAlerts: result.rows[0].unresolved_alerts,
      totalDispatches: result.rows[0].total_dispatches,
      totalReductionRequests: result.rows[0].total_reduction_requests,
      totalServices: result.rows[0].total_services,
    });
    } catch (err) {
      console.error('[Dashboard] enhanced-stats failed:', err.message);
      res.status(500).json({ error: 'خطأ داخلي — تم تسجيل الحادثة', code: 'INTERNAL_ERROR' });
    }
});

app.get('/api/dashboard/time-series', async (_req, res) => {
  try {
    const [monthlyEntities, monthlyMembers, monthlyViolations, byType, byGovernorate] = await Promise.all([
      pool.query(`
        SELECT to_char(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
               COUNT(*)::int as count
        FROM organizational_entities WHERE deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC LIMIT 12
      `),
      pool.query(`
        SELECT to_char(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
               COUNT(*)::int as count
        FROM members WHERE deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC LIMIT 12
      `),
      pool.query(`
        SELECT to_char(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
               COUNT(*)::int as count
        FROM violations WHERE deleted_at IS NULL
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC LIMIT 12
      `),
      pool.query(`
        SELECT entity_type as type, COUNT(*)::int as count
        FROM organizational_entities WHERE deleted_at IS NULL
        GROUP BY entity_type ORDER BY count DESC
      `),
      pool.query(`
        SELECT COALESCE(governorate, 'غير محدد') as governorate, COUNT(*)::int as count
        FROM organizational_entities WHERE deleted_at IS NULL
        GROUP BY governorate ORDER BY count DESC LIMIT 10
      `),
    ]);

    const months = [...new Set([
      ...monthlyEntities.rows.map(r => r.month),
      ...monthlyMembers.rows.map(r => r.month),
      ...monthlyViolations.rows.map(r => r.month),
    ])].sort();

    const monthly = months.map(m => ({
      month: m,
      entities: monthlyEntities.rows.find(r => r.month === m)?.count || 0,
      members: monthlyMembers.rows.find(r => r.month === m)?.count || 0,
      violations: monthlyViolations.rows.find(r => r.month === m)?.count || 0,
    }));

    res.json({ monthly, byType: byType.rows, byGovernorate: byGovernorate.rows });
  } catch (err) {
    console.error('[Dashboard] time-series failed:', err.message);
    res.status(500).json({ error: 'خطأ داخلي — تم تسجيل الحادثة', code: 'INTERNAL_ERROR' });
  }
});

// ===================== Scheduled Reports =====================
const reportCache = new Map();

async function generateScheduledReport(type, period) {
  const key = `${type}_${period}`;
  const now = new Date();
  const intervalMs = period === 'daily' ? 86400000 : period === 'weekly' ? 604800000 : 2592000000;
  const cached = reportCache.get(key);
  if (cached && (now.getTime() - cached.generatedAt) < intervalMs) return cached;

  let report = { type, period, generatedAt: now.toISOString(), data: {} };
  try {
    if (type === 'compliance') {
      const r = await pool.query(`SELECT
        COUNT(*)::int as total_entities,
        COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END)::int as compliant,
        COUNT(CASE WHEN risk_level = 'high' OR risk_level = 'critical' THEN 1 END)::int as high_risk,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active
      FROM organizational_entities WHERE deleted_at IS NULL`);
      report.data = r.rows[0];
    } else if (type === 'violations') {
      const r = await pool.query(`SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END)::int as critical,
        COUNT(CASE WHEN severity = 'major' THEN 1 END)::int as major
      FROM violations WHERE deleted_at IS NULL`);
      report.data = r.rows[0];
    } else if (type === 'inspections') {
      const r = await pool.query(`SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed,
        COUNT(CASE WHEN status = 'scheduled' AND inspection_date < NOW() THEN 1 END)::int as overdue,
        COUNT(CASE WHEN result = 'pass' OR status = 'completed' THEN 1 END)::int as passed
      FROM inspections`);
      report.data = r.rows[0];
    } else if (type === 'summary') {
      const [entities, members, violations, inspections] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active FROM organizational_entities WHERE deleted_at IS NULL`),
        pool.query(`SELECT COUNT(*)::int as total FROM members WHERE deleted_at IS NULL`),
        pool.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open FROM violations WHERE deleted_at IS NULL`),
        pool.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed FROM inspections`),
      ]);
      report.data = {
        entities: entities.rows[0], members: members.rows[0],
        violations: violations.rows[0], inspections: inspections.rows[0],
      };
    }
  } catch (e) { report.error = e.message; }
  reportCache.set(key, { ...report, generatedAt: now.getTime() });
  return report;
}

app.get('/api/reports/scheduled/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const period = req.query.period || 'daily';
    const report = await generateScheduledReport(type, period);
    res.json(report);
  } catch (err) { console.error('[Reports] scheduled/:type failed:', err.message); res.status(500).json({ error: 'خطأ داخلي — تم تسجيل الحادثة', code: 'INTERNAL_ERROR' }); }
});

app.get('/api/reports/scheduled', async (_req, res) => {
  try {
    const types = ['summary', 'compliance', 'violations', 'inspections'];
    const reports = await Promise.all(types.map(t => generateScheduledReport(t, 'daily')));
    res.json({ reports, cachedAt: new Date().toISOString() });
  } catch (err) { console.error('[Reports] scheduled failed:', err.message); res.status(500).json({ error: 'خطأ داخلي — تم تسجيل الحادثة', code: 'INTERNAL_ERROR' }); }
});

// Generate reports every 6 hours in background
const schedulerInterval = setInterval(async () => {
  try {
    const types = ['summary', 'compliance', 'violations', 'inspections'];
    for (const t of types) { await generateScheduledReport(t, 'daily'); }
    console.log('[Scheduler] Reports refreshed at', new Date().toISOString());
  } catch (e) { console.error('[Scheduler] Error:', e.message); }
}, 6 * 60 * 60 * 1000);

function gracefulShutdown(signal) {
  console.log(`\n[Server] ${signal} — shutting down gracefully...`);
  clearInterval(schedulerInterval);
  // إغلاق تجمع قاعدة البيانات بأمان مع مهلة قصوى
  const forceTimer = setTimeout(() => process.exit(0), 8000);
  import('./middleware/shared.js').then(({ pool }) => pool.end())
    .catch(() => {})
    .finally(() => { clearTimeout(forceTimer); process.exit(0); });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('[Server] UNCAUGHT EXCEPTION:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] UNHANDLED REJECTION:', reason);
});

// ===================== Metrics & Observability =====================
app.get('/api/metrics', metricsEndpoint);

// ===================== Version (تتبع مؤسسي للإصدار) =====================
import { existsSync, readFileSync } from 'fs';
const pkgPath = join(__dirname, '..', 'package.json');
const APP_VERSION = (() => {
  try { return JSON.parse(readFileSync(pkgPath, 'utf8')).version || '0.0.0'; }
  catch { return '0.0.0'; }
})();
app.get('/api/version', (_req, res) => {
  res.json({
    version: APP_VERSION,
    environment: process.env.NODE_ENV || 'development',
    authEnabled: AUTH_ENABLED,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// ===================== Production Static Serving — الواجهة الرسمية من نفس الخادم =====================
// عند توفر نسخة الإنتاج (dist/) تُخدم مباشرة مع دعم توجيه SPA الكامل
const DIST_DIR = join(__dirname, '..', 'dist');
if (existsSync(join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR, {
    maxAge: '1y',            // أصول بصمات (hash) — تخزين طويل الأمد
    index: false,            // نتحكم بـ index.html يدوياً
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      else if (/\.woff2?$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  // SPA fallback — أي مسار GET غير API يعيد تطبيق الواجهة (متوافق مع Express 5)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

// ===================== Catch-all =====================
app.use((_req, res) => {
  res.status(404).json({ error: 'المسار غير موجود', code:'NOT_FOUND' });
});
app.use(errorHandler);

// ===================== Start Server (when not running as Vercel serverless) =====================
if (process.env.VERCEL !== '1') {
  // خلف وكيل عكسي (nginx/IIS) في الإنتاج — يضمن req.ip الصحيح للمحدد والتدقيق
  if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  const server = app.listen(PORT, () => {
    console.log(`\n🏛️  المنظومة الوطنية للعمل النقابي — وزارة الشؤون الاجتماعية والعمل`);
    console.log(`📡 Running on http://localhost:${PORT}`);
    console.log(`🔐 Auth: ${AUTH_ENABLED ? 'ENABLED' : 'DISABLED (dev mode)'}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Version: ${APP_VERSION}\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] المنفذ ${PORT} قيد الاستخدام — أوقف العملية القديمة أو غيّر PORT`);
      process.exit(1);
    }
    console.error('[Server] listen error:', err.message);
    process.exit(1);
  });
}

export default app;
export { app };
