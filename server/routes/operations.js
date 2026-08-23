import { pool, paginate, countQuery, softDelete, softDeleteFilter } from '../middleware/shared.js';
import express from 'express';
const router = express.Router();

// ===================== Activities =====================
router.get('/api/activities', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status, activity_type, search } = req.query;
    let where = '1=1';
    where += softDeleteFilter('activities', includeDeleted, 'a');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND a.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND a.status = $${idx++}`; params.push(status); }
    if (activity_type) { where += ` AND a.activity_type = $${idx++}`; params.push(activity_type); }
    if (search) { where += ` AND (a.activity_name ILIKE $${idx} OR a.activity_number ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    const { sql: _qs, params: _qp } = countQuery('activities a', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT a.*, e.name_ar as entity_name FROM activities a
       JOIN organizational_entities e ON a.entity_id = e.entity_id
       WHERE ${where} ORDER BY a.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/activities', async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id) return res.status(400).json({ error: 'entity_id مطلوب' });
    const cols = [
      'entity_id','activity_number','activity_name','activity_type','status','start_date',
      'end_date','actual_start_date','actual_end_date','location','description','objectives',
      'outcomes','responsible','notes','planned_participants','actual_participants',
      'beneficiaries_count','male_participants','female_participants','budget','actual_cost',
      'funding_source','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO activities (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      values
    );
    res.status(201).json({ success: true, activity: r.rows[0] });
  } catch (err) {
    console.error('Activity create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/activities/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', activity_number:'activity_number', activity_name:'activity_name',
      activity_type:'activity_type', status:'status', start_date:'start_date',
      end_date:'end_date', actual_start_date:'actual_start_date', actual_end_date:'actual_end_date',
      location:'location', description:'description', objectives:'objectives',
      outcomes:'outcomes', responsible:'responsible', notes:'notes',
      planned_participants:'planned_participants', actual_participants:'actual_participants',
      beneficiaries_count:'beneficiaries_count', male_participants:'male_participants',
      female_participants:'female_participants', budget:'budget', actual_cost:'actual_cost',
      funding_source:'funding_source', metadata:'metadata'
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
      `UPDATE activities SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, activity: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/activities/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE activities SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Elections =====================

router.put('/api/activities/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE activities SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/elections', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status } = req.query;
    let where = '1=1';
    where += softDeleteFilter('elections', includeDeleted, 'el');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND el.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND el.status = $${idx++}`; params.push(status); }
    const { sql: _qs, params: _qp } = countQuery('elections el', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT el.*, e.name_ar as entity_name FROM elections el
       JOIN organizational_entities e ON el.entity_id = e.entity_id
       WHERE ${where} ORDER BY el.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/elections', async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id) return res.status(400).json({ error: 'entity_id مطلوب' });
    const cols = [
      'entity_id','election_number','title','election_type','status','planned_date',
      'actual_date','eligible_voters','actual_voters','candidates_count','positions_count',
      'supervised_by','venue','results_summary','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO elections (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, election: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/elections/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', election_number:'election_number', title:'title',
      election_type:'election_type', status:'status', planned_date:'planned_date',
      actual_date:'actual_date', eligible_voters:'eligible_voters', actual_voters:'actual_voters',
      candidates_count:'candidates_count', positions_count:'positions_count',
      supervised_by:'supervised_by', venue:'venue', results_summary:'results_summary',
      notes:'notes', metadata:'metadata'
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
      `UPDATE elections SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, election: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/elections/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE elections SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Documents =====================

router.put('/api/elections/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE elections SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/documents', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status, document_type } = req.query;
    let where = '1=1';
    where += softDeleteFilter('documents', includeDeleted, 'd');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND d.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND d.status = $${idx++}`; params.push(status); }
    if (document_type) { where += ` AND d.document_type = $${idx++}`; params.push(document_type); }
    const { sql: _qs, params: _qp } = countQuery('documents d', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT d.*, e.name_ar as entity_name FROM documents d
       JOIN organizational_entities e ON d.entity_id = e.entity_id
       WHERE ${where} ORDER BY d.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/documents', async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id) return res.status(400).json({ error: 'entity_id مطلوب' });
    const cols = [
      'entity_id','document_number','document_name','document_type','status',
      'issue_date','expiry_date','issuing_authority','description','file_url',
      'rejection_reason','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO documents (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, document: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/documents/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', document_number:'document_number', document_name:'document_name',
      document_type:'document_type', status:'status', issue_date:'issue_date',
      expiry_date:'expiry_date', issuing_authority:'issuing_authority',
      description:'description', file_url:'file_url', rejection_reason:'rejection_reason',
      notes:'notes', metadata:'metadata'
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
      `UPDATE documents SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, document: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/documents/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE documents SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Services =====================

router.put('/api/documents/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE documents SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/services', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    let where = '1=1';
    where += softDeleteFilter('services', includeDeleted, 'services');
    const { sql: _qs, params: _qp } = countQuery('services', where, []);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(`SELECT * FROM services WHERE ${where} ORDER BY id LIMIT $${1} OFFSET $${2}`, [limit, offset]);
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/services', async (req, res) => {
  try {
    const d = req.body;
    const cols = [
      'service_code','service_name','description','category','processing_days',
      'fee_amount','is_active','requirements','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO services (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, service: r.rows[0] });
  } catch (err) {
    console.error('Service create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/services/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      service_code:'service_code', service_name:'service_name', description:'description',
      category:'category', processing_days:'processing_days', fee_amount:'fee_amount',
      is_active:'is_active', requirements:'requirements', metadata:'metadata'
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
      `UPDATE services SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, service: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/services/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE services SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Service Requests =====================

router.put('/api/services/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE services SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/service-requests', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status } = req.query;
    let where = '1=1';
    where += softDeleteFilter('service_requests', includeDeleted, 'sr');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND sr.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND sr.status = $${idx++}`; params.push(status); }
    const { sql: _qs, params: _qp } = countQuery('service_requests sr', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT sr.*, s.service_name, s.service_code, e.name_ar as entity_name, e.unified_code
       FROM service_requests sr
       JOIN services s ON sr.service_id = s.id
       JOIN organizational_entities e ON sr.entity_id = e.entity_id
       WHERE ${where} ORDER BY sr.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/service-requests', async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id || !d.service_id) return res.status(400).json({ error: 'entity_id و service_id مطلوبان' });
    const cols = [
      'entity_id','service_id','request_number','status','submission_date',
      'expected_date','completion_date','notes','rejection_reason','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO service_requests (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, request: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/service-requests/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', service_id:'service_id', request_number:'request_number',
      status:'status', submission_date:'submission_date', expected_date:'expected_date',
      completion_date:'completion_date', notes:'notes', rejection_reason:'rejection_reason',
      metadata:'metadata'
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
      `UPDATE service_requests SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, request: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/service-requests/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE service_requests SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Board Members =====================

router.put('/api/service_requests/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE service_requests SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/board-members', async (req, res) => {
  try {
    const { includeDeleted } = paginate(req);
    const { entity_id, status } = req.query;
    let where = '1=1';
    where += softDeleteFilter('board_members', includeDeleted, 'bm');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND bm.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND bm.status = $${idx++}`; params.push(status); }
    const r = await pool.query(
      `SELECT bm.*, e.name_ar as entity_name FROM board_members bm
       JOIN organizational_entities e ON bm.entity_id = e.entity_id
       WHERE ${where} ORDER BY bm.created_at DESC`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/board-members', async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id) return res.status(400).json({ error: 'entity_id مطلوب' });
    const cols = [
      'entity_id','full_name','national_id','position','role','gender',
      'date_of_birth','nationality','qualification','specialization',
      'phone','email','appointment_date','term_end_date','is_active',
      'is_chairman','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO board_members (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, board_member: r.rows[0] });
  } catch (err) {
    console.error('Board member create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/board-members/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', full_name:'full_name', national_id:'national_id',
      position:'position', role:'role', gender:'gender', date_of_birth:'date_of_birth',
      nationality:'nationality', qualification:'qualification', specialization:'specialization',
      phone:'phone', email:'email', appointment_date:'appointment_date',
      term_end_date:'term_end_date', is_active:'is_active', is_chairman:'is_chairman',
      notes:'notes', metadata:'metadata'
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
      `UPDATE board_members SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, board_member: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/board-members/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE board_members SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/board-members/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE board_members SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
