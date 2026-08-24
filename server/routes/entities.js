import express from 'express';
import { pool, paginate, countQuery } from '../middleware/shared.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// ===================== Organizational Entities =====================
// Operations delegated to entityService for consistency and testability

router.get('/api/entities', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { entity_type, status, governorate, search } = req.query;
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    let idx = 1;
    if (entity_type) { conditions.push(`entity_type = $${idx++}`); params.push(entity_type); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (governorate) { conditions.push(`governorate = $${idx++}`); params.push(governorate); }
    if (search) {
      conditions.push(`(name_ar ILIKE $${idx} OR name_en ILIKE $${idx} OR unified_code ILIKE $${idx} OR national_number ILIKE $${idx} OR registration_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    const where = 'WHERE ' + conditions.join(' AND ');
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM organizational_entities ${where}`, params);
    const r = await pool.query(
      `SELECT * FROM organizational_entities ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    console.error('Entities list error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/entities/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM organizational_entities WHERE entity_id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/entities/:id/members', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const total = await pool.query('SELECT COUNT(*)::int FROM members WHERE entity_id = $1', [req.params.id]);
    const r = await pool.query('SELECT * FROM members WHERE entity_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [req.params.id, limit, offset]);
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/entities/:id/activities', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const total = await pool.query('SELECT COUNT(*)::int FROM activities WHERE entity_id = $1', [req.params.id]);
    const r = await pool.query('SELECT * FROM activities WHERE entity_id = $1 ORDER BY start_date DESC LIMIT $2 OFFSET $3', [req.params.id, limit, offset]);
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/entities/:id/overview', async (req, res) => {
  try {
    const { id } = req.params;
    const [entity, members, violations, inspections, occupations, relationships, activities, documents, licenses, dispatches, riskAssessments, complianceAlerts] = await Promise.all([
      pool.query('SELECT * FROM organizational_entities WHERE entity_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = \'active\' THEN 1 END)::int as active FROM members WHERE entity_id = $1 AND deleted_at IS NULL', [id]),
      pool.query('SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = \'open\' THEN 1 END)::int as open FROM violations WHERE entity_id = $1 AND deleted_at IS NULL', [id]),
      pool.query('SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = \'completed\' THEN 1 END)::int as completed FROM inspections WHERE enterprise_id = $1', [id]),
      pool.query(`SELECT COUNT(*)::int as total FROM enterprise_occupation_links WHERE enterprise_id = $1`, [id]),
      pool.query('SELECT COUNT(*)::int as total FROM entity_relationships WHERE source_entity_id = $1 OR target_entity_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as total FROM activities WHERE entity_id = $1 AND deleted_at IS NULL', [id]),
      pool.query('SELECT COUNT(*)::int as total FROM documents WHERE entity_id = $1 AND deleted_at IS NULL', [id]),
      pool.query("SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'valid' THEN 1 END)::int as valid FROM licenses WHERE enterprise_id = $1", [id]),
      pool.query("SELECT COUNT(*)::int as total, COUNT(CASE WHEN status = 'active' OR status = 'dispatched' THEN 1 END)::int as active FROM worker_dispatches WHERE sending_enterprise_id = $1 AND deleted_at IS NULL", [id]),
      pool.query('SELECT COUNT(*)::int as total FROM risk_assessments WHERE enterprise_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int as total, COUNT(CASE WHEN is_resolved = false THEN 1 END)::int as unresolved FROM compliance_alerts WHERE enterprise_id = $1 AND deleted_at IS NULL', [id]),
    ]);
    if (entity.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({
      entity: entity.rows[0],
      stats: {
        members: members.rows[0],
        violations: violations.rows[0],
        inspections: inspections.rows[0],
        occupations: occupations.rows[0],
        relationships: relationships.rows[0],
        activities: activities.rows[0],
        documents: documents.rows[0],
        licenses: licenses.rows[0],
        dispatches: dispatches.rows[0],
        riskAssessments: riskAssessments.rows[0],
        complianceAlerts: complianceAlerts.rows[0],
      },
    });
  } catch (err) {
    console.error('Entity overview error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/entities', validate(schemas.entityCreate), async (req, res) => {
  try {
    const d = req.body;
    const cols = [
      'name_ar','name_en','entity_type','classification','sector','legal_form','governance_level','geographic_scope',
      'unified_code','registration_number','entity_code','governorate','city','address',
      'phone','fax','email','website','president_name','president_phone',
      'vice_president_name','secretary_name','treasurer_name','member_count','branch_count',
      'establishment_date','registration_date','compliance_status','risk_level','status','description','notes'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO organizational_entities (${fields.map(f => `"${f}"`).join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      values
    );
    res.status(201).json({ success: true, entity: r.rows[0] });
  } catch (err) {
    console.error('Entity create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/entities/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      name_ar:'name_ar', name_en:'name_en', entity_type:'entity_type', classification:'classification',
      sector:'sector', legal_form:'legal_form', unified_code:'unified_code',
      registration_number:'registration_number', entity_code:'entity_code', governorate:'governorate',
      city:'city', address:'address', phone:'phone', fax:'fax', email:'email', website:'website',
      president_name:'president_name', president_phone:'president_phone',
      vice_president_name:'vice_president_name', secretary_name:'secretary_name',
      treasurer_name:'treasurer_name', member_count:'member_count', branch_count:'branch_count',
      establishment_date:'establishment_date', compliance_status:'compliance_status',
      risk_level:'risk_level', status:'status', description:'description', notes:'notes'
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
      `UPDATE organizational_entities SET ${fields.join(', ')} WHERE entity_id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, entity: r.rows[0] });
  } catch (err) {
    console.error('Entity update error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/entities/:id', async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE organizational_entities SET deleted_at = NOW() WHERE entity_id = $1 AND deleted_at IS NULL RETURNING entity_id',
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Commercial Establishments (v1) — DEPRECATED TD-015 =====================
router.get('/api/commercial', async (req, res) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', '2026-12-31');
  res.setHeader('Link', '</api/commercial-establishments>; rel="successor-version"');
  try {
    const { limit, page, offset } = paginate(req);
    const { search, status, sector, classification, governorate } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (search) {
      where += ` AND (name_ar ILIKE $${idx} OR name_en ILIKE $${idx} OR commercial_register_number ILIKE $${idx} OR unified_code ILIKE $${idx} OR establishment_id ILIKE $${idx} OR owner_name ILIKE $${idx} OR phone ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (sector) { where += ` AND sector = $${idx++}`; params.push(sector); }
    if (classification) { where += ` AND classification = $${idx++}`; params.push(classification); }
    if (governorate) { where += ` AND governorate = $${idx++}`; params.push(governorate); }
    const { sql: _qs, params: _qp } = countQuery('commercial_establishments', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM commercial_establishments WHERE ${where} ORDER BY establishment_id ASC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    console.error('Commercial GET error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// GET 360° Comprehensive Dossier for an Establishment
const handle360Dossier = async (req, res) => {
  try {
    const { id } = req.params;
    // Find establishment by id, establishment_id, or unified_code
    const estRes = await pool.query(
      `SELECT * FROM commercial_establishments WHERE id::text = $1 OR establishment_id = $1 OR unified_code = $1 OR commercial_register_number = $1 LIMIT 1`,
      [id]
    );
    if (estRes.rows.length === 0) return res.status(404).json({ error: 'المنشأة غير موجودة' });
    const est = estRes.rows[0];

    // Parallel fetch related 360 records
    const [occupations, dispatches, disputes, reductions, documents, certificates] = await Promise.all([
      pool.query(`SELECT * FROM enterprise_occupation_links WHERE enterprise_id::text = $1 OR enterprise_name = $2 ORDER BY created_at DESC`, [est.id, est.name_ar]),
      pool.query(`SELECT * FROM worker_dispatches WHERE sending_enterprise_id::text = $1 OR sending_enterprise_name = $2 OR receiving_enterprise_name = $2 ORDER BY created_at DESC`, [est.id, est.name_ar]),
      pool.query(`SELECT * FROM labor_disputes WHERE enterprise_id::text = $1 OR enterprise_name ILIKE '%' || $2 || '%' ORDER BY created_at DESC`, [est.id, est.name_ar]),
      pool.query(`SELECT * FROM worker_reduction_requests WHERE enterprise_id::text = $1 OR enterprise_name ILIKE '%' || $2 || '%' ORDER BY created_at DESC`, [est.id, est.name_ar]),
      pool.query(`SELECT * FROM documents WHERE entity_id::text = $1 OR document_name ILIKE '%' || $2 || '%' ORDER BY created_at DESC`, [est.id, est.name_ar]),
      pool.query(`SELECT * FROM evaluation_certificates WHERE enterprise_id::text = $1 OR evaluation_summary ILIKE '%' || $2 || '%' ORDER BY created_at DESC`, [est.id, est.name_ar]),
    ]);

    res.json({
      success: true,
      establishment: est,
      occupations: occupations.rows,
      dispatches: dispatches.rows,
      disputes: disputes.rows,
      reductions: reductions.rows,
      documents: documents.rows,
      certificates: certificates.rows,
      counts: {
        occupations: occupations.rowCount,
        dispatches: dispatches.rowCount,
        disputes: disputes.rowCount,
        reductions: reductions.rowCount,
        documents: documents.rowCount,
        certificates: certificates.rowCount,
      }
    });
  } catch (err) {
    console.error('360 dossier error:', err);
    res.status(500).json({ error: 'خطأ في جلب الملف الشامل للمنشأة' });
  }
};

router.get('/api/commercial/:id/360', handle360Dossier);
router.get('/api/commercial-360/:id', handle360Dossier);
router.get('/api/commercial/dossier/:id', handle360Dossier);

router.post('/api/commercial', async (req, res) => {
  try {
    const d = req.body;
    const cols = [
      'name','commercial_number','entity_type','sector','classification',
      'governorate','city','address','phone','email','status',
      'registration_date','establishment_date','notes','metadata'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO commercial_establishments (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, commercial: r.rows[0] });
  } catch (err) {
    console.error('Commercial create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/commercial/:id', async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      name:'name', commercial_number:'commercial_number', entity_type:'entity_type',
      sector:'sector', classification:'classification', governorate:'governorate',
      city:'city', address:'address', phone:'phone', email:'email',
      status:'status', registration_date:'registration_date',
      establishment_date:'establishment_date', notes:'notes', metadata:'metadata'
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
      `UPDATE commercial_establishments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, commercial: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/commercial/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE commercial_establishments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== Commercial Establishments (v2) =====================
router.get('/api/commercial-establishments', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { status, search } = req.query;
    const conditions = []; const params = []; let idx = 1;
    if (status) { conditions.push(`ce.status = $${idx++}`); params.push(status); }
    if (search) { conditions.push(`(ce.name_ar ILIKE $${idx} OR ce.name_en ILIKE $${idx} OR ce.unified_code ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wc = conditions.length ? conditions.join(' AND ') : '';
    const { sql: _qs, params: _qp } = countQuery('commercial_establishments ce', wc, params);

    const total = await pool.query(_qs, _qp);
    const rows = (await pool.query(
      `SELECT * FROM commercial_establishments ce ${where} ORDER BY ce.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )).rows;
    res.json({ data: rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/commercial-establishments', async (req, res) => {
  try {
    const d = req.body;
    const cols = ['name_ar','name_en','establishment_id','unified_code','commercial_register_number','entity_type','sector','classification','status','capital_amount','employees_count','license_date','expiry_date','address','phone','email','owner_name','license_number','governorate','city'];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO commercial_establishments (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/commercial-establishments/:id', async (req, res) => {
  try {
    const d = req.body;
    const valid = safeSetClause('commercial_establishments', d);
    if (!valid || !valid.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE commercial_establishments SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/commercial-establishments/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE commercial_establishments SET deleted_at=NOW(), deleted_by=$1 WHERE id=$2 AND deleted_at IS NULL RETURNING id', [req.user?.id||null, req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود', code:'NOT_FOUND' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ داخلي', code: 'INTERNAL_ERROR' }); }
});

// ===================== Enterprise Occupation Links =====================
router.get('/api/enterprise-occupation-links', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { enterprise_id, occupation_id, link_status, search } = req.query;
    const conditions = []; const params = []; let idx = 1;
    if (enterprise_id) { conditions.push(`eol.enterprise_id = $${idx++}`); params.push(enterprise_id); }
    if (occupation_id) { conditions.push(`eol.occupation_id = $${idx++}`); params.push(occupation_id); }
    if (link_status) { conditions.push(`eol.link_status = $${idx++}`); params.push(link_status); }
    if (search) { conditions.push(`(eol.enterprise_name ILIKE $${idx} OR eol.occupation_name_ar ILIKE $${idx} OR eol.occupation_code ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wc = conditions.length ? conditions.join(' AND ') : '';
    const { sql: _qs, params: _qp } = countQuery('enterprise_occupation_links eol', wc, params);

    const total = await pool.query(_qs, _qp);
    const rows = (await pool.query(
      `SELECT eol.*, en.name_ar as entity_name FROM enterprise_occupation_links eol
       LEFT JOIN organizational_entities en ON eol.enterprise_id = en.entity_id
       ${where} ORDER BY eol.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )).rows;
    res.json({ data: rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/enterprise-occupation-links', async (req, res) => {
  try {
    const d = req.body;
    if (!d.enterprise_id || !d.occupation_id) return res.status(400).json({ error: 'enterprise_id و occupation_id مطلوبان' });
    const cols = ['enterprise_id','occupation_id','enterprise_name','cr_number','occupation_code','occupation_name_ar','isco_code','department','allocated_headcount','yemeni_headcount','expatriate_headcount','salary_scale','contract_types','yemenization_policy','link_status','compliance_score','labor_law_compliant','salary_compliant','osh_compliant','medical_checks_done','yemenization_compliant'];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const r = await pool.query(
      `INSERT INTO enterprise_occupation_links (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      fields.map(c => d[c])
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/enterprise-occupation-links/:id', async (req, res) => {
  try {
    const d = req.body;
    const allowedCols = ['enterprise_id','occupation_id','enterprise_name','cr_number','occupation_code','occupation_name_ar','isco_code','department','allocated_headcount','yemeni_headcount','expatriate_headcount','salary_scale','contract_types','yemenization_policy','link_status','compliance_score','labor_law_compliant','salary_compliant','osh_compliant','medical_checks_done','yemenization_compliant'];
    const valid = allowedCols.filter(k => d[k] !== undefined);
    if (!valid.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE enterprise_occupation_links SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/enterprise-occupation-links/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE enterprise_occupation_links SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== Entity Relationships =====================
router.get('/api/entity-relationships', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { source_entity_id, target_entity_id, relationship_type, status } = req.query;
    const conditions = []; const params = []; let idx = 1;
    if (source_entity_id) { conditions.push(`er.source_entity_id = $${idx++}`); params.push(source_entity_id); }
    if (target_entity_id) { conditions.push(`er.target_entity_id = $${idx++}`); params.push(target_entity_id); }
    if (relationship_type) { conditions.push(`er.relationship_type = $${idx++}`); params.push(relationship_type); }
    if (status) { conditions.push(`er.status = $${idx++}`); params.push(status); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const wc = conditions.length ? conditions.join(' AND ') : '';
    const { sql: _qs, params: _qp } = countQuery('entity_relationships er', wc, params);

    const total = await pool.query(_qs, _qp);
    const rows = (await pool.query(
      `SELECT er.*, se.name_ar as source_name, te.name_ar as target_name
       FROM entity_relationships er
       LEFT JOIN organizational_entities se ON er.source_entity_id = se.entity_id
       LEFT JOIN organizational_entities te ON er.target_entity_id = te.entity_id
       ${where} ORDER BY er.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )).rows;
    res.json({ data: rows, total: total.rows[0].count, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/entity-relationships', async (req, res) => {
  try {
    const d = req.body;
    if (!d.source_entity_id || !d.target_entity_id || !d.relationship_type) {
      return res.status(400).json({ error: 'source_entity_id و target_entity_id و relationship_type مطلوبة' });
    }
    const cols = ['source_entity_id','target_entity_id','relationship_type','relationship_level','start_date','end_date','status','metadata'];
    const fields = cols.filter(c => d[c] !== undefined);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const r = await pool.query(
      `INSERT INTO entity_relationships (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      fields.map(c => c === 'metadata' ? JSON.stringify(d[c]) : d[c])
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/entity-relationships/:id', async (req, res) => {
  try {
    const d = req.body;
    const allowedCols = ['source_entity_id','target_entity_id','relationship_type','relationship_level','start_date','end_date','status','metadata'];
    const valid = allowedCols.filter(k => d[k] !== undefined);
    if (!valid.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    const cols = valid.map((k, i) => `${k} = $${i + 1}`);
    const vals = valid.map(k => k === 'metadata' ? JSON.stringify(d[k]) : d[k]);
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE entity_relationships SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.delete('/api/entity-relationships/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE entity_relationships SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ===================== Workflow Engine =====================
const ENTITY_WORKFLOW = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: [],
  rejected: ['draft'],
};

router.put('/api/entities/:id/workflow', async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'الحالة المطلوبة مطلوبة' });
    const current = await pool.query('SELECT status FROM organizational_entities WHERE entity_id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    const currentStatus = current.rows[0].status;
    const allowed = ENTITY_WORKFLOW[currentStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `لا يمكن التحويل من "${currentStatus}" إلى "${status}". الحالات المسموحة: ${allowed.join(', ') || 'لا توجد'}` });
    }
    const r = await pool.query(
      `UPDATE organizational_entities SET status = $1, workflow_notes = COALESCE($2, workflow_notes), updated_at = NOW() WHERE entity_id = $3 RETURNING *`,
      [status, notes, req.params.id]
    );
    await auditLog('workflow_change', 'organizational_entities', req.user?.id, { entity_id: req.params.id, from: currentStatus, to: status });
    res.json({ success: true, entity: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/entities/:id/workflow-history', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT al.*, p.name as user_name FROM audit_log al LEFT JOIN profiles p ON al.user_id = p.id
       WHERE al.resource_type = 'organizational_entities' AND al.details->>'entity_id' = $1 AND al.action = 'workflow_change'
       ORDER BY al.created_at DESC LIMIT 50`, [req.params.id]
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
