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
      service: 'UnionSphere Enterprise Ministry Core API',
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

// ===================== Auth Endpoints =====================
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    const r = await pool.query(
      'SELECT * FROM sector_users WHERE email = $1 AND deleted_at IS NULL AND is_active = true',
      [String(email).toLowerCase().trim()]
    );
    if (r.rows.length === 0) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    const u = r.rows[0];
    if (!verifyPassword(password, u.salt, u.password_hash)) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    await pool.query('UPDATE sector_users SET last_login = NOW() WHERE id = $1', [u.id]);
    const token = signToken({ sub: u.id, email: u.email, role: u.role, userType: u.user_type, organizationId: u.organization_id });
    await auditLog('login', 'auth', u.id, { email: u.email });
    res.json({
      success: true,
      token,
      user: { id: u.id, email: u.email, name: u.name, role: u.role, userType: u.user_type, organizationId: u.organization_id },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    res.status(500).json({ error: e.message });
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
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/api/sector-users/:id/toggle-status', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const current = await pool.query('SELECT is_active, email, name FROM sector_users WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/api/sector-users/:id', requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE sector_users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    await auditLog('delete', 'sector_user', req.user?.id || 'system', { id: req.params.id });
    res.json({ success: true, message: 'تم حذف المستخدم ونقله للأرشيف' });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    if (resource_type) { conditions.push(`al.resource_type = $${idx++}`); params.push(resource_type); }
    if (user_id) { conditions.push(`al.user_id = $${idx++}`); params.push(user_id); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wc = conditions.length ? conditions.join(' AND ') : '';
    const { sql: _qs, params: _qp } = countQuery('audit_log al', wc, params);

    const rows = (await pool.query(
      `SELECT al.*, p.name as user_name, p.email as user_email FROM audit_log al
       LEFT JOIN profiles p ON al.user_id = p.id
       ${where} ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )).rows;
    res.json({ data: rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
