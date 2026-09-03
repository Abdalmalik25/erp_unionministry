import express from 'express';
import { pool, paginate, countQuery, softDelete, softDeleteFilter } from '../middleware/shared.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

// ===================== Professions =====================
router.get('/api/professions/major-groups', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT 
        COALESCE(major_group_code, SUBSTRING(trim(isco_code) FROM 1 FOR 1)) as code,
        COALESCE(major_group_name, CASE SUBSTRING(trim(isco_code) FROM 1 FOR 1)
          WHEN '1' THEN 'المديرون وكبار المسؤولين'
          WHEN '2' THEN 'الاختصاصيون والمهنيون'
          WHEN '3' THEN 'الفنيون والمساعدون الاختصاصيون'
          WHEN '4' THEN 'الكتبة والمساعدون الإداريون'
          WHEN '5' THEN 'عمال الخدمات ومندوبو المبيعات'
          WHEN '6' THEN 'العمال المهرة في الزراعة وصيد الأسماك'
          WHEN '7' THEN 'الحرفيون وعمال المهن اليدوية'
          WHEN '8' THEN 'مشغلو المصانع والآلات ومجمعو المنتجات'
          WHEN '9' THEN 'المهن الأولية والعمالة العادية'
          WHEN '0' THEN 'العاملون في القوات المسلحة والأمن'
          ELSE 'مجموعات مهنية عامة'
        END) as name,
        COUNT(*)::int as count,
        COUNT(CASE WHEN level >= 4 OR length(trim(isco_code)) >= 4 THEN 1 END)::int as leaf_count
      FROM professions
      WHERE deleted_at IS NULL AND isco_code IS NOT NULL
      GROUP BY 1, 2
      ORDER BY code
    `);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب المجموعات الرئيسية' });
  }
});

router.get('/api/professions', async (req, res) => {
  try {
    const { limit, page, offset, includeDeleted } = paginate(req);
    const { search, sector, level, status, last_level, leaf_only, major_group } = req.query;
    let where = '1=1';
    where += softDeleteFilter('professions', includeDeleted, 'professions');
    const params = [];
    let idx = 1;
    if (search) { where += ` AND (name_ar ILIKE $${idx} OR isco_code ILIKE $${idx} OR code ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (sector) { where += ` AND sector = $${idx++}`; params.push(sector); }
    if (level) { where += ` AND level = $${idx++}`; params.push(level); }
    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (major_group) { where += ` AND (major_group_code = $${idx} OR isco_code LIKE $${idx} || '%')`; params.push(major_group); idx++; }
    if (last_level === 'true' || leaf_only === 'true') {
      where += ` AND (level >= 4 OR length(trim(COALESCE(isco_code, code, ''))) >= 4 OR unit_group IS NOT NULL)`;
    }
    const { sql: _qs, params: _qp } = countQuery('professions', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM professions WHERE ${where} ORDER BY isco_code LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, professions: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/professions', requirePermission('write:professions'), async (req, res) => {
  try {
    const d = req.body;
    const cols = [
      'name_ar','name_en','code','isco_code','major_group_code','major_group_name','sector','family','sub_major_group','minor_group',
      'unit_group','level','status','description_ar','description_en','scope',
      'work_environment','education_level','training_hours','hazard_level',
      'salary_min','salary_max','career_path','keywords'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO professions (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, profession: r.rows[0] });
  } catch (err) {
    console.error('Profession create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/professions/:id', requirePermission('write:professions'), async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      name_ar:'name_ar', name_en:'name_en', isco_code:'isco_code', sector:'sector',
      family:'family', sub_major_group:'sub_major_group', minor_group:'minor_group',
      unit_group:'unit_group', level:'level', status:'status',
      description_ar:'description_ar', description_en:'description_en', scope:'scope',
      work_environment:'work_environment', education_level:'education_level',
      training_hours:'training_hours', hazard_level:'hazard_level',
      salary_min:'salary_min', salary_max:'salary_max', career_path:'career_path',
      keywords:'keywords'
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
      `UPDATE professions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, profession: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/professions/:id', requirePermission('write:professions'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE professions SET deleted_at = NOW(), deleted_by = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/professions/:id/restore', requirePermission('write:professions'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE professions SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== 360° Comprehensive Occupation Dossier =====================
router.get('/api/professions/:id/360-dossier', async (req, res) => {
  try {
    const { id } = req.params;
    const profRes = await pool.query('SELECT * FROM professions WHERE id = $1 OR isco_code = $1', [id]);
    if (profRes.rows.length === 0) return res.status(404).json({ error: 'المهنة غير موجودة' });
    const profession = profRes.rows[0];

    // Fetch allocated establishments
    const allocRes = await pool.query(
      `SELECT eol.*, ce.governorate, ce.sector as establishment_sector, ce.compliance_status
       FROM enterprise_occupation_links eol
       LEFT JOIN commercial_establishments ce ON eol.enterprise_id::text = ce.id::text OR eol.enterprise_id::text = ce.establishment_id::text
       WHERE (eol.occupation_id::text = $1 OR eol.isco_code = $2 OR eol.occupation_code = $2)
         AND eol.deleted_at IS NULL
       ORDER BY eol.created_at DESC`,
      [profession.id, profession.isco_code]
    );

    // Fetch hazardous & OSH profile
    const hazardRes = await pool.query(
      `SELECT * FROM hazardous_occupations WHERE occupation_id::text = $1 OR occupation_code = $2`,
      [profession.id, profession.isco_code]
    );

    // Fetch actual deployed worker count
    const workersCountRes = await pool.query(
      `SELECT COUNT(*)::int as active_workers
       FROM workers
       WHERE (occupation = $1 OR occupation_id::text = $2 OR isco_code = $1)
         AND deleted_at IS NULL`,
      [profession.name_ar, profession.id]
    ).catch(() => ({ rows: [{ active_workers: 0 }] }));

    res.json({
      success: true,
      profession,
      hazard_profile: hazardRes.rows[0] || null,
      allocations: allocRes.rows,
      stats: {
        total_allocated_establishments: allocRes.rows.length,
        total_quota_headcount: allocRes.rows.reduce((sum, r) => sum + (Number(r.allocated_headcount) || 0), 0),
        total_yemeni_quota: allocRes.rows.reduce((sum, r) => sum + (Number(r.yemeni_headcount) || 0), 0),
        total_expatriate_quota: allocRes.rows.reduce((sum, r) => sum + (Number(r.expatriate_headcount) || 0), 0),
        active_deployed_workers: workersCountRes.rows[0]?.active_workers || 0,
      }
    });
  } catch (err) {
    console.error('360 Dossier Error:', err);
    res.status(500).json({ error: 'خطأ في جلب الملف الشامل للمهنة' });
  }
});

// ===================== Multi-Establishment Batch Allocation =====================
router.post('/api/professions/:id/batch-allocate', requirePermission('write:professions'), async (req, res) => {
  try {
    const { id } = req.params;
    const { establishment_ids, allocation_details } = req.body;
    
    if (!Array.isArray(establishment_ids) || establishment_ids.length === 0) {
      return res.status(400).json({ error: 'يرجى تحديد منشأة واحدة على الأقل للتخصيص' });
    }

    const profRes = await pool.query('SELECT * FROM professions WHERE id = $1 OR isco_code = $1', [id]);
    if (profRes.rows.length === 0) return res.status(404).json({ error: 'المهنة غير موجودة' });
    const prof = profRes.rows[0];

    const results = [];
    for (const estId of establishment_ids) {
      // Find establishment info
      const estRes = await pool.query(
        'SELECT * FROM commercial_establishments WHERE id::text = $1 OR establishment_id::text = $1',
        [estId]
      );
      const est = estRes.rows[0] || { name_ar: 'منشأة معتمدة', commercial_register_number: '' };

      const details = allocation_details || {};
      const headcount = Number(details.allocated_headcount) || 1;
      const yemeni = Number(details.yemeni_headcount) || headcount;
      const expat = Number(details.expatriate_headcount) || 0;

      const r = await pool.query(
        `INSERT INTO enterprise_occupation_links (
          enterprise_id, occupation_id, enterprise_name, cr_number,
          occupation_code, occupation_name_ar, isco_code, department,
          allocated_headcount, yemeni_headcount, expatriate_headcount,
          salary_scale, yemenization_policy, link_status, compliance_score,
          labor_law_compliant, salary_compliant, osh_compliant, yemenization_compliant,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, 'نشط', 95.0,
          true, true, true, true,
          NOW(), NOW()
        ) RETURNING *`,
        [
          estId, prof.id, est.name_ar, est.commercial_register_number || est.unified_code || '',
          prof.code || prof.isco_code, prof.name_ar, prof.isco_code, details.department || 'الإدارة والتشغيل',
          headcount, yemeni, expat,
          details.salary_scale || 'وفق سلم الرواتب المعتمد', details.yemenization_policy || 'أولوية للكوادر الوطنية',
        ]
      );
      results.push(r.rows[0]);
    }

    res.status(201).json({
      success: true,
      message: `تم تخصيص وتسكين المهنة في ${results.length} منشأة بنجاح`,
      allocations: results,
    });
  } catch (err) {
    console.error('Batch Allocation Error:', err);
    res.status(500).json({ error: 'خطأ في تخصيص المهنة للمنشآت' });
  }
});

// ===================== ISIC-4 Classifications =====================
router.get('/api/isic4', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { search, level, sector } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (search) { where += ` AND (isic_code ILIKE $${idx} OR description_ar ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (level) { where += ` AND level = $${idx++}`; params.push(level); }
    if (sector) { where += ` AND sector = $${idx++}`; params.push(sector); }
    const { sql: _qs, params: _qp } = countQuery('isic4_classifications', where, params);

    const total = await pool.query(_qs, _qp);
    const r = await pool.query(
      `SELECT * FROM isic4_classifications WHERE ${where} ORDER BY isic_code LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ data: r.rows, total: total.rows[0].count, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.post('/api/isic4', requirePermission('write:professions'), async (req, res) => {
  try {
    const d = req.body;
    const cols = [
      'isic_code','description_ar','description_en','level','sector',
      'parent_code','status','notes'
    ];
    const fields = cols.filter(c => d[c] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    fields.push('created_at'); fields.push('updated_at');
    placeholders.push('NOW()'); placeholders.push('NOW()');
    const values = fields.slice(0, -2).map(c => d[c]);
    const r = await pool.query(
      `INSERT INTO isic4_classifications (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values
    );
    res.status(201).json({ success: true, classification: r.rows[0] });
  } catch (err) {
    console.error('ISIC4 create error:', err);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.put('/api/isic4/:id', requirePermission('write:professions'), async (req, res) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    const colMap = {
      isic_code:'isic_code', description_ar:'description_ar', description_en:'description_en',
      level:'level', sector:'sector', parent_code:'parent_code',
      status:'status', notes:'notes'
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
      `UPDATE isic4_classifications SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true, classification: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.delete('/api/isic4/:id', requirePermission('write:professions'), async (req, res) => {
  try {
    const r = await pool.query('UPDATE isic4_classifications SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
