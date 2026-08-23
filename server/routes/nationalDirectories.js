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

// ===================== الجغرافيا الوطنية والتكامل عبر السجلات =====================
router.get('/api/geography/governorates', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM v_national_geo_rollup`);
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/geography/governorates/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const [gov, dirs, offices] = await Promise.all([
      pool.query(
        `SELECT g.*, 
                (SELECT COUNT(*)::int FROM commercial_establishments e
                  WHERE fn_normalize_gov(e.governorate) = g.name_ar) AS establishments_count,
                (SELECT COALESCE(SUM(e.employees_count),0)::int FROM commercial_establishments e
                  WHERE fn_normalize_gov(e.governorate) = g.name_ar) AS registered_workers
         FROM national_governorates g WHERE g.gov_code = $1`,
        [code]
      ),
      pool.query(
        `SELECT dir_code, name_ar, is_capital FROM national_directorates
         WHERE gov_code = $1 AND is_active ORDER BY is_capital DESC, name_ar`,
        [code]
      ),
      pool.query(
        `SELECT office_code, name_ar, office_type, address, phone
         FROM national_ministry_offices WHERE gov_code = $1 AND is_active`,
        [code]
      ),
    ]);
    if (gov.rows.length === 0) return res.status(404).json({ error: 'المحافظة غير موجودة' });
    res.json({ governorate: gov.rows[0], directorates: dirs.rows, offices: offices.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// منشآت محافظة محددة مع مكتب الاختصاص (من عرض التكامل)
router.get('/api/geography/governorates/:code/establishments', async (req, res) => {
  try {
    const { code } = req.params;
    const r = await pool.query(
      `SELECT * FROM v_establishment_geography WHERE gov_code = $1 LIMIT 200`,
      [code]
    );
    res.json({ data: r.rows });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== استيراد/تصدير عام لأي سجل =====================
// تصدير أي جدول مسموح إلى JSON/CSV
const EXPORTABLE_TABLES = new Set([
  'national_directories', 'labor_roles', 'national_governorates',
  'national_directorates', 'national_ministry_offices', 'osh_inspection_domains',
  'inspection_criteria', 'sector_property_matrix', 'commercial_establishments',
  'organizational_entities', 'professions', 'isic4_classifications',
]);

router.get('/api/registry/export', async (req, res) => {
  try {
    const { table, format = 'json' } = req.query;
    if (!table || !EXPORTABLE_TABLES.has(String(table))) {
      return res.status(400).json({ error: 'جدول غير صالح للتصدير' });
    }
    const r = await pool.query(`SELECT * FROM ${String(table)} LIMIT 5000`);
    if (format === 'csv') {
      const rows = r.rows;
      if (rows.length === 0) return res.json({ data: [] });
      const cols = Object.keys(rows[0]);
      const csv = [
        cols.join(','),
        ...rows.map(row => cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return '';
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        }).join(',')),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${String(table)}.csv"`);
      return res.send('\uFEFF' + csv);
    }
    res.json({ data: r.rows, count: r.rows.length });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في التصدير' });
  }
});

// استيراد JSON إلى أي جدول مسموح (إدراج جماعي)
router.post('/api/registry/import', async (req, res) => {
  try {
    const { table, rows } = req.body || {};
    if (!table || !EXPORTABLE_TABLES.has(String(table))) {
      return res.status(400).json({ error: 'جدول غير صالح للاستيراد' });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'لا توجد بيانات للاستيراد' });
    }
    if (rows.length > 1000) {
      return res.status(400).json({ error: 'الحد الأقصى 1000 سجل لكل دفعة' });
    }
    let imported = 0;
    for (const row of rows) {
      const cols = Object.keys(row).filter(c => c !== 'id' && c !== 'created_at' && c !== 'updated_at');
      if (cols.length === 0) continue;
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
      const values = cols.map(c => row[c] ?? null);
      try {
        await pool.query(
          `INSERT INTO ${String(table)} (${cols.join(',')}) VALUES (${placeholders})`,
          values
        );
        imported++;
      } catch (_e) {
        // تجاهل الصفوف المكررة/المتعارضة
      }
    }
    res.json({ ok: true, imported, total: rows.length });
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في الاستيراد' });
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
