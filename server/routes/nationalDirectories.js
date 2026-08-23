// server/routes/nationalDirectories.js — المنظومة الوطنية المتقدمة
// الأدوار + الأدلة الوطنية + المؤشرات + خلاصات الأدوار
// وفق "المتطلبات الإضافية للنظام" — منصة العمل
import { pool } from '../middleware/shared.js';
import express from 'express';

const router = express.Router();

// ===================== أدوار منظومة العمل =====================
router.get('/api/labor-roles', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT role_key, role_name_ar, role_name_en, description, icon, focus_areas
       FROM labor_roles WHERE is_active = TRUE ORDER BY role_name_ar`
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== خلاصة الدور (links) =====================
router.get('/api/labor-roles/:roleKey/dashboard', async (req, res) => {
  try {
    const { roleKey } = req.params;
    const [role, links] = await Promise.all([
      pool.query(
        `SELECT role_key, role_name_ar, role_name_en, description, icon, focus_areas
         FROM labor_roles WHERE role_key = $1 AND is_active = TRUE`,
        [roleKey]
      ),
      pool.query(
        `SELECT link_label, link_path, description, icon_name, target
         FROM role_dashboard_quick_links
         WHERE role_key = $1
         ORDER BY sort_order`,
        [roleKey]
      ),
    ]);
    if (role.rows.length === 0) return res.status(404).json({ error: 'الدور غير موجود' });
    res.json({ role: role.rows[0], links: links.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== الأدلة الوطنية الموحدة =====================
router.get('/api/national-directories', async (req, res) => {
  try {
    const { type, include_inactive } = req.query;
    let sql = `SELECT directory_type, code, name_ar, name_en, parent_code, level, sort_order, is_active
               FROM national_directories`;
    const params = [];
    const where = [];
    if (include_inactive !== 'true') { where.push('is_active = TRUE'); }
    if (type) { where.push(`directory_type = $1`); params.push(type); }
    sql += where.length ? ` WHERE ${where.join(' AND ')}` : '';
    sql += ` ORDER BY directory_type, sort_order, code`;
    const r = await pool.query(sql, params);
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

const DIRECTORY_TYPES = ['occupation', 'activity', 'establishment', 'legal_form', 'ownership'];

// ===================== إحصاءات الأدلة =====================
router.get('/api/national-directories/stats', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT directory_type, COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_active)::int AS active
       FROM national_directories GROUP BY directory_type ORDER BY directory_type`
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== إنشاء مدخل دليل وطني =====================
router.post('/api/national-directories', async (req, res) => {
  try {
    const { directory_type, code, name_ar, name_en, parent_code, level, sort_order } = req.body || {};
    if (!DIRECTORY_TYPES.includes(directory_type)) {
      return res.status(400).json({ error: 'نوع الدليل غير صحيح' });
    }
    if (!code || !String(code).trim() || !name_ar || !String(name_ar).trim()) {
      return res.status(400).json({ error: 'الرمز والاسم العربي مطلوبان' });
    }
    const r = await pool.query(
      `INSERT INTO national_directories
         (directory_type, code, name_ar, name_en, parent_code, level, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        directory_type,
        String(code).trim(),
        String(name_ar).trim(),
        name_en ? String(name_en).trim() : null,
        parent_code ? String(parent_code).trim() : null,
        Number.isFinite(Number(level)) && Number(level) > 0 ? Number(level) : 1,
        Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
      ]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'هذا الرمز موجود مسبقاً في نفس الدليل' });
    }
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== تعديل مدخل دليل وطني =====================
router.put('/api/national-directories/:type/:code', async (req, res) => {
  try {
    const { type, code } = req.params;
    if (!DIRECTORY_TYPES.includes(type)) {
      return res.status(400).json({ error: 'نوع الدليل غير صحيح' });
    }
    const { name_ar, name_en, parent_code, level, sort_order, is_active } = req.body || {};
    if (!name_ar || !String(name_ar).trim()) {
      return res.status(400).json({ error: 'الاسم العربي مطلوب' });
    }
    const levelNum = Number(level);
    const sortNum = Number(sort_order);
    const r = await pool.query(
      `UPDATE national_directories SET
         name_ar = $3,
         name_en = $4,
         parent_code = $5,
         level = COALESCE($6, level),
         sort_order = COALESCE($7, sort_order),
         is_active = COALESCE($8, is_active),
         updated_at = NOW()
       WHERE directory_type = $1 AND code = $2
       RETURNING *`,
      [
        type,
        code,
        String(name_ar).trim(),
        name_en ? String(name_en).trim() : null,
        parent_code ? String(parent_code).trim() : null,
        Number.isFinite(levelNum) && levelNum > 0 ? levelNum : null,
        Number.isFinite(sortNum) ? sortNum : null,
        typeof is_active === 'boolean' ? is_active : null,
      ]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'المدخل غير موجود' });
    res.json({ data: r.rows[0] });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== تعطيل/تفعيل مدخل (حذف ناعم) =====================
router.delete('/api/national-directories/:type/:code', async (req, res) => {
  try {
    const { type, code } = req.params;
    if (!DIRECTORY_TYPES.includes(type)) {
      return res.status(400).json({ error: 'نوع الدليل غير صحيح' });
    }
    const r = await pool.query(
      `UPDATE national_directories SET is_active = FALSE, updated_at = NOW()
       WHERE directory_type = $1 AND code = $2 RETURNING code`,
      [type, code]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'المدخل غير موجود' });
    res.json({ message: `تم تعطيل المدخل ${code}` });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== منهجية معايير التفتيش المعيارية (OSH) =====================
router.get('/api/osh-inspection/domains', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.domain_code, d.name_ar, d.name_en, d.description, d.total_weight,
              COUNT(c.id)::int AS criteria_count
       FROM osh_inspection_domains d
       LEFT JOIN inspection_criteria c
         ON c.domain = d.domain_code AND c.is_active = TRUE
       WHERE d.is_active = TRUE
       GROUP BY d.id, d.domain_code, d.name_ar, d.name_en, d.description, d.total_weight
       ORDER BY d.sort_order`
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/osh-inspection/criteria', async (req, res) => {
  try {
    const { domain } = req.query;
    let where = `is_active = TRUE AND criterion_code LIKE 'OSH-%'`;
    const params = [];
    if (domain) { where += ` AND domain = $1`; params.push(domain); }
    const r = await pool.query(
      `SELECT criterion_code, title, description, domain, weight,
              measurement_method, min_severity, legal_reference, standard_ref, corrective_action
       FROM inspection_criteria
       WHERE ${where}
       ORDER BY criterion_code`,
      params
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== تفاصيل مهنة وطنية =====================
router.get('/api/national-occupations', async (req, res) => {
  try {
    const { profession_id, in_demand } = req.query;
    let where = `od.is_active = TRUE AND p.deleted_at IS NULL`;
    const params = [];
    let idx = 1;
    if (profession_id) { where += ` AND p.id = $${idx++}`; params.push(profession_id); }
    if (in_demand === 'true') { where += ` AND od.in_demand_priority >= 2`; }
    const r = await pool.query(
      `SELECT p.id AS profession_id, p.occupation_name_ar, p.isco_code, p.occupation_code,
              od.isco_level, od.skill_type_name, od.roles_expectations, od.industry_isic_codes,
              od.safety_risks, od.medical_fitness_required, od.certification_required,
              od.typical_salary_min, od.typical_salary_max, od.in_demand_priority
       FROM national_occupation_details od
       JOIN professions p ON od.occupation_id = p.id
       WHERE ${where}
       ORDER BY od.in_demand_priority DESC, p.occupation_name_ar
       LIMIT 100`,
      params
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== خصائص القطاعات =====================
router.get('/api/sector-properties', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT sector_key, isic4_codes, occupation_codes, risk_level,
              legal_references, labor_intensity, yemenization_default, notes
       FROM sector_property_matrix
       ORDER BY sector_key`
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== مؤشرات التشغيل الوطني =====================
router.get('/api/national-indicators', async (req, res) => {
  try {
    const { code, role_key } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (code) { where += ` AND indicator_code = $${idx++}`; params.push(code); }
    if (role_key) { where += ` AND $${idx++} = ANY(related_role_keys)`; params.push(role_key); }
    const r = await pool.query(
      `SELECT indicator_code, indicator_name_ar, reporting_period_start, reporting_period_end,
              value_numeric, value_text, unit, direction_good, related_role_keys, related_region, source_table
       FROM national_operational_indicator_log
       WHERE ${where}
       ORDER BY reporting_period_start DESC
       LIMIT 100`,
      params
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
