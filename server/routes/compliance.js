import express from 'express';
import { pool, paginate, countQuery, softDelete, softDeleteFilter, safeSetClause } from '../middleware/shared.js';

const router = express.Router();

// ===================== Violations =====================
router.get('/api/violations', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status, severity } = req.query;
    let where = '1=1';
    where += softDeleteFilter('violations', includeDeleted, 'v');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND v.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND v.status = $${idx++}`; params.push(status); }
    if (severity) { where += ` AND v.severity = $${idx++}`; params.push(severity); }
    const { sql: _qs, params: _qp } = countQuery('violations v', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT v.*, e.name_ar as entity_name FROM violations v
       JOIN organizational_entities e ON v.entity_id = e.entity_id
       WHERE ${where} ORDER BY v.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/violations', async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id) return res.status(400).json({ error: 'entity_id مطلوب' });
    const cols = [
      'entity_id','violation_number','violation_type','violation_name','severity','status',
      'detected_date','detected_by','description','legal_basis','penalty_amount','decision',
      'resolved_date','resolved_by','resolution_notes','evidence_urls'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO violations (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, violation: r.rows[0] });
  } catch (err) {
    console.error('Violation create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/violations/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', violation_number:'violation_number', violation_type:'violation_type',
      violation_name:'violation_name', severity:'severity', status:'status',
      detected_date:'detected_date', detected_by:'detected_by', description:'description',
      legal_basis:'legal_basis', penalty_amount:'penalty_amount', decision:'decision',
      resolved_date:'resolved_date', resolved_by:'resolved_by',
      resolution_notes:'resolution_notes', evidence_urls:'evidence_urls'
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
      `UPDATE violations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, violation: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/violations/:id', async (req, res) => {
  try {
    const r = await softDelete('violations', req.params.id);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/violations/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE violations SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Inspections =====================
router.get('/api/inspections', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, status } = req.query;
    let where = '1=1';
    where += softDeleteFilter('inspections', includeDeleted, 'i');
    const params = [];
    let idx = 1;
    if (enterprise_id) { where += ` AND i.enterprise_id = $${idx++}`; params.push(enterprise_id); }
    if (status) { where += ` AND i.compliance_status = $${idx++}`; params.push(status); }
    const { sql: _qs, params: _qp } = countQuery('inspections i', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT i.*, e.name_ar as entity_name FROM inspections i
       LEFT JOIN organizational_entities e ON i.enterprise_id = e.entity_id
       WHERE ${where} ORDER BY i.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.post('/api/inspections', async (req, res) => {
  try {
    const d = req.body;
    if (!d.enterprise_id) return res.status(400).json({ error: 'enterprise_id مطلوب' });
    const cols = [
      'enterprise_id','inspection_number','inspection_type','inspection_date','inspector_name',
      'inspector_title','compliance_status','overall_score','labor_law_score','safety_score',
      'training_score','yemenization_score','quality_score',
      'labor_law_articles','yemeni_decrees','international_standards',
      'recommendations','strengths','weaknesses','next_inspection_date','evaluation_model',
      'evaluation_level','report_url','attachments','training_compliance_rate','occupational_safety_score','yemenization_rate','created_by'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO inspections (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.put('/api/inspections/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', inspection_number:'inspection_number', inspection_type:'inspection_type',
      inspection_date:'inspection_date', inspector_name:'inspector_name', inspector_title:'inspector_title',
      compliance_status:'compliance_status', overall_score:'overall_score',
      labor_law_score:'labor_law_score', safety_score:'safety_score',
      training_score:'training_score', yemenization_score:'yemenization_score',
      management_score:'management_score', documentation_score:'documentation_score',
      labor_law_articles:'labor_law_articles', yemeni_decrees:'yemeni_decrees',
      international_standards:'international_standards', compliance_rates:'compliance_rates',
      recommendations:'recommendations', strengths:'strengths', weaknesses:'weaknesses',
      next_inspection_date:'next_inspection_date', evaluation_model:'evaluation_model',
      evaluation_level:'evaluation_level', report_url:'report_url',
      attachments:'attachments', notes:'notes', metadata:'metadata'
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
      `UPDATE inspections SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, inspection: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/inspections/:id', async (req, res) => {
  try {
    const r = await softDelete('inspections', req.params.id);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/inspections/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE inspections SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Risk Assessments =====================
router.get('/api/risk-assessments', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status } = req.query;
    let where = '1=1';
    where += softDeleteFilter('risk_assessments', includeDeleted, 'ra');
    const params = []; let idx = 1;
    if (entity_id) { where += ` AND ra.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND ra.status = $${idx++}`; params.push(status); }
    const { sql: _qs, params: _qp } = countQuery('risk_assessments ra', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT ra.*, e.name_ar as entity_name FROM risk_assessments ra LEFT JOIN organizational_entities e ON ra.entity_id = e.entity_id WHERE ${where} ORDER BY ra.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/risk-assessments', async (req, res) => {
  try {
    const d = req.body;
    const cols = ['entity_id','risk_type','risk_description','likelihood','impact','risk_score','risk_level','mitigation_plan','responsible_person','review_date','status'];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const r = await pool.query(
      `INSERT INTO risk_assessments (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      fields.map(c => d[c])
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/risk-assessments/:id', async (req, res) => {
  try {
    const d = req.body;
    const valid = safeSetClause('risk_assessments', d);
    if (!valid || !valid.length) return res.status(400).json({ error: 'لا توجد حقول' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE risk_assessments SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/risk-assessments/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE risk_assessments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});


router.put('/api/risk-assessments/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE risk_assessments SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Compliance Matrices =====================
router.get('/api/compliance-matrices', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, occupation_id } = req.query;
    let where = '1=1';
    where += softDeleteFilter('compliance_matrices', includeDeleted, 'cm');
    const params = []; let idx = 1;
    if (enterprise_id) { where += ` AND cm.enterprise_id = $${idx++}`; params.push(enterprise_id); }
    if (occupation_id) { where += ` AND cm.occupation_id = $${idx++}`; params.push(occupation_id); }
    const { sql: _qs, params: _qp } = countQuery('compliance_matrices cm', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT cm.*, e.name_ar as enterprise_name FROM compliance_matrices cm
       LEFT JOIN organizational_entities e ON cm.enterprise_id = e.entity_id
       WHERE ${where} ORDER BY cm.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/compliance-matrices', async (req, res) => {
  try {
    const d = req.body;
    const cols = ['enterprise_id','occupation_id','occupation_type','article_number','article_title','compliance_status','notes','checked_at','checked_by'];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const r = await pool.query(
      `INSERT INTO compliance_matrices (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      fields.map(c => d[c])
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/compliance-matrices/:id', async (req, res) => {
  try {
    const d = req.body;
    const valid = safeSetClause('compliance_matrices', d);
    if (!valid || !valid.length) return res.status(400).json({ error: 'لا توجد حقول' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE compliance_matrices SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/compliance-matrices/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE compliance_matrices SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});


router.put('/api/compliance-matrices/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE compliance_matrices SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Maturity Assessments =====================
router.get('/api/maturity-assessments', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id } = req.query;
    let where = '1=1';
    where += softDeleteFilter('maturity_assessments', includeDeleted, 'ma');
    const params = []; let idx = 1;
    if (entity_id) { where += ` AND ma.entity_id = $${idx++}`; params.push(entity_id); }
    const { sql: _qs, params: _qp } = countQuery('maturity_assessments ma', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT ma.*, e.name_ar as entity_name FROM maturity_assessments ma LEFT JOIN organizational_entities e ON ma.entity_id = e.entity_id WHERE ${where} ORDER BY ma.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/maturity-assessments', async (req, res) => {
  try {
    const d = req.body;
    const cols = ['entity_id','overall_score','grade','identity_score','description_score','tasks_score','competencies_score','safety_score','career_score','governance_score','missing_count','red_flags','recommendations','assessment_date','assessed_by'];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const r = await pool.query(
      `INSERT INTO maturity_assessments (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      fields.map(c => d[c])
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/maturity-assessments/:id', async (req, res) => {
  try {
    const d = req.body;
    const valid = safeSetClause('maturity_assessments', d);
    if (!valid || !valid.length) return res.status(400).json({ error: 'لا توجد حقول' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE maturity_assessments SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/maturity-assessments/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE maturity_assessments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});


router.put('/api/maturity-assessments/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE maturity_assessments SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Compliance Alerts =====================
router.get('/api/compliance-alerts', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, severity, is_resolved, alert_type } = req.query;
    let where = '1=1';
    where += softDeleteFilter('compliance_alerts', includeDeleted, 'compliance_alerts');
    const params = [];
    let idx = 1;
    if (enterprise_id) { where += ` AND enterprise_id = $${idx++}`; params.push(enterprise_id); }
    if (severity) { where += ` AND severity = $${idx++}`; params.push(severity); }
    if (is_resolved !== undefined) { where += ` AND is_resolved = $${idx++}`; params.push(is_resolved === 'true'); }
    if (alert_type) { where += ` AND alert_type = $${idx++}`; params.push(alert_type); }
    const { sql: _qs, params: _qp } = countQuery('compliance_alerts', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM compliance_alerts WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/compliance-alerts/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM compliance_alerts WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/compliance-alerts', async (req, res) => {
  try {
    const d = req.body;
    if (!d.enterprise_id) return res.status(400).json({ error: 'enterprise_id مطلوب' });
    const cols = [
      'enterprise_id','enterprise_name','alert_type','severity','title','description',
      'source_table','source_id','due_date','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO compliance_alerts (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, alert: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/compliance-alerts/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      enterprise_id:'enterprise_id', enterprise_name:'enterprise_name', alert_type:'alert_type',
      severity:'severity', title:'title', description:'description',
      source_table:'source_table', source_id:'source_id', due_date:'due_date', metadata:'metadata'
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
      `UPDATE compliance_alerts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, alert: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/compliance-alerts/:id/acknowledge', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE compliance_alerts SET is_acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND is_acknowledged = false RETURNING *`,
      [req.body.acknowledged_by || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود أو تم الإقرار مسبقاً' });
    res.json({ success: true, alert: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/compliance-alerts/:id/resolve', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE compliance_alerts SET is_resolved = true, resolved_at = NOW(), resolved_by = $1, resolution_notes = $2, updated_at = NOW()
       WHERE id = $3 AND is_resolved = false RETURNING *`,
      [req.body.resolved_by || null, req.body.resolution_notes || null, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود أو تم الحل مسبقاً' });
    res.json({ success: true, alert: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/compliance-alerts/:id', async (req, res) => {
  try {
    const r = await softDelete('compliance_alerts', req.params.id);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});


router.put('/api/compliance_alerts/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE compliance_alerts SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Risk Engine =====================
router.post('/api/risk-engine/calculate/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const [violations, inspections, complianceAlerts, entity] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as open_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END)::int as critical_count,
        COUNT(CASE WHEN severity = 'major' THEN 1 END)::int as major_count
        FROM violations WHERE enterprise_id = $1 AND deleted_at IS NULL AND status = 'open'`, [entityId]),
      pool.query(`SELECT COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'failed' OR result = 'fail' THEN 1 END)::int as failed_count,
        COUNT(CASE WHEN status = 'scheduled' AND inspection_date < NOW() THEN 1 END)::int as overdue_count
        FROM inspections WHERE enterprise_id = $1`, [entityId]),
      pool.query(`SELECT COUNT(*)::int as total,
        COUNT(CASE WHEN is_resolved = false THEN 1 END)::int as unresolved_count
        FROM compliance_alerts WHERE enterprise_id = $1 AND deleted_at IS NULL`, [entityId]),
      pool.query(`SELECT created_at FROM organizational_entities WHERE entity_id = $1`, [entityId]),
    ]);

    const v = violations.rows[0];
    const i = inspections.rows[0];
    const ca = complianceAlerts.rows[0];
    const ent = entity.rows[0];

    const violationScore = Math.min(100, (v.open_count * 10) + (v.critical_count * 25) + (v.major_count * 15));
    const inspectionScore = Math.min(100, (i.overdue_count * 15) + (i.failed_count * 20));
    const alertScore = Math.min(100, ca.unresolved_count * 12);
    const ageScore = ent?.created_at ? Math.min(50, Math.floor((Date.now() - new Date(ent.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;

    const riskScore = Math.round(
      (violationScore * 0.4) + (inspectionScore * 0.3) + (alertScore * 0.2) + (ageScore * 0.1)
    );

    let riskLevel = 'low';
    if (riskScore > 75) riskLevel = 'critical';
    else if (riskScore > 50) riskLevel = 'high';
    else if (riskScore > 25) riskLevel = 'medium';

    await pool.query(
      `UPDATE organizational_entities SET risk_level = $1, ai_risk_score = $2, updated_at = NOW() WHERE entity_id = $3`,
      [riskLevel, riskScore, entityId]
    );

    res.json({
      entityId,
      riskScore,
      riskLevel,
      breakdown: {
        violationScore,
        inspectionScore,
        alertScore,
        ageScore,
      },
      factors: {
        openViolations: v.open_count,
        criticalViolations: v.critical_count,
        majorViolations: v.major_count,
        overdueInspections: i.overdue_count,
        failedInspections: i.failed_count,
        unresolvedAlerts: ca.unresolved_count,
      },
    });
  } catch (err) {
    console.error('Risk calculation error:', err);
    res.status(500).json({ error: 'خطأ في حساب المخاطر' });
  }
});

router.post('/api/risk-engine/batch-calculate', async (_req, res) => {
  try {
    const entities = await pool.query(`SELECT entity_id FROM organizational_entities WHERE deleted_at IS NULL AND status = 'active'`);
    const results = [];
    for (const ent of entities.rows) {
      try {
        const [violations, inspections, complianceAlerts, entity] = await Promise.all([
          pool.query(`SELECT COUNT(*)::int as open_count,
            COUNT(CASE WHEN severity = 'critical' THEN 1 END)::int as critical_count,
            COUNT(CASE WHEN severity = 'major' THEN 1 END)::int as major_count
            FROM violations WHERE enterprise_id = $1 AND deleted_at IS NULL AND status = 'open'`, [ent.entity_id]),
          pool.query(`SELECT COUNT(*)::int as total,
            COUNT(CASE WHEN status = 'failed' OR result = 'fail' THEN 1 END)::int as failed_count,
            COUNT(CASE WHEN status = 'scheduled' AND inspection_date < NOW() THEN 1 END)::int as overdue_count
            FROM inspections WHERE enterprise_id = $1`, [ent.entity_id]),
          pool.query(`SELECT COUNT(*)::int as total,
            COUNT(CASE WHEN is_resolved = false THEN 1 END)::int as unresolved_count
            FROM compliance_alerts WHERE enterprise_id = $1 AND deleted_at IS NULL`, [ent.entity_id]),
          pool.query(`SELECT created_at FROM organizational_entities WHERE entity_id = $1`, [ent.entity_id]),
        ]);

        const v = violations.rows[0];
        const i = inspections.rows[0];
        const ca = complianceAlerts.rows[0];
        const e = entity.rows[0];

        const violationScore = Math.min(100, (v.open_count * 10) + (v.critical_count * 25) + (v.major_count * 15));
        const inspectionScore = Math.min(100, (i.overdue_count * 15) + (i.failed_count * 20));
        const alertScore = Math.min(100, ca.unresolved_count * 12);
        const ageScore = e?.created_at ? Math.min(50, Math.floor((Date.now() - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;
        const riskScore = Math.round((violationScore * 0.4) + (inspectionScore * 0.3) + (alertScore * 0.2) + (ageScore * 0.1));

        let riskLevel = 'low';
        if (riskScore > 75) riskLevel = 'critical';
        else if (riskScore > 50) riskLevel = 'high';
        else if (riskScore > 25) riskLevel = 'medium';

        await pool.query(`UPDATE organizational_entities SET risk_level = $1, ai_risk_score = $2, updated_at = NOW() WHERE entity_id = $3`, [riskLevel, riskScore, ent.entity_id]);
        results.push({ entityId: ent.entity_id, riskScore, riskLevel });
      } catch (e) { results.push({ entityId: ent.entity_id, error: e.message }); }
    }
    res.json({ processed: results.length, results });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حساب المخاطر الجماعي' });
  }
});

// ===================== Inspection Workflow =====================
const INSPECTION_WORKFLOW = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['follow_up_required'],
  follow_up_required: ['scheduled'],
  cancelled: ['scheduled'],
};

router.put('/api/inspections/:id/workflow', async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'الحالة المطلوبة مطلوبة' });
    const current = await pool.query('SELECT status FROM inspections WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    const currentStatus = current.rows[0].status;
    const allowed = INSPECTION_WORKFLOW[currentStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `لا يمكن التحويل من "${currentStatus}" إلى "${status}". الحالات المسموحة: ${allowed.join(', ') || 'لا توجد'}` });
    }
    const r = await pool.query(
      `UPDATE inspections SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, notes, req.params.id]
    );
    res.json({ success: true, inspection: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Violation Workflow =====================
const VIOLATION_WORKFLOW = {
  open: ['under_investigation'],
  under_investigation: ['resolved', 'appealed'],
  resolved: ['closed'],
  appealed: ['under_investigation', 'closed'],
  closed: [],
};

router.put('/api/violations/:id/workflow', async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'الحالة المطلوبة مطلوبة' });
    const current = await pool.query('SELECT status FROM violations WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    const currentStatus = current.rows[0].status;
    const allowed = VIOLATION_WORKFLOW[currentStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `لا يمكن التحويل من "${currentStatus}" إلى "${status}". الحالات المسموحة: ${allowed.join(', ') || 'لا توجد'}` });
    }
    const r = await pool.query(
      `UPDATE violations SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, notes, req.params.id]
    );
    res.json({ success: true, violation: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
