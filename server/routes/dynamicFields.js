import '../lib/loadEnv.js';
import express from 'express';
import { pool } from '../middleware/shared.js';
import { validateFieldDefinition, DEFINITION_REQUIRED_KEYS } from '../lib/dynamicFieldsValidation.mjs';

const router = express.Router();
const AUTH_ENABLED = process.env.ENABLE_AUTH === 'true';

// Field-definition metadata mutations respect auth when enabled.
function requireDefManager(req, res, next) {
  if (!AUTH_ENABLED) return next();
  if (!req.user) return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
  return next();
}

// List field definitions for an entity type (optionally active only).
router.get('/api/custom-field-definitions', async (req, res) => {
  try {
    const { entity_type, active } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (entity_type) { where += ` AND entity_type = $${idx++}`; params.push(entity_type); }
    if (active === 'true') where += ' AND active = true';
    else if (active === 'false') where += ' AND active = false';
    const r = await pool.query(
      `SELECT * FROM custom_field_definitions WHERE ${where} ORDER BY display_order, label`, params
    );
    res.json({ data: r.rows, total: r.rows.length });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.post('/api/custom-field-definitions', requireDefManager, async (req, res) => {
  try {
    const d = req.body || {};
    // Required presence check (validateFieldDefinition only validates provided fields).
    const missing = DEFINITION_REQUIRED_KEYS.filter(k => d[k] === undefined || d[k] === '');
    if (missing.length) return res.status(400).json({ error: 'حقول مطلوبة مفقودة', fields: Object.fromEntries(missing.map(k => [k, 'مطلوب'])) });

    if (AUTH_ENABLED && req.user?.organizationId && d.scope === 'entity' && !d.entity_id) {
      d.entity_id = req.user.organizationId;
    }

    const v = validateFieldDefinition(d);
    if (!v.valid) return res.status(400).json({ error: 'بيانات تعريف الحقل غير صالحة', fields: v.errors });

    const cols = [
      'entity_type', 'field_key', 'label', 'description', 'data_type', 'required',
      'default_value', 'options', 'validation_rules', 'reference_entity',
      'visible_in_form', 'visible_in_list', 'searchable', 'filterable', 'sortable',
      'reportable', 'printable', 'importable', 'exportable', 'scope', 'active',
      'display_order', 'entity_id',
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO custom_field_definitions (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      values
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    if (e.message && e.message.includes('uq_cfd_entity_key')) {
      return res.status(409).json({ error: 'مفتاح الحقل مكرر لنفس نوع الكيان' });
    }
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.put('/api/custom-field-definitions/:id', requireDefManager, async (req, res) => {
  try {
    const d = req.body || {};
    const v = validateFieldDefinition(d);
    if (!v.valid) return res.status(400).json({ error: 'بيانات تعريف الحقل غير صالحة', fields: v.errors });

    const cols = [
      'label', 'description', 'required', 'default_value', 'options', 'validation_rules',
      'reference_entity', 'visible_in_form', 'visible_in_list', 'searchable', 'filterable',
      'sortable', 'reportable', 'printable', 'importable', 'exportable', 'scope',
      'active', 'display_order', 'entity_id',
    ];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const c of cols) {
      if (d[c] !== undefined) { fields.push(`${c} = $${idx++}`); values.push(d[c]); }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE custom_field_definitions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.delete('/api/custom-field-definitions/:id', requireDefManager, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM custom_field_definitions WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

export default router;
