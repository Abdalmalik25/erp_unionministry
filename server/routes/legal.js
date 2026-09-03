import express from 'express';
import { pool, paginate, countQuery, softDeleteFilter, TABLE_COLUMNS, validateColumns, ALLOWED_TABLES, validateTableName } from '../middleware/shared.js';
import { validateCertificateProfession, normalizeCertificateStatus } from '../lib/certificateValidation.mjs';
import { validateFieldValues } from '../lib/dynamicFieldsValidation.mjs';
import { requirePermission } from '../middleware/rbac.js';
import { invalidateCache } from '../middleware/cache.js';

const router = express.Router();

// ===================== Legal References =====================
router.get('/api/legal-references', async (req, res) => {
  try {
    const { limit = 50, page = 1, table } = req.query;
    const offset = (page - 1) * limit;
    const targetTable = table || 'all';
    if (targetTable === 'all') {
      const [refs, lawArticles, ilo, intl] = await Promise.all([
        pool.query(`SELECT id, law_name_ar, law_name_en, law_number, law_year, law_type, summary, status, created_at, updated_at, 'reference' as _type FROM legal_references ORDER BY law_name_ar LIMIT $1 OFFSET $2`, [limit, offset]),
        pool.query(`SELECT id, legal_reference_id, article_number, article_title_ar, article_title_en, content_ar, content_en, created_at, updated_at, 'article' as _type FROM law_articles ORDER BY article_number LIMIT $1 OFFSET $2`, [limit, offset]),
        pool.query(`SELECT id, convention_number, convention_name_ar, convention_name_en, year_adopted, status, summary, created_at, updated_at, 'ilo' as _type FROM ilo_conventions ORDER BY convention_number LIMIT $1 OFFSET $2`, [limit, offset]),
        pool.query(`SELECT id, standard_code, standard_name, standard_name_en, organization, category, status, summary, created_at, updated_at, 'international' as _type FROM international_standards ORDER BY standard_code LIMIT $1 OFFSET $2`, [limit, offset]),
      ]);
      res.json({
        legal_references: refs.rows,
        law_articles: lawArticles.rows,
        ilo_conventions: ilo.rows,
        international_standards: intl.rows,
      });
    } else if (targetTable === 'legal_references') {
      const r = await pool.query(`SELECT id, law_name_ar, law_name_en, law_number, law_year, law_type, summary, status, created_at, updated_at, 'reference' as _type FROM legal_references ORDER BY law_name_ar LIMIT $1 OFFSET $2`, [limit, offset]);
      const total = await pool.query(`SELECT COUNT(*)::int FROM legal_references`);
      res.json({ data: r.rows, total: total.rows[0].count, page: +page, limit: +limit });
    } else if (targetTable === 'law_articles') {
      const r = await pool.query(`SELECT la.id, la.legal_reference_id, la.article_number, la.article_title_ar, la.article_title_en, la.content_ar, la.content_en, la.created_at, la.updated_at, 'article' as _type, lr.law_name_ar as reference_name FROM law_articles la LEFT JOIN legal_references lr ON la.legal_reference_id = lr.id ORDER BY la.article_number LIMIT $1 OFFSET $2`, [limit, offset]);
      const total = await pool.query(`SELECT COUNT(*)::int FROM law_articles`);
      res.json({ data: r.rows, total: total.rows[0].count, page: +page, limit: +limit });
    } else if (targetTable === 'ilo_conventions') {
      const r = await pool.query(`SELECT id, convention_number, convention_name_ar, convention_name_en, year_adopted, status, summary, created_at, updated_at, 'ilo' as _type FROM ilo_conventions ORDER BY convention_number LIMIT $1 OFFSET $2`, [limit, offset]);
      const total = await pool.query(`SELECT COUNT(*)::int FROM ilo_conventions`);
      res.json({ data: r.rows, total: total.rows[0].count, page: +page, limit: +limit });
    } else if (targetTable === 'international_standards') {
      const r = await pool.query(`SELECT id, standard_code, standard_name, standard_name_en, organization, category, status, summary, created_at, updated_at, 'international' as _type FROM international_standards ORDER BY standard_code LIMIT $1 OFFSET $2`, [limit, offset]);
      const total = await pool.query(`SELECT COUNT(*)::int FROM international_standards`);
      res.json({ data: r.rows, total: total.rows[0].count, page: +page, limit: +limit });
    }
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/legal-references', requirePermission('legal:create'), async (req, res) => {
  try {
    const d = req.body;
    const table = d._table || 'legal_references';
    if (!validateTableName(table)) return res.status(400).json({ error: 'الجدول غير صالح' });
    const allowed = TABLE_COLUMNS[table] || [];
    const fields = allowed.filter(c => d[c] !== undefined);
    if (!fields.length) return res.status(400).json({ error: 'لا توجد حقول' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const r = await pool.query(
      `INSERT INTO ${table} (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      fields.map(c => d[c])
    );
    res.status(201).json({ success: true, data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/legal-references/:id', requirePermission('legal:edit'), async (req, res) => {
  try {
    const d = req.body;
    const table = d._table || 'legal_references';
    if (!validateTableName(table)) return res.status(400).json({ error: 'الجدول غير صالح' });
    const allowed = TABLE_COLUMNS[table] || [];
    const { valid } = validateColumns(table, d, allowed);
    if (!valid.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE ${table} SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/legal-references/:id', requirePermission('legal:delete'), async (req, res) => {
  try {
    const table = req.query.table || 'legal_references';
    if (!validateTableName(table)) return res.status(400).json({ error: 'الجدول غير صالح' });
    const r = await pool.query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== LABOR DISPUTES =====================

router.put('/api/legal_references/:id/restore', requirePermission('write:legal_references'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE legal_references SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/labor-disputes', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, status, search } = req.query;
    const conditions = []; const params = []; let idx = 1;
    if (enterprise_id) { conditions.push(`d.enterprise_id = $${idx++}`); params.push(enterprise_id); }
    if (status) { conditions.push(`d.status = $${idx++}`); params.push(status); }
    if (search) { conditions.push(`(d.worker_name ILIKE $${idx} OR d.enterprise_name ILIKE $${idx} OR d.dispute_type ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wc = conditions.length ? conditions.join(' AND ') : '';
    const { sql: _qs, params: _qp } = countQuery('labor_disputes d', wc, params);

    const total = await pool.query(_qs, _qp);
    const rows = (await pool.query(
      `SELECT d.*, e.name_ar as entity_name FROM labor_disputes d
       LEFT JOIN organizational_entities e ON d.enterprise_id = e.entity_id
       ${where} ORDER BY d.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )).rows;
    res.json({ data: rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/labor-disputes', requirePermission('laborDisputes:create'), async (req, res) => {
  try {
    const d = req.body;
    const cols = ['enterprise_id','enterprise_name','worker_name','dispute_type','dispute_description','dispute_date','status','resolution_date','resolution_notes','settlement_proposal'];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO labor_disputes (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/labor-disputes/:id', requirePermission('laborDisputes:edit'), async (req, res) => {
  try {
    const d = req.body;
    const map = { enterprise_id:'enterprise_id', enterprise_name:'enterprise_name', worker_name:'worker_name', dispute_type:'dispute_type', dispute_description:'dispute_description', dispute_date:'dispute_date', status:'status', resolution_date:'resolution_date', resolution_notes:'resolution_notes', settlement_proposal:'settlement_proposal' };
    const cols = []; const vals = []; let idx = 1;
    for (const [key, col] of Object.entries(map)) { if (d[key] !== undefined) { cols.push(`${col} = $${idx++}`); vals.push(d[key]); } }
    if (!cols.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    cols.push('updated_at = NOW()'); vals.push(req.params.id);
    const r = await pool.query(`UPDATE labor_disputes SET ${cols.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/labor-disputes/:id', requirePermission('laborDisputes:delete'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE labor_disputes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== EXPATRIATE LICENSES =====================

router.put('/api/labor_disputes/:id/restore', requirePermission('write:labor_disputes'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE labor_disputes SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/expatriate-licenses', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, status, search } = req.query;
    const conditions = []; const params = []; let idx = 1;
    if (enterprise_id) { conditions.push(`el.enterprise_id = $${idx++}`); params.push(enterprise_id); }
    if (status) { conditions.push(`el.status = $${idx++}`); params.push(status); }
    if (search) { conditions.push(`(el.license_number ILIKE $${idx} OR el.expatriate_name ILIKE $${idx} OR el.expatriate_nationality ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wc = conditions.length ? conditions.join(' AND ') : '';
    const { sql: _qs, params: _qp } = countQuery('expatriate_licenses el', wc, params);

    const total = await pool.query(_qs, _qp);
    const rows = (await pool.query(
      `SELECT el.*, e.name_ar as entity_name FROM expatriate_licenses el
       LEFT JOIN organizational_entities e ON el.enterprise_id = e.entity_id
       ${where} ORDER BY el.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )).rows;
    res.json({ data: rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/expatriate-licenses', requirePermission('expatriate:create'), async (req, res) => {
  try {
    const d = req.body;
    if (!d.enterprise_id) return res.status(400).json({ error: 'enterprise_id مطلوب' });
    const cols = ['enterprise_id','expatriate_name','expatriate_nationality','passport_number','license_number','issue_date','expiry_date','status','linked_replacement_plan'];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO expatriate_licenses (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/expatriate-licenses/:id', requirePermission('expatriate:edit'), async (req, res) => {
  try {
    const d = req.body;
    const map = { enterprise_id:'enterprise_id', expatriate_name:'expatriate_name', expatriate_nationality:'expatriate_nationality', passport_number:'passport_number', license_number:'license_number', issue_date:'issue_date', expiry_date:'expiry_date', status:'status', linked_replacement_plan:'linked_replacement_plan' };
    const cols = []; const vals = []; let idx = 1;
    for (const [key, col] of Object.entries(map)) { if (d[key] !== undefined) { cols.push(`${col} = $${idx++}`); vals.push(d[key]); } }
    if (!cols.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    cols.push('updated_at = NOW()'); vals.push(req.params.id);
    const r = await pool.query(`UPDATE expatriate_licenses SET ${cols.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/expatriate-licenses/:id', requirePermission('expatriate:delete'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE expatriate_licenses SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== Evaluation Certificates =====================

router.put('/api/expatriate_licenses/:id/restore', requirePermission('write:expatriate_licenses'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE expatriate_licenses SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/evaluation-certificates', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { enterprise_id, status } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (enterprise_id) { where += ` AND ec.enterprise_id = $${idx++}`; params.push(enterprise_id); }
    if (status) { where += ` AND ec.status = $${idx++}`; params.push(status); }
    const { sql: _qs, params: _qp } = countQuery('evaluation_certificates ec', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT ec.*, e.name_ar as entity_name FROM evaluation_certificates ec
       LEFT JOIN organizational_entities e ON ec.enterprise_id = e.entity_id
       WHERE ${where} ORDER BY ec.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.post('/api/evaluation-certificates', requirePermission('evaluation:create'), async (req, res) => {
  try {
    const d = req.body;
    if (!d.enterprise_id) return res.status(400).json({ error: 'enterprise_id مطلوب' });

    // Normalize legacy/UI status values to the DB enum.
    if (d.status) d.status = normalizeCertificateStatus(d.status);

    // Enforce the profession <-> assessed_against_standards invariant (no boolean fix).
    const v = validateCertificateProfession(d);
    if (!v.valid) return res.status(400).json({ error: 'خطأ في ربط المهنة والمعايير', fields: v.errors });

    // If a profession is supplied, it must reference a real, non-deleted profession.
    if (d.profession_id) {
      const pf = await pool.query('SELECT id FROM professions WHERE id = $1 AND deleted_at IS NULL', [d.profession_id]);
      if (pf.rows.length === 0) return res.status(400).json({ error: 'المهنة المحددة غير موجودة أو محذوفة' });
    }

    // Validate extensible custom_data against the active field definitions.
    if (d.custom_data !== undefined) {
      const defs = await pool.query(
        `SELECT id, entity_type, field_key, label, description, data_type, required, default_value, options, validation_rules, reference_entity, visible_in_form, visible_in_list, searchable, filterable, sortable, reportable, printable, importable, exportable, scope, active, display_order, entity_id, created_at, updated_at FROM custom_field_definitions WHERE entity_type = 'evaluation_certificates' AND active = true`
      );
      const cv = validateFieldValues(defs.rows, d.custom_data);
      if (!cv.valid) return res.status(400).json({ error: 'بيانات الحقول المخصصة غير صالحة', fields: cv.errors });
      d.custom_data = cv.normalized;
    }

    const cols = [
      'enterprise_id','certificate_number','evaluation_summary','status','issue_date',
      'expiry_date','validity_period','overall_score','labor_law_compliance',
      'safety_compliance','training_compliance','yemenization_compliance',
      'issued_by','approved_by','qr_code_data','certified_occupations','inspection_id','attachments',
      'profession_id','standard_version','assessed_against_standards','custom_data'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO evaluation_certificates (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.put('/api/evaluation-certificates/:id', requirePermission('evaluation:edit'), async (req, res) => {
  try {
    const d = req.body;

    if (d.status) d.status = normalizeCertificateStatus(d.status);

    const v = validateCertificateProfession(d);
    if (!v.valid) return res.status(400).json({ error: 'خطأ في ربط المهنة والمعايير', fields: v.errors });

    if (d.profession_id) {
      const pf = await pool.query('SELECT id FROM professions WHERE id = $1 AND deleted_at IS NULL', [d.profession_id]);
      if (pf.rows.length === 0) return res.status(400).json({ error: 'المهنة المحددة غير موجودة أو محذوفة' });
    }

    // Validate extensible custom_data against the active field definitions.
    if (d.custom_data !== undefined) {
      const defs = await pool.query(
        `SELECT id, entity_type, field_key, label, description, data_type, required, default_value, options, validation_rules, reference_entity, visible_in_form, visible_in_list, searchable, filterable, sortable, reportable, printable, importable, exportable, scope, active, display_order, entity_id, created_at, updated_at FROM custom_field_definitions WHERE entity_type = 'evaluation_certificates' AND active = true`
      );
      const cv = validateFieldValues(defs.rows, d.custom_data);
      if (!cv.valid) return res.status(400).json({ error: 'بيانات الحقول المخصصة غير صالحة', fields: cv.errors });
      d.custom_data = cv.normalized;
    }

    // Column whitelist aligned with the real evaluation_certificates schema.
    const colMap = {
      enterprise_id: 'enterprise_id',
      certificate_number: 'certificate_number',
      evaluation_summary: 'evaluation_summary',
      status: 'status',
      issue_date: 'issue_date',
      expiry_date: 'expiry_date',
      validity_period: 'validity_period',
      overall_score: 'overall_score',
      labor_law_compliance: 'labor_law_compliance',
      safety_compliance: 'safety_compliance',
      training_compliance: 'training_compliance',
      yemenization_compliance: 'yemenization_compliance',
      issued_by: 'issued_by',
      approved_by: 'approved_by',
      qr_code_data: 'qr_code_data',
      certified_occupations: 'certified_occupations',
      inspection_id: 'inspection_id',
      attachments: 'attachments',
      profession_id: 'profession_id',
      standard_version: 'standard_version',
      assessed_against_standards: 'assessed_against_standards',
      custom_data: 'custom_data',
    };
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, col] of Object.entries(colMap)) {
      if (d[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(d[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE evaluation_certificates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, certificate: r.rows[0] });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/evaluation-certificates/:id', requirePermission('evaluation:delete'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE evaluation_certificates SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Licenses =====================

router.put('/api/evaluation_certificates/:id/restore', requirePermission('write:evaluation_certificates'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE evaluation_certificates SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/licenses', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { entity_id, status } = req.query;
    let where = '1=1';
    where += softDeleteFilter('licenses', includeDeleted, 'l');
    const params = [];
    let idx = 1;
    if (entity_id) { where += ` AND l.entity_id = $${idx++}`; params.push(entity_id); }
    if (status) { where += ` AND l.status = $${idx++}`; params.push(status); }
    const { sql: _qs, params: _qp } = countQuery('licenses l', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT l.*, e.name_ar as entity_name FROM licenses l
       JOIN organizational_entities e ON l.entity_id = e.entity_id
       WHERE ${where} ORDER BY l.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/licenses', requirePermission('licenses:create'), async (req, res) => {
  try {
    const d = req.body;
    if (!d.entity_id) return res.status(400).json({ error: 'entity_id مطلوب' });
    const cols = [
      'license_number','entity_id','license_type','license_name','issue_date','expiry_date',
      'issuing_authority','status','renewal_status','renewal_date','issuing_decision',
      'file_url','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO licenses (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, license: r.rows[0] });
    invalidateCache('dashboard');
  } catch (err) {
    console.error('License create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/licenses/:id', requirePermission('licenses:edit'), async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      license_number:'license_number', entity_id:'entity_id', license_type:'license_type',
      license_name:'license_name', issue_date:'issue_date', expiry_date:'expiry_date',
      issuing_authority:'issuing_authority', status:'status', renewal_status:'renewal_status',
      renewal_date:'renewal_date', issuing_decision:'issuing_decision',
      file_url:'file_url', notes:'notes', metadata:'metadata'
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
      `UPDATE licenses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, license: r.rows[0] });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/licenses/:id', requirePermission('licenses:delete'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE licenses SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/licenses/:id/restore', requirePermission('write:licenses'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE licenses SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
