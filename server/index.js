// server/index.js — Lean entry point
// All routes are in server/routes/*.js modules
// Shared utilities in server/middleware/shared.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root BEFORE any other imports (critical for DB pool)
const envPath = join(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  });
} catch (e) {
  console.warn('[Server] Could not load .env:', e.message);
}

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

// ===================== Core Middleware =====================
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ===================== Standardized API Response =====================
app.use((_req, res, next) => {
  // Wrap res.json to standardize format
  const originalJson = res.json;
  res.json = function (data) {
    const standardized = {
      success: true,
      data: data,
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
      },
      errors: null,
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
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// ===================== Rate Limiting =====================
const rateLimitMap = new Map();
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

// ===================== Auth Middleware (optional) =====================
// يُلحق req.user عند وجود رمز صالح دون منع بقية المسارات (لتفادي كسر الواجهات الحالية)
import { verifyToken } from './middleware/auth.js';
const AUTH_ENABLED = process.env.ENABLE_AUTH === 'true';

app.use((req, res, next) => {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload) {
      req.user = { id: payload.sub, email: payload.email, role: payload.role, userType: payload.userType, organizationId: payload.organizationId };
    }
  }
  next();
});

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
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/time-series', async (req, res) => {
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
    res.status(500).json({ error: err.message });
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports/scheduled', async (_req, res) => {
  try {
    const types = ['summary', 'compliance', 'violations', 'inspections'];
    const reports = await Promise.all(types.map(t => generateScheduledReport(t, 'daily')));
    res.json({ reports, cachedAt: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate reports every 6 hours in background
const schedulerInterval = setInterval(async () => {
  try {
    const types = ['summary', 'compliance', 'violations', 'inspections'];
    for (const t of types) { await generateScheduledReport(t, 'daily'); }
    console.log('[Scheduler] Reports refreshed at', new Date().toISOString());
  } catch (e) { console.error('[Scheduler] Error:', e.message); }
}, 6 * 60 * 60 * 1000);

function gracefulShutdown() {
  console.log('\n[Server] Shutting down gracefully...');
  clearInterval(schedulerInterval);
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// ===================== Catch-all =====================
app.use((_req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// ===================== Start Server (when not running as Vercel serverless) =====================
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🏛️  UnionSphere Enterprise Server`);
    console.log(`📡 Running on http://localhost:${PORT}`);
    console.log(`🔐 Auth: ${AUTH_ENABLED ? 'ENABLED' : 'DISABLED (dev mode)'}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;
export { app };
