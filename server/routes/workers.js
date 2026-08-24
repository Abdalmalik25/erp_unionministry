import { pool, paginate, countQuery, softDelete, softDeleteFilter, auditLog } from '../middleware/shared.js';
import express from 'express';

const router = express.Router();

// ===================== Members =====================
router.get('/api/members', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status, search } = req.query;
    let where = '1=1';
    where += softDeleteFilter('members', includeDeleted, 'm');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND m.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND m.status = $${idx++}`; params.push(status); }
    if (search) { where += ` AND (m.full_name ILIKE $${idx} OR m.national_id ILIKE $${idx} OR m.member_number ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    const { sql: _qs, params: _qp } = countQuery('members m', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT m.*, e.name_ar as entity_name, e.unified_code FROM members m
       JOIN organizational_entities e ON m.entity_id = e.entity_id
       WHERE ${where} ORDER BY m.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/members', async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id) return res.status(400).json({ error: 'entity_id مطلوب' });
    const cols = [
      'entity_id','national_id','full_name','gender','status','birth_date','nationality',
      'specialization','qualification','experience_years','workplace','mobile','email',
      'governorate','city','address','join_date','membership_type','membership_expiry',
      'subscription_amount','payment_status','last_payment_date','notes'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO members (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      values
    );
    res.status(201).json({ success: true, member: r.rows[0] });
  } catch (err) {
    console.error('Member create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/members/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', national_id:'national_id', full_name:'full_name', gender:'gender',
      status:'status', birth_date:'birth_date', nationality:'nationality',
      specialization:'specialization', qualification:'qualification',
      experience_years:'experience_years', workplace:'workplace', mobile:'mobile',
      email:'email', governorate:'governorate', city:'city', address:'address',
      join_date:'join_date', membership_type:'membership_type', membership_expiry:'membership_expiry',
      subscription_amount:'subscription_amount', payment_status:'payment_status',
      last_payment_date:'last_payment_date', notes:'notes'
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE members SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, member: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/members/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE members SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/members/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE members SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Worker Profiles =====================
router.get('/api/worker-profiles', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, status, search } = req.query;
    let where = '1=1';
    where += softDeleteFilter('worker_profiles', includeDeleted, 'worker_profiles');
    const params = [];
    let idx = 1;
    if (enterprise_id) { where += ` AND current_enterprise_id = $${idx++}`; params.push(enterprise_id); }
    if (status) { where += ` AND employment_status = $${idx++}`; params.push(status); }
    if (search) {
      where += ` AND (worker_profiles.national_number ILIKE $${idx} OR EXISTS (
        SELECT 1 FROM members sm WHERE sm.id = worker_profiles.member_id
        AND (sm.full_name ILIKE $${idx} OR sm.national_id ILIKE $${idx} OR sm.member_number ILIKE $${idx})))`;
      params.push(`%${search}%`);
      idx++;
    }
    const { sql: _qs, params: _qp } = countQuery('worker_profiles', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT worker_profiles.*, m.full_name AS worker_name, m.national_id AS person_national_id
       FROM worker_profiles
       LEFT JOIN members m ON m.id = worker_profiles.member_id
       WHERE ${where} ORDER BY worker_profiles.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    console.error('Worker profiles list error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/worker-profiles/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM worker_profiles WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/worker-profiles', async (req, res) => {
  try {
    const d = req.body;
    if (!d.member_id) return res.status(400).json({ error: 'member_id مطلوب' });
    const cols = [
      'member_id','current_enterprise_id','current_occupation_id','link_id',
      'employment_status','employment_start_date','employment_end_date','contract_type',
      'social_insurance_number','current_salary_grade','skills','certifications',
      'last_medical_check_date','next_medical_check_date','total_experience_years',
      'compliance_score','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO worker_profiles (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, profile: r.rows[0] });
  } catch (err) {
    console.error('Worker profile create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/worker-profiles/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      current_enterprise_id:'current_enterprise_id', current_occupation_id:'current_occupation_id',
      link_id:'link_id', employment_status:'employment_status',
      employment_start_date:'employment_start_date', employment_end_date:'employment_end_date',
      contract_type:'contract_type', social_insurance_number:'social_insurance_number',
      current_salary_grade:'current_salary_grade', skills:'skills',
      certifications:'certifications', last_medical_check_date:'last_medical_check_date',
      next_medical_check_date:'next_medical_check_date', total_experience_years:'total_experience_years',
      compliance_score:'compliance_score', notes:'notes', metadata:'metadata'
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE worker_profiles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, profile: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/worker-profiles/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE worker_profiles SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/worker-profiles/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE worker_profiles SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Worker Dispatches =====================
router.get('/api/dispatches', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { status, sending_enterprise_id } = req.query;
    let where = '1=1';
    where += softDeleteFilter('worker_dispatches', includeDeleted, 'worker_dispatches');
    const params = [];
    let idx = 1;
    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (sending_enterprise_id) { where += ` AND sending_enterprise_id = $${idx++}`; params.push(sending_enterprise_id); }
    const { sql: _qs, params: _qp } = countQuery('worker_dispatches', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM worker_dispatches WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/dispatches', async (req, res) => {
  try {
    const d = req.body;
    const cols = [
      'dispatch_number','sending_enterprise_id','sending_enterprise_name',
      'receiving_enterprise_id','receiving_enterprise_name','worker_name',
      'worker_national_id','dispatch_date','expected_return_date','purpose',
      'legal_basis','status','notes','safety_briefing_done','medical_clearance_done',
      'rejection_reason','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO worker_dispatches (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, dispatch: r.rows[0] });
  } catch (err) {
    console.error('Dispatch create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/dispatches/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      dispatch_number:'dispatch_number', sending_enterprise_id:'sending_enterprise_id',
      sending_enterprise_name:'sending_enterprise_name',
      receiving_enterprise_id:'receiving_enterprise_id',
      receiving_enterprise_name:'receiving_enterprise_name', worker_name:'worker_name',
      worker_national_id:'worker_national_id', dispatch_date:'dispatch_date',
      expected_return_date:'expected_return_date', purpose:'purpose',
      legal_basis:'legal_basis', status:'status', notes:'notes',
      safety_briefing_done:'safety_briefing_done', medical_clearance_done:'medical_clearance_done',
      rejection_reason:'rejection_reason', metadata:'metadata'
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE worker_dispatches SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, dispatch: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/dispatches/:id/status', async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    if (!status) return res.status(400).json({ error: 'الحالة مطلوبة' });
    const r = await pool.query(
      `UPDATE worker_dispatches SET status = $1, rejection_reason = COALESCE($2, rejection_reason), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, rejection_reason, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, dispatch: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/dispatches/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE worker_dispatches SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/dispatches/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE worker_dispatches SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Worker Reduction Requests =====================
router.get('/api/reduction-requests', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { status, enterprise_id } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (enterprise_id) { where += ` AND enterprise_id = $${idx++}`; params.push(enterprise_id); }
    const { sql: _qs, params: _qp } = countQuery('worker_reduction_requests', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM worker_reduction_requests WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/reduction-requests', async (req, res) => {
  try {
    const d = req.body;
    const cols = [
      'request_number','enterprise_id','enterprise_name','requested_reduction_count',
      'current_employee_count','reduction_reason','reduction_category','legal_basis',
      'detailed_description','status','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO worker_reduction_requests (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, request: r.rows[0] });
  } catch (err) {
    console.error('Reduction request create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/reduction-requests/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      request_number:'request_number', enterprise_id:'enterprise_id',
      enterprise_name:'enterprise_name', requested_reduction_count:'requested_reduction_count',
      current_employee_count:'current_employee_count', reduction_reason:'reduction_reason',
      reduction_category:'reduction_category', legal_basis:'legal_basis',
      detailed_description:'detailed_description', status:'status',
      rejection_reason:'rejection_reason', notes:'notes', metadata:'metadata',
      final_approver_notes:'final_approver_notes'
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE worker_reduction_requests SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, request: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/reduction-requests/:id/status', async (req, res) => {
  try {
    const { status, rejection_reason, final_approver_notes } = req.body;
    if (!status) return res.status(400).json({ error: 'الحالة مطلوبة' });
    const r = await pool.query(
      `UPDATE worker_reduction_requests SET status = $1, rejection_reason = COALESCE($2, rejection_reason),
       final_approver_notes = COALESCE($3, final_approver_notes), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, rejection_reason, final_approver_notes, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, request: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/reduction-requests/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE worker_reduction_requests SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
