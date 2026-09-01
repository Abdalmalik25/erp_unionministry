import '../lib/loadEnv.js';
import express from 'express';
import crypto from 'crypto';
import { pool, paginate } from '../middleware/shared.js';
import { hashPassword } from '../middleware/auth.js';
import { invalidateCache } from '../middleware/cache.js';

const router = express.Router();

const AUTH_ENABLED = process.env.ENABLE_AUTH === 'true';
function requireAdmin(req, res, next) {
  if (!AUTH_ENABLED) return next();
  if (!req.user) return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
  if (req.user.role !== 'ministry_admin') return res.status(403).json({ error: 'صلاحية مدير النظام فقط' });
  next();
}

const REQUEST_TYPES = ['union', 'organization', 'worker', 'ministry_employee'];
const TYPE_LABEL = {
  union: 'حساب نقابة عمالية',
  organization: 'حساب منظمة',
  worker: 'حساب عامل',
  ministry_employee: 'حساب موظف وزارة',
};
const DEFAULT_ROLE = {
  union: 'union_president',
  organization: 'hr_officer',
  worker: 'worker',
  ministry_employee: 'registry_officer',
};

// ===== مدققات المدخلات المؤسسية =====
const RE_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const RE_PHONE_YE = /^(\+?967|0)?7\d{8}$/; // أرقام اليمن المحمولة
const RE_NATIONAL_ID = /^[1-9]\d{8,11}$/; // رقم قومي/شخصي رقمي 9–12 خانة
function validateRequest(d) {
  if (!REQUEST_TYPES.includes(d.request_type)) return 'نوع الطلب غير صحيح';
  const name = String(d.full_name || '').trim();
  if (name.length < 3 || name.length > 120) return 'الاسم الكامل مطلوب (3–120 حرفاً)';
  if (/[\u0640]/.test(name)) return 'الاسم لا يقبل التطويل';
  if (d.email) {
    if (!RE_EMAIL.test(String(d.email).trim())) return 'صيغة البريد الإلكتروني غير صحيحة';
    if (String(d.email).length > 160) return 'البريد الإلكتروني طويل جداً';
  }
  if (d.phone && !RE_PHONE_YE.test(String(d.phone).replace(/[\s-]/g, ''))) return 'رقم الهاتف اليمني غير صحيح (مثال: 771234567)';
  if (d.national_id && !RE_NATIONAL_ID.test(String(d.national_id).trim())) return 'الرقم القومي يجب أن يكون أرقاماً (9–12 خانة)';
  if (d.entity_name && String(d.entity_name).trim().length > 200) return 'اسم الجهة طويل جداً';
  return null;
}

// ===================== طلبات فتح الحسابات =====================

// تقديم طلب — عام (من شاشة الدخول)
router.post('/api/account-requests', async (req, res) => {
  try {
    const d = req.body || {};
    const validationError = validateRequest(d);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!d.email?.trim() && !d.phone?.trim()) return res.status(400).json({ error: 'البريد الإلكتروني أو الهاتف مطلوب للتواصل' });

    // منع تكرار طلب معلق لنفس البريد
    if (d.email?.trim()) {
      const dup = await pool.query(
        `SELECT id FROM account_requests WHERE deleted_at IS NULL AND status='under_review'
         AND lower(email)=lower($1) AND request_type=$2`, [d.email.trim(), d.request_type]);
      if (dup.rows.length) return res.status(409).json({ error: 'يوجد طلب معلق بنفس البريد — قيد المراجعة' });
    }
    const r = await pool.query(
      `INSERT INTO account_requests
        (request_type, full_name, email, phone, national_id, entity_id, entity_name, governorate, requested_role, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [d.request_type, d.full_name.trim(), d.email?.trim() || null, d.phone?.trim() || null,
       d.national_id?.trim() || null, d.entity_id || null, d.entity_name?.trim() || null,
       d.governorate?.trim() || null, d.requested_role || null,
       JSON.stringify({ source: 'login_portal', user_agent: (req.headers['user-agent'] || '').slice(0, 250) })]
    );
    res.status(201).json({
      success: true,
      data: { id: r.rows[0].id, type_label: TYPE_LABEL[d.request_type] },
      message: 'تم استلام طلب فتح الحساب — سيتم التواصل معك بعد المراجعة',
    });
    invalidateCache('dashboard');
  } catch (err) {
    console.error('Account request error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// قائمة الطلبات — للمدير
router.get('/api/account-requests', requireAdmin, async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { status, request_type } = req.query;
    const conds = ['ar.deleted_at IS NULL'];
    const params = [];
    let i = 1;
    if (status) { conds.push(`ar.status = $${i++}`); params.push(status); }
    if (request_type) { conds.push(`ar.request_type = $${i++}`); params.push(request_type); }
    const where = 'WHERE ' + conds.join(' AND ');
    const total = await pool.query(`SELECT COUNT(*)::int n FROM account_requests ar ${where}`, params);
    const rows = await pool.query(
      `SELECT ar.*, ru.name AS reviewer_name, cu.name AS created_user_name
       FROM account_requests ar
       LEFT JOIN sector_users ru ON ru.id = ar.reviewed_by
       LEFT JOIN sector_users cu ON cu.id = ar.created_user_id
       ${where} ORDER BY ar.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, limit, offset]);
    res.json({ data: rows.rows, total: total.rows[0].n, page, limit });
  } catch (err) {
    console.error('Account requests list error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// اعتماد الطلب → إنشاء حساب فعلي بكلمة مرور مؤقتة
router.patch('/api/account-requests/:id/approve', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rq = await client.query(
      `SELECT * FROM account_requests WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, [req.params.id]);
    if (!rq.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'الطلب غير موجود' }); }
    const reqRow = rq.rows[0];
    if (reqRow.status !== 'under_review') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'الطلب تمت معالجته مسبقاً' }); }

    const email = reqRow.email?.toLowerCase().trim();
    if (!email) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'لا يمكن الاعتماد بدون بريد إلكتروني للحساب' }); }
    const exists = await client.query(`SELECT 1 FROM sector_users WHERE lower(email)=$1 AND deleted_at IS NULL`, [email]);
    if (exists.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'البريد مستخدم بحساب آخر' }); }

    // كلمة مرور مؤقتة آمنة (تُعرض مرة واحدة)
    const tempPassword = crypto.randomBytes(6).toString('base64url').slice(0, 10) + '!7';
    const { salt, hash } = hashPassword(tempPassword);
    const role = DEFAULT_ROLE[reqRow.request_type];
    const cu = await client.query(
      `INSERT INTO sector_users (name, email, role, user_type, password_hash, salt, organization_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
      [reqRow.full_name, email, role,
       reqRow.request_type === 'ministry_employee' ? 'ministry' : 'entity',
       hash, salt, reqRow.entity_id || null]);

    await client.query(
      `UPDATE account_requests SET status='approved', reviewed_by=$1, reviewed_at=NOW(),
        created_user_id=$2, updated_at=NOW() WHERE id=$3`,
      [req.user?.id || null, cu.rows[0].id, reqRow.id]);
    await client.query('COMMIT');

    res.json({
      success: true,
      data: { user_id: cu.rows[0].id, email, temp_password: tempPassword, role },
      message: `تم اعتماد الطلب وإنشاء حساب ${TYPE_LABEL[reqRow.request_type]}`,
    });
    invalidateCache('dashboard');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Approve request error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

// رفض الطلب
router.patch('/api/account-requests/:id/reject', requireAdmin, async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'سبب الرفض مطلوب' });
    const r = await pool.query(
      `UPDATE account_requests SET status='rejected', rejection_reason=$1,
        reviewed_by=$2, reviewed_at=NOW(), updated_at=NOW()
       WHERE id=$3 AND deleted_at IS NULL AND status='under_review' RETURNING *`,
      [reason, req.user?.id || null, req.params.id]);
    if (!r.rows.length) return res.status(409).json({ error: 'الطلب غير موجود أو تمت معالجته' });
    res.json({ success: true, message: 'تم رفض الطلب وتوثيق السبب' });
    invalidateCache('dashboard');
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ===================== جلسات العمل والمتابعة الحية =====================

// من على الخط الآن
router.get('/api/admin/sessions/active', requireAdmin, async (_req, res) => {
  try {
    const rows = await pool.query(`
      SELECT s.id, s.user_id, s.login_at, s.last_activity_at,
             EXTRACT(EPOCH FROM (NOW() - s.login_at))::bigint AS duration_seconds,
             u.name, u.email, u.role, u.user_type,
             CASE WHEN s.last_activity_at > NOW() - INTERVAL '5 minutes' THEN true ELSE false END AS online_now
      FROM user_sessions s JOIN sector_users u ON u.id = s.user_id
      WHERE s.is_active = true
      ORDER BY s.login_at DESC LIMIT 100`);
    res.json({ data: rows.rows });
  } catch (err) {
    console.error('Active sessions error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// تاريخ جلسات مستخدم + إجمالي وقته في النظام
router.get('/api/admin/users/:id/sessions', requireAdmin, async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const total = await pool.query(`SELECT COUNT(*)::int n FROM user_sessions WHERE user_id=$1`, [req.params.id]);
    const rows = await pool.query(`
      SELECT id, login_at, logout_at, last_activity_at, ip_address, is_active,
             EXTRACT(EPOCH FROM (COALESCE(logout_at, NOW()) - login_at))::bigint AS duration_seconds
      FROM user_sessions WHERE user_id=$1 ORDER BY login_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]);
    const agg = await pool.query(`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (logout_at - login_at))),0)::bigint AS total_seconds,
             COUNT(*)::int AS sessions_count
      FROM user_sessions WHERE user_id=$1 AND logout_at IS NOT NULL`, [req.params.id]);
    res.json({ data: rows.rows, total: total.rows[0].n, page, limit, summary: agg.rows[0] });
  } catch (err) {
    console.error('User sessions error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ===================== محاولات الدخول =====================

router.get('/api/admin/login-attempts', requireAdmin, async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { success, email } = req.query;
    const conds = ['1=1'];
    const params = [];
    let i = 1;
    if (success === 'false') { conds.push(`success = false`); }
    else if (success === 'true') { conds.push(`success = true`); }
    if (email) { conds.push(`email_attempted ILIKE $${i++}`); params.push(`%${email}%`); }
    const where = 'WHERE ' + conds.join(' AND ');
    const total = await pool.query(`SELECT COUNT(*)::int n FROM login_attempts ${where}`, params);
    const rows = await pool.query(
      `SELECT la.*, u.name AS resolved_user_name
       FROM login_attempts la LEFT JOIN sector_users u ON u.id = la.user_id
       ${where} ORDER BY la.attempted_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, limit, offset]);
    const stats = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE NOT success AND attempted_at > NOW() - INTERVAL '24 hours')::int AS failed_24h,
             COUNT(*) FILTER (WHERE success AND attempted_at > NOW() - INTERVAL '24 hours')::int AS ok_24h
      FROM login_attempts`);
    res.json({ data: rows.rows, total: total.rows[0].n, page, limit, stats: stats.rows[0] });
  } catch (err) {
    console.error('Login attempts error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

export default router;
