// server/routes/nationalDirectoryWorkflows.js
// APIs مؤسسية متقدمة للأدلة الوطنية �" Workflows + KPIs + التقارير
import { pool } from '../middleware/shared.js';
import express from 'express';

const router = express.Router();

// ==================== 1) Workflows CRUD ====================

// إنشاء طلب تغيير جديد (مع تقييم أثر تلقائي + SLA)
router.post('/api/national-directory-workflows', async (req, res) => {
  try {
    const {
      directory_type, record_code, change_type, change_payload,
      priority = 'normal', change_reason, submitted_by
    } = req.body || {};

    if (!directory_type || !record_code || !change_type || !change_reason) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    // الحصول على إعدادات SLA
    const slaConfig = await pool.query(
      `SELECT sla_hours FROM directory_sla_config
       WHERE directory_type = $1 AND change_type = $2 AND priority = $3 AND is_active = TRUE`,
      [directory_type, change_type, priority]
    );
    const slaHours = slaConfig.rows[0]?.sla_hours || 24;
    const slaDeadline = new Date(Date.now() + slaHours * 3600000);

    // إدراج الـ workflow
    const r = await pool.query(
      `INSERT INTO directory_change_workflows
         (directory_type, record_code, change_type, change_payload, priority,
          change_reason, submitted_by, sla_deadline, current_state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
       RETURNING *`,
      [directory_type, record_code, change_type, JSON.stringify(change_payload || {}),
       priority, change_reason, submitted_by || req.user?.id, slaDeadline]
    );

    res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('Create workflow error:', err);
    res.status(500).json({ error: 'خطأ في إنشاء طلب التغيير' });
  }
});

// جلب جميع الـ workflows مع فلترة
router.get('/api/national-directory-workflows', async (req, res) => {
  try {
    const {
      state, directory_type, priority, page = 1, page_size = 20,
      sort_by = 'submitted_at', sort_dir = 'desc'
    } = req.query;

    let where = ['1=1'];
    const params = [];
    let idx = 1;
    if (state) { where.push(`current_state = $${idx++}`); params.push(state); }
    if (directory_type) { where.push(`directory_type = $${idx++}`); params.push(directory_type); }
    if (priority) { where.push(`priority = $${idx++}`); params.push(priority); }

    const countR = await pool.query(
      `SELECT COUNT(*)::int as total FROM directory_change_workflows WHERE ${where.join(' AND ')}`,
      params
    );
    const total = countR.rows[0]?.total || 0;
    const offset = (Number(page) - 1) * Number(page_size);

    const validSorts = ['submitted_at', 'impact_score', 'priority', 'sla_deadline'];
    const sortCol = validSorts.includes(sort_by) ? sort_by : 'submitted_at';
    const sortDirection = sort_dir === 'asc' ? 'ASC' : 'DESC';

    params.push(Number(page_size), offset);
    const r = await pool.query(
      `SELECT w.*,
              ia.overall_impact, ia.affected_persons_count, ia.affected_entities_count
       FROM directory_change_workflows w
       LEFT JOIN directory_impact_assessments ia ON w.id = ia.workflow_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${sortCol} ${sortDirection}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({ data: r.rows, total, page: Number(page), page_size: Number(page_size) });
  } catch (err) {
    console.error('List workflows error:', err);
    res.status(500).json({ error: 'خطأ في جلب طلبات التغيير' });
  }
});

// جلب workflow واحد بالتفاصيل
router.get('/api/national-directory-workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [wf, approvals, impact, audit] = await Promise.all([
      pool.query(`SELECT * FROM directory_change_workflows WHERE id = $1`, [id]),
      pool.query(`SELECT * FROM directory_change_approvals WHERE workflow_id = $1 ORDER BY approval_level`, [id]),
      pool.query(`SELECT * FROM directory_impact_assessments WHERE workflow_id = $1`, [id]),
      pool.query(`SELECT * FROM directory_audit_trail WHERE workflow_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]),
    ]);
    if (wf.rows.length === 0) return res.status(404).json({ error: 'الطلب غير موجود' });

    res.json({
      data: {
        workflow: wf.rows[0],
        approvals: approvals.rows,
        impact: impact.rows[0] || null,
        audit_trail: audit.rows,
      }
    });
  } catch (err) {
    console.error('Get workflow error:', err);
    res.status(500).json({ error: 'خطأ في جلب الطلب' });
  }
});

// ==================== 2) إجراءات الـ Workflow ====================

// تقديم الطلب للمراجعة
router.post('/api/national-directory-workflows/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const r = await pool.query(
      `UPDATE directory_change_workflows
       SET current_state = 'submitted', submitted_by = $2, submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND current_state = 'draft'
       RETURNING *`,
      [id, userId]
    );
    if (r.rows.length === 0) return res.status(400).json({ error: 'لا يمكن تقديم هذا الطلب' });

    res.json({ data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تقديم الطلب' });
  }
});

// مراجعة الأثر المؤسسي
router.post('/api/national-directory-workflows/:id/review-impact', async (req, res) => {
  try {
    const { id } = req.params;
    const { impact_notes, recommendations } = req.body || {};

    // إعادة حساب الأثر
    await pool.query(`SELECT calculate_directory_impact($1)`, [id]);

    const r = await pool.query(
      `UPDATE directory_change_workflows
       SET current_state = 'impact_review', impact_reviewer = $2, impact_reviewed_at = NOW(), updated_at = NOW(),
           notes = COALESCE(notes || E'\n' || $3, notes)
       WHERE id = $1 AND current_state = 'submitted'
       RETURNING *`,
      [id, req.user?.id || null, impact_notes || '']
    );
    if (r.rows.length === 0) return res.status(400).json({ error: 'لا يمكن مراجعة هذا الطلب' });

    res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('Review impact error:', err);
    res.status(500).json({ error: 'خطأ في مراجعة الأثر' });
  }
});

// اعتماد / رفض الطلب
router.post('/api/national-directory-workflows/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes, approval_level = 1 } = req.body || {};

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'قرار غير صالح' });
    }

    if (decision === 'rejected') {
      const r = await pool.query(
        `UPDATE directory_change_workflows
         SET current_state = 'rejected', approver_id = $2, approved_at = NOW(),
             rejection_reason = $3, updated_at = NOW()
         WHERE id = $1 AND current_state IN ('impact_review', 'pending_approval')
         RETURNING *`,
        [id, req.user?.id || null, notes || '']
      );
      if (r.rows.length === 0) return res.status(400).json({ error: 'لا يمكن رفض هذا الطلب' });
      return res.json({ data: r.rows[0] });
    }

    // تحديث سجل الموافقة
    await pool.query(
      `INSERT INTO directory_change_approvals (workflow_id, approval_level, approver_role, approver_id, decision, decision_at, decision_notes)
       VALUES ($1, $2, 'ministry_admin', $3, 'approved', NOW(), $4)
       ON CONFLICT (workflow_id, approval_level) DO UPDATE SET decision = 'approved', decision_at = NOW()`,
      [id, approval_level, req.user?.id || null, notes || '']
    );

    // الانتقال للحالة التالية
    const r = await pool.query(
      `UPDATE directory_change_workflows
       SET current_state = 'approved', approver_id = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND current_state IN ('impact_review', 'pending_approval')
       RETURNING *`,
      [id, req.user?.id || null]
    );
    if (r.rows.length === 0) return res.status(400).json({ error: 'لا يمكن اعتماد هذا الطلب' });

    res.json({ data: r.rows[0] });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'خطأ في اعتماد الطلب' });
  }
});

// نشر التغيير (تنفيذه فعلياً)
router.post('/api/national-directory-workflows/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // الحصول على بيانات الـ workflow
      const wfR = await client.query(`SELECT * FROM directory_change_workflows WHERE id = $1`, [id]);
      if (wfR.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'غير موجود' });
      }
      const wf = wfR.rows[0];

      if (wf.current_state !== 'approved') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'الطلب غير معتمد' });
      }

      // تنفيذ التغيير الفعلي
      if (wf.change_type === 'update' && wf.change_payload) {
        const payload = wf.change_payload;
        await client.query(
          `UPDATE national_directories
           SET name_ar = COALESCE($1, name_ar), name_en = COALESCE($2, name_en),
               sort_order = COALESCE($3, sort_order), updated_at = NOW()
           WHERE directory_type = $4 AND code = $5`,
          [payload.name_ar, payload.name_en, payload.sort_order, wf.directory_type, wf.record_code]
        );
      } else if (wf.change_type === 'deactivate') {
        await client.query(
          `UPDATE national_directories SET is_active = FALSE, updated_at = NOW()
           WHERE directory_type = $1 AND code = $2`,
          [wf.directory_type, wf.record_code]
        );
      }

      // تحديث حالة الـ workflow
      await client.query(
        `UPDATE directory_change_workflows
         SET current_state = 'published', publisher_id = $2, published_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id, req.user?.id || null]
      );

      await client.query('COMMIT');
      res.json({ data: { success: true, workflow_id: id } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'خطأ في نشر التغيير' });
  }
});

// التراجع عن طلب
router.post('/api/national-directory-workflows/:id/rollback', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE directory_change_workflows
       SET current_state = 'rolled_back', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1 AND current_state NOT IN ('published', 'rolled_back')
       RETURNING *`,
      [id, req.body?.reason || 'تم التراجع من قبل المستخدم']
    );
    if (r.rows.length === 0) return res.status(400).json({ error: 'لا يمكن التراجع عن هذا الطلب' });
    res.json({ data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التراجع' });
  }
});

// ==================== 3) APIs مؤشرات الأداء (KPIs) ====================

// لوحة KPIs
router.get('/api/national-directory-workflows/kpi', async (req, res) => {
  try {
    const [kpi, byType, byState, byPriority, slaReport] = await Promise.all([
      pool.query(`SELECT * FROM v_directory_workflow_kpi`),
      pool.query(
        `SELECT directory_type, COUNT(*)::int as count,
                COUNT(*) FILTER (WHERE current_state = 'published')::int as published
         FROM directory_change_workflows
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY directory_type ORDER BY count DESC`
      ),
      pool.query(
        `SELECT current_state, COUNT(*)::int as count
         FROM directory_change_workflows
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY current_state ORDER BY count DESC`
      ),
      pool.query(
        `SELECT priority, COUNT(*)::int as count
         FROM directory_change_workflows
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY priority ORDER BY count DESC`
      ),
      pool.query(
        `SELECT
           COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE sla_breached = TRUE)::int as breached,
           ROUND(COUNT(*) FILTER (WHERE sla_breached = TRUE)::numeric / NULLIF(COUNT(*),0) * 100, 1) as breach_rate,
           ROUND(AVG(EXTRACT(EPOCH FROM (sla_deadline - submitted_at)) / 3600), 1) as avg_hours_remaining
         FROM directory_change_workflows
         WHERE submitted_at >= NOW() - INTERVAL '30 days' AND current_state NOT IN ('draft')`
      ),
    ]);

    res.json({
      data: {
        overview: kpi.rows[0] || {},
        by_directory_type: byType.rows,
        by_state: byState.rows,
        by_priority: byPriority.rows,
        sla: slaReport.rows[0] || {},
      }
    });
  } catch (err) {
    console.error('KPI error:', err);
    res.status(500).json({ error: 'خطأ في جلب مؤشرات الأداء' });
  }
});

// الـ workflows النشطة (لوحة المتابعة)
router.get('/api/national-directory-workflows/active', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM v_active_workflows LIMIT 50`);
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات النشطة' });
  }
});

// تنبيهات SLA
router.get('/api/national-directory-workflows/sla-alerts', async (req, res) => {
  try {
    const { severity } = req.query;
    let where = '1=1';
    const params = [];
    if (severity) { where += ' AND severity = $1'; params.push(severity); }

    const r = await pool.query(
      `SELECT sa.*, w.directory_type, w.record_code, w.current_state, w.sla_deadline
       FROM directory_sla_alerts sa
       JOIN directory_change_workflows w ON sa.workflow_id = w.id
       WHERE ${where} AND sa.acknowledged_at IS NULL
       ORDER BY sa.created_at DESC LIMIT 50`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب التنبيهات' });
  }
});

// تأكيد استلام تنبيه
router.post('/api/national-directory-workflows/sla-alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `UPDATE directory_sla_alerts
       SET acknowledged_at = NOW(), acknowledged_by = $2
       WHERE id = $1 RETURNING *`,
      [id, req.user?.id || null]
    );
    res.json({ data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تأكيد التنبيه' });
  }
});

// ==================== 4) APIs التقارير ====================

// تقرير شامل للمدير
router.get('/api/national-directory-workflows/report/full', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const where = [];
    const params = [];
    let idx = 1;
    if (from_date) { where.push(`w.created_at >= $${idx++}`); params.push(from_date); }
    if (to_date) { where.push(`w.created_at <= $${idx++}`); params.push(to_date); }
    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const r = await pool.query(
      `SELECT
         w.id, w.directory_type, w.record_code, w.change_type, w.current_state,
         w.priority, w.impact_score, w.created_at, w.submitted_at, w.approved_at, w.published_at,
         ia.overall_impact, ia.affected_persons_count, ia.affected_entities_count, ia.affected_contracts_count,
         EXTRACT(EPOCH FROM (COALESCE(w.approved_at, NOW()) - w.submitted_at)) / 3600 as hours_to_approve,
         EXTRACT(EPOCH FROM (COALESCE(w.published_at, NOW()) - w.submitted_at)) / 3600 as hours_to_publish
       FROM directory_change_workflows w
       LEFT JOIN directory_impact_assessments ia ON w.id = ia.workflow_id
       ${whereStr}
       ORDER BY w.created_at DESC`,
      params
    );

    res.json({ data: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'خطأ في جلب التقرير' });
  }
});

// تصدير تقرير Excel
router.get('/api/national-directory-workflows/report/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    // يتم تصديره كـ JSON; يمكن تحويله لـ CSV/XLSX على العميل
    const r = await pool.query(
      `SELECT w.*, ia.overall_impact, ia.affected_persons_count, ia.affected_entities_count
       FROM directory_change_workflows w
       LEFT JOIN directory_impact_assessments ia ON w.id = ia.workflow_id
       WHERE w.created_at >= NOW() - INTERVAL '90 days'
       ORDER BY w.created_at DESC`
    );

    if (format === 'csv') {
      if (r.rows.length === 0) return res.status(404).json({ error: 'لا توجد بيانات' });
      const headers = Object.keys(r.rows[0]).join(',');
      const rows = r.rows.map(row => Object.values(row).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=workflow-report.csv');
      return res.send(headers + '\n' + rows);
    }

    res.json({ data: r.rows, total: r.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التصدير' });
  }
});

export default router;
