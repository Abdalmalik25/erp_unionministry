import '../lib/loadEnv.js';
import express from 'express';
import { pool, paginate, countQuery, softDeleteFilter, auditLog } from '../middleware/shared.js';
import { hashPassword, verifyPassword, signToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import APP_VERSION from '../lib/version.js';
import { generateSecret, otpauthUrl, verifyTotp } from '../lib/totp.js';
import { collectDeviceIntel, assessSessionRisk } from '../lib/device.js';
import { invalidateSessionCache } from '../lib/sessions.js';

const router = express.Router();

// ===================== Enhanced System Diagnostics & Health =====================
router.get('/api/health', async (_req, res) => {
  const startTime = Date.now();
  try {
    const r = await pool.query('SELECT NOW() as time, current_database() as db, version() as pg_version');
    const latency = Date.now() - startTime;
    res.json({
      status: 'healthy',
      service: 'المنظومة الوطنية لإدارة قطاع العمل',
      version: APP_VERSION,
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

// ===================== الهوية المؤسسية العامة (بدون مصادقة — لشاشة الدخول والترويسة) =====================
router.get('/api/system/branding', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key = ANY($1::text[])`,
      [['org_name_ar', 'org_name_en', 'org_country', 'system_name_ar', 'system_name_en', 'legal_basis']]);
    const map = Object.fromEntries(r.rows.map(x => [x.setting_key, x.setting_value]));
    res.json({
      ministryNameAr: map.org_name_ar || 'وزارة الشؤون الاجتماعية والعمل',
      ministryNameEn: map.org_name_en || 'Ministry of Social Affairs and Labor',
      countryAr: map.org_country || 'الجمهورية اليمنية',
      systemNameAr: map.system_name_ar || 'المنظومة الوطنية لإدارة قطاع العمل',
      systemNameEn: map.system_name_en || 'National Labour Sector Management Platform',
      legalBasis: map.legal_basis || 'قانون العمل رقم 40 لسنة 2025 ولائحه التنفيذية',
    });
  } catch (err) {
    // حتى عند فشل قاعدة البيانات تعود الهوية الرسمية الافتراضية
    res.json({
      ministryNameAr: 'وزارة الشؤون الاجتماعية والعمل',
      ministryNameEn: 'Ministry of Social Affairs and Labor',
      countryAr: 'الجمهورية اليمنية',
      systemNameAr: 'المنظومة الوطنية لإدارة قطاع العمل',
      systemNameEn: 'National Labour Sector Management Platform',
      legalBasis: 'قانون العمل رقم 40 لسنة 2025 ولائحه التنفيذية',
      degraded: true,
    });
  }
});

// ===================== السياسات والعتبات الرسمية (عام — تُعرض في الشاشات والمستندات) =====================
// مصدر الحقيقة: system_settings (فئة policy) — تتغير من لوحة الإدارة دون إعادة نشر
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
    // قيم افتراضية رسمية عند تعذر قاعدة البيانات
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
    if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    const r = await pool.query(
      'SELECT * FROM sector_users WHERE email = $1 AND deleted_at IS NULL',
      [emailNorm]
    );
    if (r.rows.length === 0) {
      await pool.query(`INSERT INTO login_attempts (email_attempted, success, reason, ip_address, user_agent) VALUES ($1,false,'unknown_user',$2,$3)`, [emailNorm, ip, ua]);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    const u = r.rows[0];
    if (!u.is_active) {
      await pool.query(`INSERT INTO login_attempts (email_attempted, user_id, success, reason, ip_address, user_agent) VALUES ($1,$2,false,'account_disabled',$3,$4)`, [emailNorm, u.id, ip, ua]);
      return res.status(403).json({ error: 'الحساب موقوف — راجع إدارة النظام' });
    }
    if (!verifyPassword(password, u.salt, u.password_hash)) {
      await pool.query(`INSERT INTO login_attempts (email_attempted, user_id, success, reason, ip_address, user_agent) VALUES ($1,$2,false,'bad_password',$3,$4)`, [emailNorm, u.id, ip, ua]);
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    // MFA تزايدي: إن كان الحساب مُسجّلاً في TOTP يُشترط الرمز السداسي في mfa_code
    if (u.mfa_enabled && u.mfa_secret) {
      const mfaCode = String(req.body.mfa_code || '').trim();
      if (!mfaCode) {
        return res.status(401).json({ error: 'مطلوب رمز MFA', code: 'MFA_CODE_REQUIRED', mfa_required: true });
      }
      if (!verifyTotp(u.mfa_secret, mfaCode)) {
        await pool.query(`INSERT INTO login_attempts (email_attempted, user_id, success, reason, ip_address, user_agent) VALUES ($1,$2,false,'mfa_failed',$3,$4)`, [emailNorm, u.id, ip, ua]);
        return res.status(401).json({ error: 'رمز MFA غير صالح', code: 'MFA_INVALID', mfa_required: true });
      }
    }
    await pool.query('UPDATE sector_users SET last_login = NOW() WHERE id = $1', [u.id]);
    // استخبارات الجهاز والموقع — تحليل عميق ثم تقييم مخاطر مقارن بالتاريخ
    const intel = collectDeviceIntel(req);
    const risk = await assessSessionRisk(pool, {
      userId: u.id, fingerprint: intel.fingerprint, country: intel.country,
      city: intel.city, latitude: intel.latitude, longitude: intel.longitude, deviceType: intel.device_type,
    });
    // فتح جلسة عمل رسمية قابلة للتتبع — بهوية الجهاز والموقع والمخاطر
    const sess = await pool.query(
      `INSERT INTO user_sessions (user_id, ip_address, user_agent, device_fingerprint, device_type, device_brand,
         browser, browser_version, os, os_version, language, timezone, country, region, city, latitude, longitude,
         risk_score, risk_flags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
      [u.id, intel.ip, intel.user_agent, intel.fingerprint, intel.device_type, intel.device_brand,
       intel.browser, intel.browser_version, intel.os, intel.os_version, intel.language, intel.timezone,
       intel.country, intel.region, intel.city, intel.latitude, intel.longitude, risk.score, JSON.stringify(risk.flags)]);
    // سجل الأجهزة — upsert: تحديث آخر ظهور للجهاز المعروف
    await pool.query(
      `INSERT INTO device_registry (user_id, fingerprint, device_type, device_brand, browser, os, os_version, label, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (user_id, fingerprint) DO UPDATE SET last_seen_at=NOW(), browser=EXCLUDED.browser, os=EXCLUDED.os`,
      [u.id, intel.fingerprint, intel.device_type, intel.device_brand, intel.browser, intel.os, intel.os_version,
       `${intel.device_type} · ${intel.browser} · ${intel.os}`]);
    const token = signToken({ sub: u.id, email: u.email, role: u.role, userType: u.user_type, organizationId: u.organization_id, sid: sess.rows[0].id });
    await pool.query(`INSERT INTO login_attempts (email_attempted, user_id, success, reason, ip_address, user_agent) VALUES ($1,$2,true,'ok',$3,$4)`, [emailNorm, u.id, intel.ip, intel.user_agent]);
    await auditLog('login', 'auth', u.id, { email: u.email, ip: intel.ip, user_agent: intel.user_agent, session_id: sess.rows[0].id });
    res.json({
      success: true,
      session: { id: sess.rows[0].id, risk_score: risk.score, risk_flags: risk.flags,
        device: { type: intel.device_type, brand: intel.device_brand, browser: intel.browser, os: `${intel.os} ${intel.os_version || ''}`.trim() },
        location: { country: intel.country, city: intel.city } },
      token,
      sessionId: sess.rows[0].id,
      user: { id: u.id, email: u.email, name: u.name, role: u.role, userType: u.user_type, organizationId: u.organization_id },
    });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// نبض النشاط — يحدّث آخر نشاط للجلسة الحالية
router.post('/api/auth/heartbeat', async (req, res) => {
  try {
    const sid = req.user?.sid;
    if (!sid) return res.json({ ok: false });
    await pool.query(`UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1 AND is_active = true`, [sid]);
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

// ===================== MFA — TOTP حقيقي (RFC 6238) =====================
// تسجيل: يولّد سراً ويعيد otpauth:// لمسحه من تطبيق مصادقة (السر لا يُعرض مجدداً)
router.post('/api/auth/mfa/setup', async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'غير مصرح', code: 'UNAUTHORIZED' });
    if (req.user.email && req.user.email.endsWith('@mfa-disabled')) {
      return res.status(403).json({ error: 'MFA معطل لهذا الحساب', code: 'FORBIDDEN' });
    }
    const secret = generateSecret();
    await pool.query(
      'UPDATE sector_users SET mfa_secret=$2, mfa_enabled=false, mfa_enrolled_at=NULL WHERE id=$1 AND deleted_at IS NULL',
      [req.user.sub, secret]);
    const u = await pool.query('SELECT email FROM sector_users WHERE id=$1', [req.user.sub]);
    const url = otpauthUrl(secret, u.rows[0]?.email || req.user.email || 'user', 'MoSAL-ERP');
    await auditLog('mfa_setup', 'auth', req.user.sub, {});
    res.json({ secret, otpauth_url: url, note: 'امسح الرمز بتطبيق المصادقة ثم أكّد عبر /api/auth/mfa/enable' });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// تفعيل: يتحقق من رمز فعلي من تطبيق المصادقة ثم يشغّل MFA على الحساب
router.post('/api/auth/mfa/enable', async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'غير مصرح', code: 'UNAUTHORIZED' });
    const u = await pool.query(
      'SELECT mfa_secret, mfa_enabled FROM sector_users WHERE id=$1 AND deleted_at IS NULL', [req.user.sub]);
    const row = u.rows[0];
    if (!row?.mfa_secret) return res.status(400).json({ error: 'لم يتم تسجيل MFA بعد — ابدأ بـ setup', code: 'MFA_NOT_SETUP' });
    if (row.mfa_enabled) return res.status(400).json({ error: 'MFA مُفعّل مسبقاً', code: 'MFA_ALREADY_ENABLED' });
    if (!verifyTotp(row.mfa_secret, req.body?.code)) {
      return res.status(400).json({ error: 'الرمز غير صالح — تأكد من وقت جهازك وحاول مجدداً', code: 'MFA_INVALID' });
    }
    await pool.query(
      'UPDATE sector_users SET mfa_enabled=true, mfa_enrolled_at=NOW() WHERE id=$1', [req.user.sub]);
    await auditLog('mfa_enable', 'auth', req.user.sub, {});
    res.json({ success: true, mfa_enabled: true });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// تعطيل: يتطلب كلمة المرور + رمزاً صالحاً — لا تبرم مزدوجة
router.post('/api/auth/mfa/disable', async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'غير مصرح', code: 'UNAUTHORIZED' });
    const u = await pool.query(
      'SELECT mfa_secret, mfa_enabled, password_hash, salt FROM sector_users WHERE id=$1 AND deleted_at IS NULL', [req.user.sub]);
    const row = u.rows[0];
    if (!row?.mfa_enabled) return res.status(400).json({ error: 'MFA غير مُفعّل', code: 'MFA_NOT_ENABLED' });
    if (!verifyPassword(String(req.body?.password || ''), row.salt, row.password_hash)) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة', code: 'BAD_PASSWORD' });
    }
    if (!verifyTotp(row.mfa_secret, req.body?.code)) {
      return res.status(401).json({ error: 'رمز MFA غير صالح', code: 'MFA_INVALID' });
    }
    await pool.query(
      'UPDATE sector_users SET mfa_enabled=false, mfa_secret=NULL, mfa_enrolled_at=NULL WHERE id=$1', [req.user.sub]);
    await auditLog('mfa_disable', 'auth', req.user.sub, {});
    res.json({ success: true, mfa_enabled: false });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// حالة MFA للحساب الحالي
router.get('/api/auth/mfa/status', async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'غير مصرح', code: 'UNAUTHORIZED' });
    const u = await pool.query(
      'SELECT mfa_enabled, mfa_enrolled_at FROM sector_users WHERE id=$1', [req.user.sub]);
    res.json({ mfa_enabled: u.rows[0]?.mfa_enabled || false, enrolled_at: u.rows[0]?.mfa_enrolled_at || null });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// تسجيل خروج — إغلاق الجلسة وتوثيق المدة
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
    res.json({ success: true, message: 'تم تسجيل الخروج' });
  } catch { res.json({ success: true }); }
});

router.get('/api/auth/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  try {
    const r = await pool.query(
      'SELECT id, email, name, role, user_type, organization_id FROM sector_users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.id]
    );
    const u = r.rows[0];
    if (!u) return res.json({ user: null });
    res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, userType: u.user_type, organizationId: u.organization_id } });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== Sector Users (RBAC & Enterprise Governance) =====================
const AUTH_ENABLED = process.env.ENABLE_AUTH === 'true';

function requireAdmin(req, res, next) {
  if (!AUTH_ENABLED) return next();
  if (!req.user) return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
  if (req.user.role !== 'ministry_admin') return res.status(403).json({ error: 'صلاحية مدير النظام فقط' });
  next();
}

const VALID_ROLES = [
  'ministry_admin',
  'deputy_minister',
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
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
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
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/sector-users', requireAdmin, async (req, res) => {
  try {
    const { name, email, role, userType, password, organizationId, is_active } = req.body;
    if (!name || !email || !role || !userType || !password) return res.status(400).json({ error: 'الحقول الأساسية مطلوبة' });
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'الدور غير صالح' });
    const exists = await pool.query('SELECT id FROM sector_users WHERE email = $1 AND deleted_at IS NULL', [String(email).toLowerCase().trim()]);
    if (exists.rows.length) return res.status(409).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    const { salt, hash } = hashPassword(password);
    const r = await pool.query(
      `INSERT INTO sector_users (name, email, role, user_type, password_hash, salt, organization_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, name, email, role, user_type, organization_id, is_active`,
      [name, String(email).toLowerCase().trim(), role, userType, hash, salt, organizationId || null, is_active !== false]
    );
    await auditLog('create', 'sector_user', req.user?.id || 'system', { email, role });
    res.status(201).json({ success: true, user: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/sector-users/:id', requireAdmin, async (req, res) => {
  try {
    const { name, email, role, userType, password, organizationId, is_active } = req.body;
    if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'الدور غير صالح' });
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
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE sector_users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, user_type, organization_id, is_active`,
      values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    await auditLog('update', 'sector_user', req.user?.id || 'system', { id: req.params.id, changes: req.body });
    res.json({ success: true, user: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/sector-users/:id/toggle-status', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const current = await pool.query('SELECT is_active, email, name, role FROM sector_users WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
    // حماية آخر مدير نظام نشط من التعطيل — يضمن استمرارية الإدارة العليا
    if (current.rows[0].role === 'ministry_admin' && current.rows[0].is_active) {
      const admins = await pool.query(
        `SELECT COUNT(*)::int n FROM sector_users WHERE role = 'ministry_admin' AND is_active = true AND deleted_at IS NULL`);
      if (admins.rows[0].n <= 1)
        return res.status(409).json({
          error: 'لا يمكن تعطيل آخر مدير نظام نشط — يجب تزويد مدير آخر أولاً حفاظاً على استمرارية الإدارة',
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
      reason: reason || 'تغيير الحالة الإدارية من قبل مدير النظام'
    });
    res.json({ success: true, user: r.rows[0], message: newStatus ? 'تم تفعيل الحساب بنجاح' : 'تم إيقاف الحساب وتجميد الصلاحيات' });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/sector-users/:id', requireAdmin, async (req, res) => {
  try {
    // حماية آخر مدير نظام نشط من الحذف
    const target = await pool.query('SELECT role, is_active FROM sector_users WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    if (target.rows[0].role === 'ministry_admin' && target.rows[0].is_active) {
      const admins = await pool.query(
        `SELECT COUNT(*)::int n FROM sector_users WHERE role = 'ministry_admin' AND is_active = true AND deleted_at IS NULL`);
      if (admins.rows[0].n <= 1)
        return res.status(409).json({
          error: 'لا يمكن حذف آخر مدير نظام نشط — يجب تزويد مدير آخر أولاً حفاظاً على استمرارية الإدارة',
          code: 'LAST_ADMIN_PROTECTED',
        });
    }
    const r = await pool.query(
      `UPDATE sector_users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    await auditLog('delete', 'sector_user', req.user?.id || 'system', { id: req.params.id });
    res.json({ success: true, message: 'تم حذف المستخدم ونقله للأرشيف' });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
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
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/notifications', async (req, res) => {
  try {
    const d = req.body;
    if (!d.recipient_id) return res.status(400).json({ error: 'recipient_id مطلوب' });
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
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
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
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE notifications SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, notification: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/notifications/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE notifications SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Audit Log API =====================

router.put('/api/notifications/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE notifications SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
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
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
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

// ===================== جلساتي (خدمة ذاتية) — أجهزتي ومواقعي =====================
router.get('/api/auth/my-sessions', async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'غير مصرح', code: 'UNAUTHORIZED' });
    const r = await pool.query(
      `SELECT id, login_at, logout_at, last_activity_at, is_active, ip_address,
              device_type, device_brand, browser, browser_version, os, os_version,
              country, region, city, risk_score, risk_flags
       FROM user_sessions WHERE user_id=$1 ORDER BY login_at DESC LIMIT 30`, [req.user.sub]);
    res.json({ data: r.rows, current: req.user.sid });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// إبطال جلسة من مستخدمها (جهاز مفقود/مشتبه به)
router.post('/api/auth/my-sessions/:sid/revoke', async (req, res) => {
  try {
    if (!req.user?.sub) return res.status(401).json({ error: 'غير مصرح', code: 'UNAUTHORIZED' });
    const r = await pool.query(
      `UPDATE user_sessions SET is_active=false, logout_at=NOW(), revoked_by=$2, revoked_reason='self_revoke'
       WHERE id=$1 AND user_id=$3 AND is_active=true RETURNING id`,
      [req.params.sid, req.user.sub, req.user.sub]);
    if (!r.rows.length) return res.status(404).json({ error: 'الجلسة غير موجودة أو مغلقة مسبقاً', code: 'NOT_FOUND' });
    invalidateSessionCache(req.params.sid);
    await auditLog('SESSION_REVOKE_SELF', 'auth', req.user.sub, { session_id: req.params.sid });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== مركز التحكم بالجلسات — صلاحية وزارة/مدير نظام =====================
const ADMIN_ROLES = ['super_admin', 'ministry_admin'];
const adminGuard = (req, res) => {
  if (!req.user?.sub) { res.status(401).json({ error: 'غير مصرح', code: 'UNAUTHORIZED' }); return false; }
  if (!ADMIN_ROLES.includes(req.user.role)) { res.status(403).json({ error: 'صلاحية إدارية مطلوبة', code: 'FORBIDDEN' }); return false; }
  return true;
};

// الجلسات النشطة (والملغاة) بكل استخباراتها الجهازية والموقعية
router.get('/api/admin/sessions', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const { state, user_id, risk_min, search, limit = 50, offset = 0 } = req.query;
    const conds = []; const params = []; let i = 1;
    if (state === 'active') conds.push(`s.is_active = true`);
    if (state === 'closed') conds.push(`s.is_active = false`);
    if (user_id) { conds.push(`s.user_id = $${i++}`); params.push(user_id); }
    if (risk_min) { conds.push(`s.risk_score >= $${i++}`); params.push(Number(risk_min)); }
    if (search) {
      conds.push(`(u.email ILIKE $${i} OR s.ip_address ILIKE $${i} OR s.city ILIKE $${i} OR s.device_brand ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const total = await pool.query(
      `SELECT COUNT(*)::int AS c FROM user_sessions s LEFT JOIN sector_users u ON u.id = s.user_id ${where}`, params);
    const rows = await pool.query(
      `SELECT s.id, s.user_id, u.email, u.full_name, s.login_at, s.last_activity_at, s.is_active,
              s.ip_address, s.device_type, s.device_brand, s.browser, s.browser_version, s.os, s.os_version,
              s.country, s.region, s.city, s.language, s.timezone, s.risk_score, s.risk_flags,
              s.revoked_reason, s.revoked_by
       FROM user_sessions s LEFT JOIN sector_users u ON u.id = s.user_id
       ${where} ORDER BY s.login_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, Math.min(Number(limit) || 50, 200), Number(offset) || 0]);
    res.json({ data: rows.rows, total: total.rows[0].c });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// إبطال جلسة محددة — يسري خلال ثوانٍ عبر الكاش
router.post('/api/admin/sessions/:sid/revoke', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const reason = String(req.body?.reason || 'admin_revoke').slice(0, 200);
    const r = await pool.query(
      `UPDATE user_sessions SET is_active=false, logout_at=NOW(), revoked_by=$2, revoked_reason=$3
       WHERE id=$1 AND is_active=true RETURNING user_id`,
      [req.params.sid, req.user.sub, reason]);
    if (!r.rows.length) return res.status(404).json({ error: 'الجلسة غير موجودة أو مغلقة مسبقاً', code: 'NOT_FOUND' });
    invalidateSessionCache(req.params.sid);
    await auditLog('SESSION_REVOKE', 'auth', r.rows[0].user_id, { session_id: req.params.sid, reason, by: req.user.sub });
    res.json({ success: true, revoked: req.params.sid });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// إبطال كل جلسات مستخدم — قفل حساب فوري شامل
router.post('/api/admin/sessions/revoke-all', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id مطلوب', code: 'BAD_REQUEST' });
    const r = await pool.query(
      `UPDATE user_sessions SET is_active=false, logout_at=NOW(), revoked_by=$2, revoked_reason='admin_revoke_all'
       WHERE user_id=$1 AND is_active=true RETURNING id`,
      [user_id, req.user.sub]);
    r.rows.forEach(row => invalidateSessionCache(row.id));
    await auditLog('SESSION_REVOKE_ALL', 'auth', user_id, { count: r.rows.length, by: req.user.sub });
    res.json({ success: true, revoked_count: r.rows.length });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// سجل الأجهزة — هوية كل جهاز لدى المستخدمين مع حالة الثقة
router.get('/api/admin/devices', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const { user_id, search, limit = 50, offset = 0 } = req.query;
    const conds = []; const params = []; let i = 1;
    if (user_id) { conds.push(`d.user_id = $${i++}`); params.push(user_id); }
    if (search) {
      conds.push(`(u.email ILIKE $${i} OR d.label ILIKE $${i} OR d.fingerprint ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const total = await pool.query(
      `SELECT COUNT(*)::int AS c FROM device_registry d LEFT JOIN sector_users u ON u.id = d.user_id ${where}`, params);
    const rows = await pool.query(
      `SELECT d.*, u.email, u.full_name,
              (SELECT COUNT(*)::int FROM user_sessions s WHERE s.user_id = d.user_id AND s.device_fingerprint = d.fingerprint) AS sessions_count
       FROM device_registry d LEFT JOIN sector_users u ON u.id = d.user_id
       ${where} ORDER BY d.last_seen_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, Math.min(Number(limit) || 50, 200), Number(offset) || 0]);
    res.json({ data: rows.rows, total: total.rows[0].c });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// الوثوق بجهاز — يخفض مخاطر جلساته القادمة
router.post('/api/admin/devices/:id/trust', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const r = await pool.query(
      `UPDATE device_registry SET trusted=true WHERE id=$1 RETURNING user_id, fingerprint`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'غير موجود', code: 'NOT_FOUND' });
    await auditLog('DEVICE_TRUST', 'auth', r.rows[0].user_id, { fingerprint: r.rows[0].fingerprint, by: req.user.sub });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// إبطال جهاز — يمنع جلسات جديدة منه ويغلق جلساته النشطة
router.post('/api/admin/devices/:id/revoke', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const r = await pool.query(
      `UPDATE device_registry SET revoked=true, trusted=false WHERE id=$1 RETURNING user_id, fingerprint`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'غير موجود', code: 'NOT_FOUND' });
    const closed = await pool.query(
      `UPDATE user_sessions SET is_active=false, logout_at=NOW(), revoked_by=$2, revoked_reason='device_revoked'
       WHERE user_id=$1 AND device_fingerprint=$3 AND is_active=true RETURNING id`,
      [r.rows[0].user_id, req.user.sub, r.rows[0].fingerprint]);
    closed.rows.forEach(row => invalidateSessionCache(row.id));
    await auditLog('DEVICE_REVOKE', 'auth', r.rows[0].user_id, { fingerprint: r.rows[0].fingerprint, by: req.user.sub, closed_sessions: closed.rows.length });
    res.json({ success: true, closed_sessions: closed.rows.length });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== Push Notifications =====================
// تتبع الأثر — سجل التدقيق مقروناً بجهاز وموقع الجلسة المصدر
router.get('/api/admin/activity-trail', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const { user_id, limit = 50, offset = 0 } = req.query;
    const conds = []; const params = []; let i = 1;
    if (user_id) { conds.push(`al.actor_id = $${i++}`); params.push(user_id); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const total = await pool.query(`SELECT COUNT(*)::int AS c FROM audit_log al ${where}`, params);
    const rows = await pool.query(
      `SELECT al.id, al.action, al.table_name, al.record_id, al.actor_id, al.actor_email, al.actor_role,
              al.notes, al.created_at, al.ip_address, al.user_agent, al.session_id,
              s.device_type, s.device_brand, s.browser, s.os, s.country, s.region, s.city, s.risk_score, s.risk_flags
       FROM audit_log al
       LEFT JOIN user_sessions s ON s.id::text = al.session_id
       ${where} ORDER BY al.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, Math.min(Number(limit) || 50, 200), Number(offset) || 0]);
    res.json({ data: rows.rows, total: total.rows[0].c });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// لوحة إحصاءات الرقابة الجهازية — نظرة قيادية فورية
router.get('/api/admin/session-stats', async (req, res) => {
  if (!adminGuard(req, res)) return;
  try {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM user_sessions WHERE is_active=true) AS active_sessions,
        (SELECT COUNT(*)::int FROM user_sessions WHERE is_active=true AND risk_score >= 5) AS high_risk_active,
        (SELECT COUNT(*)::int FROM user_sessions WHERE login_at > NOW() - INTERVAL '24 hours') AS logins_24h,
        (SELECT COUNT(*)::int FROM device_registry WHERE revoked=true) AS revoked_devices,
        (SELECT COUNT(*)::int FROM device_registry WHERE trusted=true) AS trusted_devices,
        (SELECT COUNT(*)::int FROM user_sessions WHERE risk_flags::text LIKE '%impossible_travel%' AND login_at > NOW() - INTERVAL '7 days') AS impossible_travel_7d,
        (SELECT COUNT(DISTINCT country)::int FROM user_sessions WHERE country IS NOT NULL AND login_at > NOW() - INTERVAL '30 days') AS countries_30d`);
    const geo = await pool.query(`
      SELECT COALESCE(country,'?') AS country, COUNT(*)::int AS sessions
      FROM user_sessions WHERE login_at > NOW() - INTERVAL '30 days'
      GROUP BY country ORDER BY sessions DESC LIMIT 10`);
    res.json({ ...r.rows[0], top_countries: geo.rows });
  } catch { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});
// ===================== Push Notifications (routes) =====================
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
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
