import '../lib/loadEnv.js';
import express from 'express';
import { pool, paginate, countQuery, softDeleteFilter, auditLog } from '../middleware/shared.js';
import { hashPassword, verifyPassword, signToken } from '../middleware/auth.js';

const router = express.Router();

// ===================== Enhanced System Diagnostics & Health =====================
router.get('/api/health', async (_req, res) => {
  const startTime = Date.now();
  try {
    const r = await pool.query('SELECT NOW() as time, current_database() as db, version() as pg_version');
    const latency = Date.now() - startTime;
    res.json({
      status: 'healthy',
      service: 'National Labor Platform Core API',
      version: '2.5.0',
      database: {
        status: 'connected',
        name: r.rows[0].db,
        latency_ms: latency,
        pg_version: r.rows[0].pg_version,
      },
      uptime_seconds: Math.round(process.uptime()),
      memory: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      security_posture: {
        cors: 'enforced',
        hsts: 'enabled',
        csp: 'active',
        rate_limit: 'active',
        audit_trail: 'active',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: 'Database connection failed', details: err.message });
  }
});

// ===================== Ø§Ù„Ù‡ÙˆÙŠØ© Ø§Ù„Ù…Ø¤Ø³Ø³ÙŠØ© Ø§Ù„Ø¹Ø§Ù…Ø© (Ø¨Ø¯ÙˆÙ† Ù…ØµØ§Ø¯Ù‚Ø© â€” Ù„Ø´Ø§Ø´Ø© Ø§Ù„Ø¯Ø®ÙˆÙ„ ÙˆØ§Ù„ØªØ±ÙˆÙŠØ³Ø©) =====================
router.get('/api/system/branding', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key = ANY($1::text[])`,
      [['org_name_ar', 'org_name_en', 'org_country', 'system_name_ar', 'legal_basis']]);
    const map = Object.fromEntries(r.rows.map(x => [x.setting_key, x.setting_value]));
    res.json({
      ministryNameAr: map.org_name_ar || 'ÙˆØ²Ø§Ø±Ø© Ø§Ù„Ø´Ø¤ÙˆÙ† Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ© ÙˆØ§Ù„Ø¹Ù…Ù„',
      ministryNameEn: map.org_name_en || 'Ministry of Social Affairs and Labor',
      countryAr: map.org_country || 'Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±ÙŠØ© Ø§Ù„ÙŠÙ…Ù†ÙŠØ©',
      systemNameAr: map.system_name_ar || 'Ù†Ø¸Ø§Ù… Ù‚Ø·Ø§Ø¹ Ø§Ù„Ø¹Ù…Ù„ â€” Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© Ø§Ù„Ù…ÙˆØ­Ø¯Ø©',
      legalBasis: map.legal_basis || 'Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ø¹Ù…Ù„ Ø±Ù‚Ù… 40 Ù„Ø³Ù†Ø© 2025 ÙˆÙ„Ø§Ø¦Ø­Ù‡ Ø§Ù„ØªÙ†ÙÙŠØ°ÙŠØ©',
    });
  } catch (err) {
    // Ø­ØªÙ‰ Ø¹Ù†Ø¯ ÙØ´Ù„ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØªØ¹ÙˆØ¯ Ø§Ù„Ù‡ÙˆÙŠØ© Ø§Ù„Ø±Ø³Ù…ÙŠØ© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©
    res.json({
      ministryNameAr: 'ÙˆØ²Ø§Ø±Ø© Ø§Ù„Ø´Ø¤ÙˆÙ† Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠØ© ÙˆØ§Ù„Ø¹Ù…Ù„',
      ministryNameEn: 'Ministry of Social Affairs and Labor',
      countryAr: 'Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±ÙŠØ© Ø§Ù„ÙŠÙ…Ù†ÙŠØ©',
      systemNameAr: 'Ù†Ø¸Ø§Ù… Ù‚Ø·Ø§Ø¹ Ø§Ù„Ø¹Ù…Ù„ â€” Ø§Ù„Ù…Ù†Ø¸ÙˆÙ…Ø© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© Ø§Ù„Ù…ÙˆØ­Ø¯Ø©',
      legalBasis: 'Ù‚Ø§Ù†ÙˆÙ† Ø§Ù„Ø¹Ù…Ù„ Ø±Ù‚Ù… 40 Ù„Ø³Ù†Ø© 2025 ÙˆÙ„Ø§Ø¦Ø­Ù‡ Ø§Ù„ØªÙ†ÙÙŠØ°ÙŠØ©',
      degraded: true,
    });
  }
});

// ===================== Ø§Ù„Ø³ÙŠØ§Ø³Ø§Øª ÙˆØ§Ù„Ø¹ØªØ¨Ø§Øª Ø§Ù„Ø±Ø³Ù…ÙŠØ© (Ø¹Ø§Ù… â€” ØªÙØ¹Ø±Ø¶ ÙÙŠ Ø§Ù„Ø´Ø§Ø´Ø§Øª ÙˆØ§Ù„Ù…Ø³ØªÙ†Ø¯Ø§Øª) =====================
// Ù…ØµØ¯Ø± Ø§Ù„Ø­Ù‚ÙŠÙ‚Ø©: system_settings (ÙØ¦Ø© policy) â€” ØªØªØºÙŠØ± Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø¯ÙˆÙ† Ø¥Ø¹Ø§Ø¯Ø© Ù†Ø´Ø±
router.get('/api/system/policy', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key = ANY($1::text[])`,
      [['yemenization_min_ratio', 'password_min_length']]);
    const map = Object.fromEntries(r.rows.map(x => [x.setting_key, x.setting_value]));
    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
    res.json({
      yemenizationMinRatio: num(map.yemenization_min_ratio, 80),
    });
  } catch (_err) {
    // Ù‚ÙŠÙ… Ø§ÙØªØ±Ø§Ø¶ÙŠØ© Ø±Ø³Ù…ÙŠØ© Ø¹Ù†Ø¯ ØªØ¹Ø°Ø± Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
    res.json({ yemenizationMinRatio: 80, degraded: true });
  }
});

// ===================== Auth Endpoints =====================
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNorm = String(email || '').toLowerCase().trim();
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '').toString().slice(0, 60);
    const ua = (req.headers['user-agent'] || '').slice(0, 250);
    if (!email || !password) return res.status(400).json({ error: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ÙˆÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ù…Ø·Ù„ÙˆØ¨Ø§Ù†' });
    const r = await pool.query(
      'SELECT * FROM sector_users WHERE email = $1 AND deleted_at IS NULL',
      [emailNorm]
    );
    if (r.rows.length === 0) {
      await pool.query(`INSERT INTO login_attempts (email_attempted, success, reason, ip_address, user_agent) VALUES ($1,false,'unknown_user',$2,$3)`, [emailNorm, ip, ua]);
      return res.status(401).json({ error: 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯Ø®ÙˆÙ„ ØºÙŠØ± ØµØ­ÙŠØ­Ø©' });
    }
    const u = r.rows[0];
    if (!u.is_active) {
      await pool.query(`INSERT INTO login_attempts (email_attempted, user_id, success, reason, ip_address, user_agent) VALUES ($1,$2,false,'account_disabled',$3,$4)`, [emailNorm, u.id, ip, ua]);
      return res.status(403).json({ error: 'Ø§Ù„Ø­Ø³Ø§Ø¨ Ù…ÙˆÙ‚ÙˆÙ â€” Ø±Ø§Ø¬Ø¹ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù†Ø¸Ø§Ù…' });
    }
    if (!verifyPassword(password, u.salt, u.password_hash)) {
      await pool.query(`INSERT INTO login_attempts (email_attempted, user_id, success, reason, ip_address, user_agent) VALUES ($1,$2,false,'bad_password',$3,$4)`, [emailNorm, u.id, ip, ua]);
      return res.status(401).json({ error: 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯Ø®ÙˆÙ„ ØºÙŠØ± ØµØ­ÙŠØ­Ø©' });
    }
    await pool.query('UPDATE sector_users SET last_login = NOW() WHERE id = $1', [u.id]);
    // ÙØªØ­ Ø¬Ù„Ø³Ø© Ø¹Ù…Ù„ Ø±Ø³Ù…ÙŠØ© Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØªØ¨Ø¹
    const sess = await pool.query(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent) VALUES ($1,$2,$3) RETURNING id`,
      [u.id, ip, ua]);
    const token = signToken({ sub: u.id, email: u.email, role: u.role, userType: u.user_type, organizationId: u.organization_id, sid: sess.rows[0].id });
    await pool.query(`INSERT INTO login_attempts (email_attempted, user_id, success, reason, ip_address, user_agent) VALUES ($1,$2,true,'ok',$3,$4)`, [emailNorm, u.id, ip, ua]);
    await auditLog('login', 'auth', u.id, { email: u.email });
    res.json({
      success: true,
      token,
      sessionId: sess.rows[0].id,
      user: { id: u.id, email: u.email, name: u.name, role: u.role, userType: u.user_type, organizationId: u.organization_id, mustChangePassword: u.password_changed_at == null },
    });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

// ===================== ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± =====================
router.post('/api/auth/change-password', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'ØºÙŠØ± Ù…ØµØ±Ø­ â€” ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„', code: 'UNAUTHORIZED' });
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© ÙˆØ§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù…Ø·Ù„ÙˆØ¨ØªØ§Ù†', code: 'VALIDATION' });

    // Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù…Ù† Ø§Ù„Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø© ÙÙŠ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù…
    let minLength = 8;
    try {
      const pr = await pool.query(`SELECT value FROM system_settings WHERE key = 'password_min_length' LIMIT 1`);
      const v = parseInt(pr.rows[0]?.value, 10);
      if (!Number.isNaN(v) && v >= 8) minLength = v;
    } catch {}
    if (String(newPassword).length < minLength) {
      return res.status(400).json({ error: `ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© ÙŠØ¬Ø¨ Ø£Ù„Ø§ ØªÙ‚Ù„ Ø¹Ù† ${minLength} Ø£Ø­Ø±Ù`, code: 'WEAK_PASSWORD' });
    }

    const r = await pool.query('SELECT id, salt, password_hash FROM sector_users WHERE id = $1 AND deleted_at IS NULL', [req.user.id]);
    const u = r.rows[0];
    if (!u) return res.status(404).json({ error: 'Ø§Ù„Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯', code: 'NOT_FOUND' });
    if (!verifyPassword(String(currentPassword), u.salt, u.password_hash)) {
      await auditLog('login_failed', 'sector_users', u.id, { reason: 'change_password_bad_current' });
      return res.status(401).json({ error: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØºÙŠØ± ØµØ­ÙŠØ­Ø©', code: 'BAD_CURRENT' });
    }
    if (verifyPassword(String(newPassword), u.salt, u.password_hash)) {
      return res.status(400).json({ error: 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù„Ø­Ø§Ù„ÙŠØ© â€” Ø§Ø®ØªØ± ÙƒÙ„Ù…Ø© Ù…Ø®ØªÙ„ÙØ©', code: 'SAME_PASSWORD' });
    }

    const { salt, hash } = hashPassword(String(newPassword));
    await pool.query(
      'UPDATE sector_users SET password_hash = $1, salt = $2, password_changed_at = NOW() WHERE id = $3',
      [hash, salt, u.id]
    );
    await auditLog('update', 'sector_users', u.id, { field: 'password_changed_by_user' });
    res.json({ success: true, message: 'ØªÙ… ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­' });
  } catch (e) {
    console.error('change-password error:', e?.message);
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' });
  }
});

// Ù†Ø¨Ø¶ Ø§Ù„Ù†Ø´Ø§Ø· â€” ÙŠØ­Ø¯Ù‘Ø« Ø¢Ø®Ø± Ù†Ø´Ø§Ø· Ù„Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©
router.post('/api/auth/heartbeat', async (req, res) => {
  try {
    const sid = req.user?.sid;
    if (!sid) return res.json({ ok: false });
    await pool.query(`UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1 AND is_active = true`, [sid]);
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

// ØªØ³Ø¬ÙŠÙ„ Ø®Ø±ÙˆØ¬ â€” Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø¬Ù„Ø³Ø© ÙˆØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ù…Ø¯Ø©
router.post('/api/auth/logout', async (req, res) => {
  try {
    const sid = req.user?.sid;
    if (sid) {
      const r = await pool.query(
        `UPDATE user_sessions SET logout_at = NOW(), is_active = false,
           last_activity_at = NOW()
         WHERE id = $1 AND is_active = true RETURNING EXTRACT(EPOCH FROM (logout_at - login_at))::bigint AS duration_seconds`,
        [sid]);
      if (r.rows.length && req.user?.id) {
        await auditLog('logout', 'auth', req.user.id, { duration_seconds: r.rows[0].duration_seconds });
      }
    }
    res.json({ success: true, message: 'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬' });
  } catch { res.json({ success: true }); }
});

router.get('/api/auth/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  try {
    const r = await pool.query(
      'SELECT id, email, name, role, user_type, organization_id, password_changed_at FROM sector_users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.id]
    );
    const u = r.rows[0];
    if (!u) return res.json({ user: null });
    res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, userType: u.user_type, organizationId: u.organization_id, mustChangePassword: u.password_changed_at == null } });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

// ===================== Sector Users (RBAC & Enterprise Governance) =====================
const AUTH_ENABLED = process.env.ENABLE_AUTH === 'true';

function requireAdmin(req, res, next) {
  if (!AUTH_ENABLED) return next();
  if (!req.user) return res.status(401).json({ error: 'ØºÙŠØ± Ù…ØµØ±Ø­ â€” ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' });
  if (req.user.role !== 'ministry_admin') return res.status(403).json({ error: 'ØµÙ„Ø§Ø­ÙŠØ© Ù…Ø¯ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù… ÙÙ‚Ø·' });
  next();
}

const VALID_ROLES = [
  'ministry_admin',
  'labor_inspector',
  'compliance_officer',
  'registry_officer',
  'reports_viewer',
  'legal_counsel',
  'supervisory_director',
  'union_president',
  'hr_officer',
  'financial_officer'
];

router.get('/api/sector-users/stats', requireAdmin, async (_req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int as active,
        COUNT(CASE WHEN is_active = false THEN 1 END)::int as suspended,
        COUNT(CASE WHEN user_type = 'ministry' THEN 1 END)::int as ministry_users,
        COUNT(CASE WHEN user_type = 'entity' THEN 1 END)::int as entity_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END)::int as active_this_week
      FROM sector_users
      WHERE deleted_at IS NULL
    `);
    res.json({ success: true, data: stats.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' });
  }
});

router.get('/api/sector-users', requireAdmin, async (req, res) => {
  try {
    const { search, role, user_type, is_active } = req.query;
    let where = 'deleted_at IS NULL';
    const params = [];
    let idx = 1;
    if (search) {
      where += ` AND (name ILIKE $${idx} OR email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (role) { where += ` AND role = $${idx++}`; params.push(role); }
    if (user_type) { where += ` AND user_type = $${idx++}`; params.push(user_type); }
    if (is_active !== undefined) { where += ` AND is_active = $${idx++}`; params.push(is_active === 'true'); }

    const r = await pool.query(
      `SELECT id, name, email, role, user_type, organization_id, is_active, last_login, created_at
       FROM sector_users WHERE ${where} ORDER BY created_at ASC`,
      params
    );
    res.json({ success: true, data: r.rows, total: r.rows.length });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/sector-users', requireAdmin, async (req, res) => {
  try {
    const { name, email, role, userType, password, organizationId, is_active } = req.body;
    if (!name || !email || !role || !userType || !password) return res.status(400).json({ error: 'Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Ø§Ù„Ø¯ÙˆØ± ØºÙŠØ± ØµØ§Ù„Ø­' });
    const exists = await pool.query('SELECT id FROM sector_users WHERE email = $1 AND deleted_at IS NULL', [String(email).toLowerCase().trim()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¨Ù‚Ø§Ù‹' });
    const { salt, hash } = hashPassword(password);
    const r = await pool.query(
      `INSERT INTO sector_users (name, email, role, user_type, password_hash, salt, organization_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, email, role, user_type, organization_id, is_active`,
      [name, String(email).toLowerCase().trim(), role, userType, hash, salt, organizationId || null, is_active !== false]
    );
    await auditLog('create', 'sector_user', req.user?.id || 'system', { email, role });
    res.status(201).json({ success: true, user: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/sector-users/:id', requireAdmin, async (req, res) => {
  try {
    const { name, email, role, userType, password, organizationId, is_active } = req.body;
    if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Ø§Ù„Ø¯ÙˆØ± ØºÙŠØ± ØµØ§Ù„Ø­' });
    const fields = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(String(email).toLowerCase().trim()); }
    if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
    if (userType !== undefined) { fields.push(`user_type = $${idx++}`); values.push(userType); }
    if (organizationId !== undefined) { fields.push(`organization_id = $${idx++}`); values.push(organizationId || null); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
    if (password) { const { salt, hash } = hashPassword(password); fields.push(`password_hash = $${idx++}`); values.push(hash); fields.push(`salt = $${idx++}`); values.push(salt); }
    if (fields.length === 0) return res.status(400).json({ error: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ù‚ÙˆÙ„ Ù„Ù„ØªØ­Ø¯ÙŠØ«' });
    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE sector_users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, user_type, organization_id, is_active`,
      values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
    await auditLog('update', 'sector_user', req.user?.id || 'system', { id: req.params.id, changes: req.body });
    res.json({ success: true, user: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/sector-users/:id/toggle-status', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const current = await pool.query('SELECT is_active, email, name, role FROM sector_users WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
    // Ø­Ù…Ø§ÙŠØ© Ø¢Ø®Ø± Ù…Ø¯ÙŠØ± Ù†Ø¸Ø§Ù… Ù†Ø´Ø· Ù…Ù† Ø§Ù„ØªØ¹Ø·ÙŠÙ„ â€” ÙŠØ¶Ù…Ù† Ø§Ø³ØªÙ…Ø±Ø§Ø±ÙŠØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ù„ÙŠØ§
    if (current.rows[0].role === 'ministry_admin' && current.rows[0].is_active) {
      const admins = await pool.query(
        `SELECT COUNT(*)::int n FROM sector_users WHERE role = 'ministry_admin' AND is_active = true AND deleted_at IS NULL`);
      if (admins.rows[0].n <= 1)
        return res.status(409).json({
          error: 'Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø·ÙŠÙ„ Ø¢Ø®Ø± Ù…Ø¯ÙŠØ± Ù†Ø¸Ø§Ù… Ù†Ø´Ø· â€” ÙŠØ¬Ø¨ ØªØ²ÙˆÙŠØ¯ Ù…Ø¯ÙŠØ± Ø¢Ø®Ø± Ø£ÙˆÙ„Ø§Ù‹ Ø­ÙØ§Ø¸Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ø³ØªÙ…Ø±Ø§Ø±ÙŠØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©',
          code: 'LAST_ADMIN_PROTECTED',
        });
    }
    const newStatus = !current.rows[0].is_active;
    const r = await pool.query(
      'UPDATE sector_users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, is_active',
      [newStatus, req.params.id]
    );
    await auditLog('update', 'sector_user_status', req.user?.id || 'system', {
      id: req.params.id,
      email: current.rows[0].email,
      new_status: newStatus ? 'active' : 'suspended',
      reason: reason || 'ØªØºÙŠÙŠØ± Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±ÙŠØ© Ù…Ù† Ù‚Ø¨Ù„ Ù…Ø¯ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù…'
    });
    res.json({ success: true, user: r.rows[0], message: newStatus ? 'ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø¨Ù†Ø¬Ø§Ø­' : 'ØªÙ… Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø­Ø³Ø§Ø¨ ÙˆØªØ¬Ù…ÙŠØ¯ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª' });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/sector-users/:id', requireAdmin, async (req, res) => {
  try {
    // Ø­Ù…Ø§ÙŠØ© Ø¢Ø®Ø± Ù…Ø¯ÙŠØ± Ù†Ø¸Ø§Ù… Ù†Ø´Ø· Ù…Ù† Ø§Ù„Ø­Ø°Ù
    const target = await pool.query('SELECT role, is_active FROM sector_users WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
    if (target.rows[0].role === 'ministry_admin' && target.rows[0].is_active) {
      const admins = await pool.query(
        `SELECT COUNT(*)::int n FROM sector_users WHERE role = 'ministry_admin' AND is_active = true AND deleted_at IS NULL`);
      if (admins.rows[0].n <= 1)
        return res.status(409).json({
          error: 'Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø­Ø°Ù Ø¢Ø®Ø± Ù…Ø¯ÙŠØ± Ù†Ø¸Ø§Ù… Ù†Ø´Ø· â€” ÙŠØ¬Ø¨ ØªØ²ÙˆÙŠØ¯ Ù…Ø¯ÙŠØ± Ø¢Ø®Ø± Ø£ÙˆÙ„Ø§Ù‹ Ø­ÙØ§Ø¸Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ø³ØªÙ…Ø±Ø§Ø±ÙŠØ© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©',
          code: 'LAST_ADMIN_PROTECTED',
        });
    }
    const r = await pool.query(
      `UPDATE sector_users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
    await auditLog('delete', 'sector_user', req.user?.id || 'system', { id: req.params.id });
    res.json({ success: true, message: 'ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙˆÙ†Ù‚Ù„Ù‡ Ù„Ù„Ø£Ø±Ø´ÙŠÙ' });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

// ===================== Notifications =====================
router.get('/api/notifications', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { recipient_id, is_read } = req.query;
    let where = '1=1';
    where += softDeleteFilter('notifications', includeDeleted, 'notifications');
    const params = [];
    let idx = 1;
    if (recipient_id) { where += ` AND recipient_id = $${idx++}`; params.push(recipient_id); }
    if (is_read !== undefined) { where += ` AND is_read = $${idx++}`; params.push(is_read === 'true'); }
    const { sql: _qs, params: _qp } = countQuery('notifications', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' });
  }
});

router.post('/api/notifications', async (req, res) => {
  try {
    const d = req.body;
    if (!d.recipient_id) return res.status(400).json({ error: 'recipient_id Ù…Ø·Ù„ÙˆØ¨' });
    const cols = [
      'recipient_id','title','message','notification_type','related_resource',
      'related_id','is_read','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at');
    placeholders.push('NOW()');
    const values = fields.slice(0, -1).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO notifications (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, notification: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' });
  }
});

router.put('/api/notifications/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      title:'title', message:'message', notification_type:'notification_type',
      related_resource:'related_resource', related_id:'related_id',
      is_read:'is_read', read_at:'read_at', metadata:'metadata'
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ù‚ÙˆÙ„ Ù„Ù„ØªØ­Ø¯ÙŠØ«' });
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE notifications SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
    res.json({ success: true, notification: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' });
  }
});

router.delete('/api/notifications/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE notifications SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' });
  }
});

// ===================== Audit Log API =====================

router.put('/api/notifications/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE notifications SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' });
  }
});

router.get('/api/audit-log', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { action, resource_type, user_id } = req.query;
    const conditions = []; const params = []; let idx = 1;
    if (action) { conditions.push(`al.action = $${idx++}`); params.push(action); }
    if (resource_type) { conditions.push(`al.table_name = $${idx++}`); params.push(resource_type); }
    if (user_id) { conditions.push(`al.actor_id = $${idx++}`); params.push(user_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wc = conditions.length ? conditions.join(' AND ') : '';
    const { sql: _qs, params: _qp } = countQuery('audit_log al', wc, params);
    const total = await pool.query(_qs, _qp);

    const rows = (await pool.query(
      `SELECT al.* FROM audit_log al
       ${where} ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )).rows;
    res.json({ data: rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/audit-log', async (req, res) => {
  try {
    const { action, resource, resource_id, details, user_id, email } = req.body;
    await auditLog(action || 'action', resource || 'system', user_id || null, {
      resource_id,
      details,
      email,
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(200).json({ success: true, warning: err.message });
  }
});

router.post('/api/audit-logs', async (req, res) => {
  try {
    const { action, resource, resource_id, details, user_id, email } = req.body;
    await auditLog(action || 'action', resource || 'system', user_id || null, {
      resource_id,
      details,
      email,
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(200).json({ success: true, warning: err.message });
  }
});

// ===================== Push Notifications =====================
router.post('/api/push/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys) {
      return res.status(400).json({ error: 'endpoint and keys are required' });
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [endpoint, keys.p256dh, keys.auth]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ø®Ø·Ø£ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' });
  }
});

export default router;
