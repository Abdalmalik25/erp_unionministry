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
    const { type } = req.query;
    let sql = `SELECT directory_type, code, name_ar, name_en, parent_code, level, sort_order
               FROM national_directories WHERE is_active = TRUE`;
    const params = [];
    if (type) { sql += ` AND directory_type = $1`; params.push(type); }
    sql += ` ORDER BY directory_type, sort_order, code`;
    const r = await pool.query(sql, params);
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
