import express from 'express';
import { pool, paginate, countQuery, softDeleteFilter, safeSetClause } from '../middleware/shared.js';

const router = express.Router();

// ===================== Fee Payments =====================
router.get('/api/fee-payments', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, member_id, status, payment_method } = req.query;
    let where = '1=1';
    where += softDeleteFilter('fee_payments', includeDeleted, 'fee_payments');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND entity_id = $${idx++}`; params.push(entity_id); }
    if (member_id) { where += ` AND member_id = $${idx++}`; params.push(member_id); }
    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (payment_method) { where += ` AND payment_method = $${idx++}`; params.push(payment_method); }
    const { sql: _qs, params: _qp } = countQuery('fee_payments', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM fee_payments WHERE ${where} ORDER BY payment_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/fee-payments/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM fee_payments WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/fee-payments', async (req, res) => {
  try {
    const d = req.body;
    if (d.amount === undefined || d.amount === null) return res.status(400).json({ error: 'المبلغ مطلوب' });
    const cols = [
      'entity_id','member_id','service_id','amount','currency','payment_method',
      'receipt_number','payment_date','status','description','processed_by','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO fee_payments (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, payment: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/fee-payments/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      entity_id:'entity_id', member_id:'member_id', service_id:'service_id',
      amount:'amount', currency:'currency', payment_method:'payment_method',
      receipt_number:'receipt_number', payment_date:'payment_date', status:'status',
      description:'description', processed_by:'processed_by', notes:'notes', metadata:'metadata'
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
      `UPDATE fee_payments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, payment: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/fee-payments/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE fee_payments SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Training Records =====================

router.put('/api/fee_payments/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE fee_payments SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/training-records', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, status } = req.query;
    let where = '1=1';
    where += softDeleteFilter('training_records', includeDeleted, 'tr');
    const params = [];
    let idx = 1;
    if (enterprise_id) { where += ` AND tr.enterprise_id = $${idx++}`; params.push(enterprise_id); }
    if (status) { where += ` AND tr.status = $${idx++}`; params.push(status); }
    const { sql: _qs, params: _qp } = countQuery('training_records tr', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT tr.*, e.name_ar as entity_name FROM training_records tr
       LEFT JOIN organizational_entities e ON tr.enterprise_id = e.entity_id
       WHERE ${where} ORDER BY tr.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.post('/api/training-records', async (req, res) => {
  try {
    const d = req.body;
    if (!d.enterprise_id) return res.status(400).json({ error: 'enterprise_id مطلوب' });
    const cols = [
      'enterprise_id','training_name','training_code','training_type','training_provider',
      'start_date','end_date','duration_hours','status',
      'employee_id','employee_name','assessment_score','certification_issued','certification_number',
      'regulatory_basis','occupation_id','member_id','competence_ids'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO training_records (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.put('/api/training-records/:id', async (req, res) => {
  try {
    const d = req.body;
    const valid = safeSetClause('training_records', d);
    if (!valid || !valid.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE training_records SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.delete('/api/training-records/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE training_records SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/training-records/:id/restore', async (req, res) => {
  try {
    const r = await pool.query('UPDATE training_records SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
