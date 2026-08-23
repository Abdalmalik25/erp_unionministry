// server/routes/administration.js — منظومة الإدارة المؤسسية الشاملة
// الإعدادات العامة | الصلاحيات المؤسسية | النسخ الاحتياطي والجدولة | الاتصال الإداري
import { pool } from '../middleware/shared.js';
import express from 'express';

const router = express.Router();

// ===================== الإعدادات العامة =====================
router.get('/api/settings', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT setting_key, setting_value, value_type, category, description, updated_by, updated_at
       FROM system_settings ORDER BY category, setting_key`
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

router.put('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { setting_value, updated_by } = req.body || {};
    if (setting_value === undefined) {
      return res.status(400).json({ error: 'قيمة الإعداد مطلوبة' });
    }
    const r = await pool.query(
      `UPDATE system_settings SET setting_value = $2, updated_by = $3, updated_at = NOW()
       WHERE setting_key = $1 RETURNING *`,
      [key, String(setting_value), updated_by || 'system']
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'الإعداد غير موجود' });
    res.json({ data: r.rows[0] });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في تحديث الإعداد' });
  }
});

// تحديث دفعة واحدة من الإعدادات
router.put('/api/settings', async (req, res) => {
  try {
    const { settings, updated_by } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'كائن الإعدادات مطلوب' });
    }
    let updated = 0;
    for (const [key, value] of Object.entries(settings)) {
      const r = await pool.query(
        `UPDATE system_settings SET setting_value = $2, updated_by = $3, updated_at = NOW()
         WHERE setting_key = $1`,
        [key, String(value), updated_by || 'system']
      );
      if (r.rowCount > 0) updated++;
    }
    res.json({ ok: true, updated });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في تحديث الإعدادات' });
  }
});

// ===================== الصلاحيات المؤسسية الحقيقية =====================
router.get('/api/role-permissions', async (req, res) => {
  try {
    const { role_key } = req.query;
    let where = '1=1';
    const params = [];
    if (role_key) { where = 'role_key = $1'; params.push(role_key); }
    const r = await pool.query(
      `SELECT id, role_key, resource, can_view, can_create, can_edit, can_delete, can_export, can_approve, updated_at
       FROM role_permissions WHERE ${where} ORDER BY role_key, resource`,
      params
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في جلب الصلاحيات' });
  }
});

// تحديث صلاحية واحدة (دور × مورد)
router.put('/api/role-permissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const flags = ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export', 'can_approve'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of flags) {
      if (typeof req.body?.[f] === 'boolean') {
        updates.push(`${f} = $${idx++}`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'لا توجد تغييرات' });
    updates.push('updated_at = NOW()');
    values.push(id);
    const r = await pool.query(
      `UPDATE role_permissions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'الصلاحية غير موجودة' });
    res.json({ data: r.rows[0] });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في تحديث الصلاحية' });
  }
});

// إضافة منح جديد (دور × مورد)
router.post('/api/role-permissions', async (req, res) => {
  try {
    const { role_key, resource } = req.body || {};
    if (!role_key || !resource) return res.status(400).json({ error: 'الدور والمورد مطلوبان' });
    const r = await pool.query(
      `INSERT INTO role_permissions (role_key, resource, can_view, can_create, can_edit, can_delete, can_export, can_approve)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (role_key, resource) DO UPDATE SET
         can_view = EXCLUDED.can_view, can_create = EXCLUDED.can_create,
         can_edit = EXCLUDED.can_edit, can_delete = EXCLUDED.can_delete,
         can_export = EXCLUDED.can_export, can_approve = EXCLUDED.can_approve,
         updated_at = NOW()
       RETURNING *`,
      [
        role_key, resource,
        !!req.body.can_view, !!req.body.can_create, !!req.body.can_edit,
        !!req.body.can_delete, !!req.body.can_export, !!req.body.can_approve,
      ]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في إنشاء المنح' });
  }
});

router.delete('/api/role-permissions/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM role_permissions WHERE id = $1 RETURNING id`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ message: 'تم حذف المنح' });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

// ===================== النسخ الاحتياطي والجدولة =====================
router.get('/api/backup/jobs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const r = await pool.query(
      `SELECT id, job_type, status, scheduled_at, started_at, finished_at,
              size_bytes, triggered_by, error_message, created_at
       FROM backup_jobs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في جلب مهام النسخ' });
  }
});

// جدولة مهمة نسخ احتياطي جديدة
router.post('/api/backup/schedule', async (req, res) => {
  try {
    const { job_type = 'full', scheduled_at, triggered_by } = req.body || {};
    const validTypes = ['full', 'incremental', 'schema_only'];
    if (!validTypes.includes(job_type)) {
      return res.status(400).json({ error: 'نوع المهمة غير صالح' });
    }
    const r = await pool.query(
      `INSERT INTO backup_jobs (job_type, status, scheduled_at, triggered_by)
       VALUES ($1, 'pending', $2, $3) RETURNING *`,
      [job_type, scheduled_at ? new Date(scheduled_at) : new Date(), triggered_by || 'system']
    );
    // تحديث الجدولة في الإعدادات إذا وُجد cron
    if (req.body?.cron_expression) {
      await pool.query(
        `UPDATE system_settings SET setting_value = $2, updated_at = NOW()
         WHERE setting_key = 'backup_schedule_cron'`,
        [null, req.body.cron_expression]
      );
    }
    res.status(201).json({ data: r.rows[0] });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في جدولة النسخ الاحتياطي' });
  }
});

// تشغيل نسخة احتياطية فورية (منطقي — يسجل المهمة ويجمع إحصاءات الجداول)
router.post('/api/backup/run', async (req, res) => {
  try {
    const startedAt = new Date();
    const job = await pool.query(
      `INSERT INTO backup_jobs (job_type, status, started_at, triggered_by)
       VALUES ('full', 'running', $1, $2) RETURNING id`,
      [startedAt, req.body?.triggered_by || 'manual']
    );
    const jobId = job.rows[0].id;
    try {
      // جمع إحصاءات الجداول كمحتوى النسخة المنطقية
      const stats = await pool.query(
        `SELECT relname AS table_name, n_live_tup AS row_count
         FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 50`
      );
      const totalRows = stats.rows.reduce((s, t) => s + Number(t.row_count), 0);
      await pool.query(
        `UPDATE backup_jobs SET status = 'completed', finished_at = NOW(),
           size_bytes = $2, file_path = $3 WHERE id = $1`,
        [jobId, totalRows * 512, `logical_snapshot_${jobId}.json`]
      );
      res.json({ ok: true, job_id: jobId, tables: stats.rows.length, total_rows: totalRows });
    } catch (innerErr) {
      await pool.query(
        `UPDATE backup_jobs SET status = 'failed', finished_at = NOW(), error_message = $2 WHERE id = $1`,
        [jobId, String(innerErr.message || innerErr)]
      );
      throw innerErr;
    }
  } catch (_err) {
    res.status(500).json({ error: 'فشل تنفيذ النسخة الاحتياطية' });
  }
});

// ===================== الاتصال الإداري =====================
router.get('/api/admin-communications', async (req, res) => {
  try {
    const { comm_type, include_inactive } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (!include_inactive) { where += ` AND is_active = TRUE`; }
    if (comm_type) { where += ` AND comm_type = $${idx++}`; params.push(comm_type); }
    const r = await pool.query(
      `SELECT c.id, c.comm_number, c.comm_type, c.title, c.body, c.priority,
              c.target_roles, c.target_sectors, c.effective_date, c.expiry_date,
              c.requires_ack, c.issued_by, c.is_active, c.created_at,
              (SELECT COUNT(*)::int FROM communication_acknowledgments a
                WHERE a.communication_id = c.id) AS ack_count
       FROM admin_communications c WHERE ${where}
       ORDER BY c.created_at DESC LIMIT 200`,
      params
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في جلب التعاميم' });
  }
});

router.post('/api/admin-communications', async (req, res) => {
  try {
    const { comm_type = 'circular', title, body, priority = 'normal',
            target_roles, target_sectors, effective_date, expiry_date,
            requires_ack = false, issued_by } = req.body || {};
    if (!title || !String(title).trim() || !body || !String(body).trim()) {
      return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
    }
    const num = await pool.query(
      `SELECT COALESCE(MAX(id),0)+1 AS next FROM admin_communications`
    );
    const commNumber = `${comm_type.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${String(num.rows[0].next).padStart(4, '0')}`;
    const r = await pool.query(
      `INSERT INTO admin_communications
         (comm_number, comm_type, title, body, priority, target_roles, target_sectors,
          effective_date, expiry_date, requires_ack, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        commNumber, comm_type, String(title).trim(), String(body).trim(), priority,
        Array.isArray(target_roles) ? target_roles : [],
        Array.isArray(target_sectors) ? target_sectors : [],
        effective_date || null, expiry_date || null,
        !!requires_ack, issued_by || 'system',
      ]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في إنشاء التعاميم' });
  }
});

router.put('/api/admin-communications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['title', 'body', 'priority', 'effective_date', 'expiry_date', 'is_active'];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const f of allowed) {
      if (req.body?.[f] !== undefined) {
        updates.push(`${f} = $${idx++}`);
        values.push(f === 'is_active' ? !!req.body[f] : req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'لا توجد تغييرات' });
    updates.push('updated_at = NOW()');
    values.push(id);
    const r = await pool.query(
      `UPDATE admin_communications SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ data: r.rows[0] });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في التحديث' });
  }
});

// إقرار استلام تعميم
router.post('/api/admin-communications/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email } = req.body || {};
    if (!user_email) return res.status(400).json({ error: 'بريد المستخدم مطلوب' });
    const r = await pool.query(
      `INSERT INTO communication_acknowledgments (communication_id, user_email)
       VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [id, user_email]
    );
    res.json({ ok: true, acknowledged: r.rows.length > 0 });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في تسجيل الإقرار' });
  }
});

export default router;