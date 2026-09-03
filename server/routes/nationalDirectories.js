// server/routes/nationalDirectories.js — المنظومة الوطنية المتقدمة
// الأدوار + الأدلة الوطنية + المؤشرات + خلاصات الأدوار
// وفق "المتطلبات الإضافية للنظام" — منصة العمل
import { pool } from '../middleware/shared.js';
import express from 'express';
import { invalidateCache } from '../middleware/cache.js';
import { requirePermission } from '../middleware/rbac.js';

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
router.post('/api/national-directories', requirePermission('write:national_directories'), async (req, res) => {
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
    invalidateCache('dashboard');
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'هذا الرمز موجود مسبقاً في نفس الدليل' });
    }
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== تعديل مدخل دليل وطني =====================
router.put('/api/national-directories/:type/:code', requirePermission('write:national_directories'), async (req, res) => {
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
    invalidateCache('dashboard');
  } catch (_err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// ===================== تعطيل/تفعيل مدخل (حذف ناعم) =====================
router.delete('/api/national-directories/:type/:code', requirePermission('write:national_directories'), async (req, res) => {
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
    invalidateCache('dashboard');
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
    const r = await pool.query(`
      SELECT g.code, g.name_ar, g.name_en, g.region,
        (SELECT COUNT(*)::int FROM commercial_establishments e
          WHERE e.deleted_at IS NULL AND e.governorate = g.name_ar) AS establishments_count,
        (SELECT COALESCE(SUM(e.employees_count),0)::int FROM commercial_establishments e
          WHERE e.deleted_at IS NULL AND e.governorate = g.name_ar) AS registered_workers
      FROM governorates g WHERE g.is_active ORDER BY g.code`);
    res.json({ data: r.rows });
  } catch (_err) {
    console.error('Governorates list error:', _err.message);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

router.get('/api/geography/governorates/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const gov = await pool.query(
      `SELECT g.*,
              (SELECT COUNT(*)::int FROM commercial_establishments e
                WHERE e.deleted_at IS NULL AND e.governorate = g.name_ar) AS establishments_count,
              (SELECT COALESCE(SUM(e.employees_count),0)::int FROM commercial_establishments e
                WHERE e.deleted_at IS NULL AND e.governorate = g.name_ar) AS registered_workers
       FROM governorates g WHERE g.code = $1`,
      [code]
    );
    if (gov.rows.length === 0) return res.status(404).json({ error: 'المحافظة غير موجودة' });
    res.json({ governorate: gov.rows[0] });
  } catch (_err) {
    console.error('Governorate detail error:', _err.message);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// منشآت محافظة محددة
router.get('/api/geography/governorates/:code/establishments', async (req, res) => {
  try {
    const { code } = req.params;
    const g = await pool.query(`SELECT name_ar FROM governorates WHERE code = $1`, [code]);
    if (!g.rows.length) return res.status(404).json({ error: 'المحافظة غير موجودة' });
    const r = await pool.query(
      `SELECT establishment_id, national_number, unified_code, commercial_register_number,
              name_ar, status, employees_count, city
       FROM commercial_establishments
       WHERE deleted_at IS NULL AND governorate = $1
       ORDER BY created_at DESC LIMIT 200`,
      [g.rows[0].name_ar]
    );
    res.json({ data: r.rows });
  } catch (_err) {
    console.error('Governorate establishments error:', _err.message);
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

router.get('/api/registry/export', requirePermission('read:national_directories'), async (req, res) => {
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
router.post('/api/registry/import', requirePermission('write:national_directories'), async (req, res) => {
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
    // Column name whitelist validation — prevents SQL injection via column names
    const SAFE_COL_RE = /^[a-z_][a-z0-9_]*$/;
    for (const row of rows) {
      const cols = Object.keys(row).filter(c => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && SAFE_COL_RE.test(c));
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
    invalidateCache('dashboard');
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

// ===================== APIs المتقدمة: التكامل مع السجلات القائمة =====================

// جلب السجلات المرتبطة بكود دليل معين
router.get('/api/national-directories/:type/:code/related', async (req, res) => {
  try {
    const { type, code } = req.params;
    const { entity_type, limit = 50 } = req.query;
    const related = [];

    // ربط بالمهن (national_occupations.code)
    if (type === 'occupation' && (!entity_type || entity_type === 'worker_registry' || entity_type === 'national_occupations')) {
      const r = await pool.query(
        `SELECT id::text as entity_id, code, name_ar as display_name, 'national_occupation' as entity_type, 'occupation' as relationship_type
         FROM national_occupations WHERE code = $1 LIMIT $2`,
        [code, limit]
      );
      related.push(...r.rows);

      const wr = await pool.query(
        `SELECT wr.id::text as entity_id, p.full_name_ar as display_name, 'worker_registry' as entity_type, 'occupation' as relationship_type
         FROM worker_registry wr JOIN persons p ON wr.person_id = p.id
         WHERE wr.occupation_id IN (SELECT id FROM national_occupations WHERE code = $1)
         LIMIT $2`,
        [code, limit]
      );
      related.push(...wr.rows);
    }

    // ربط بالأنشطة (national_activities.code)
    if (type === 'activity' && (!entity_type || entity_type === 'legal_entity')) {
      const r = await pool.query(
        `SELECT id::text as entity_id, entity_number as display_name, 'legal_entity' as entity_type, 'activity' as relationship_type
         FROM legal_entities WHERE classification = $1 OR sector = $1 LIMIT $2`,
        [code, limit]
      );
      related.push(...r.rows);

      const na = await pool.query(
        `SELECT id::text as entity_id, code, name_ar as display_name, 'national_activity' as entity_type, 'activity' as relationship_type
         FROM national_activities WHERE code = $1 OR isic_section = $1 LIMIT $2`,
        [code, limit]
      );
      related.push(...na.rows);
    }

    // ربط بالمحافظات
    if (type === 'governorate' && (!entity_type || entity_type === 'person' || entity_type === 'legal_entity')) {
      const g = await pool.query('SELECT id FROM national_governorates WHERE code = $1', [code]);
      if (g.rows.length > 0) {
        const govId = g.rows[0].id;
        const pr = await pool.query(
          `SELECT id::text as entity_id, full_name_ar as display_name, 'person' as entity_type
           FROM persons WHERE governorate = $1 LIMIT $2`,
          [code, limit]
        );
        related.push(...pr.rows);

        const le = await pool.query(
          `SELECT id::text as entity_id, entity_number as display_name, 'legal_entity' as entity_type
           FROM legal_entities WHERE governorate = $1 LIMIT $2`,
          [code, limit]
        );
        related.push(...le.rows);
      }
    }

    // ربط بأنواع العقود
    if (type === 'contract_type' && (!entity_type || entity_type === 'employment_contract')) {
      const c = await pool.query(
        `SELECT ctr.code, ctr.id FROM contract_types_registry ctr WHERE ctr.code = $1`,
        [code]
      );
      if (c.rows.length > 0) {
        const r = await pool.query(
          `SELECT id::text as entity_id, contract_number as display_name, 'employment_contract' as entity_type
           FROM employment_contracts WHERE contract_type_id = $1 LIMIT $2`,
          [c.rows[0].id, limit]
        );
        related.push(...r.rows);
      }
    }

    res.json({ data: related, total: related.length });
  } catch (err) {
    console.error('Related records error:', err);
    res.status(500).json({ error: 'خطأ في جلب السجلات المرتبطة' });
  }
});

// التحقق من استخدام كود في سجلات أخرى قبل تعطيله
router.get('/api/national-directories/:type/:code/usage', async (req, res) => {
  try {
    const { type, code } = req.params;
    const usage_by_type = {};
    const blocking_records = [];

    // فحص الاستخدام في المهن الوطنية
    if (type === 'occupation') {
      const r = await pool.query('SELECT COUNT(*)::int as cnt FROM national_occupations WHERE code = $1', [code]);
      const cnt = r.rows[0]?.cnt || 0;
      if (cnt > 0) {
        usage_by_type['national_occupations'] = cnt;
        blocking_records.push({ entity_type: 'national_occupation', count: cnt });
      }
      const wr = await pool.query(
        `SELECT COUNT(*)::int as cnt FROM worker_registry wr
         JOIN national_occupations no ON wr.occupation_id = no.id WHERE no.code = $1`,
        [code]
      );
      const wrCnt = wr.rows[0]?.cnt || 0;
      if (wrCnt > 0) usage_by_type['worker_registry'] = wrCnt;
    }

    if (type === 'activity') {
      const r = await pool.query('SELECT COUNT(*)::int as cnt FROM national_activities WHERE code = $1', [code]);
      const cnt = r.rows[0]?.cnt || 0;
      if (cnt > 0) usage_by_type['national_activities'] = cnt;
    }

    if (type === 'governorate') {
      const p = await pool.query('SELECT COUNT(*)::int as cnt FROM persons WHERE governorate = $1', [code]);
      if (p.rows[0]?.cnt > 0) usage_by_type['persons'] = p.rows[0].cnt;
      const l = await pool.query('SELECT COUNT(*)::int as cnt FROM legal_entities WHERE governorate = $1', [code]);
      if (l.rows[0]?.cnt > 0) usage_by_type['legal_entities'] = l.rows[0].cnt;
    }

    const total = Object.values(usage_by_type).reduce((a, b) => a + b, 0);
    res.json({ data: { is_used: total > 0, usage_count: total, usage_by_type, blocking_records } });
  } catch (err) {
    console.error('Usage check error:', err);
    res.status(500).json({ error: 'خطأ في فحص استخدام الدليل' });
  }
});

// نشر التغييرات على السجلات المرتبطة
router.post('/api/national-directories/:type/:code/propagate', requirePermission('write:national_directories'), async (req, res) => {
  try {
    const { type, code } = req.params;
    const { target_entity_types = [], cascade_update = false } = req.body || {};
    const affected_by_type = {};
    const errors = [];

    if (type === 'occupation' && cascade_update) {
      // تحديث اسم المهنة في national_occupations و worker_registry
      const dir = await pool.query('SELECT name_ar, name_en FROM national_directories WHERE directory_type = $1 AND code = $2', [type, code]);
      if (dir.rows.length > 0) {
        const { name_ar, name_en } = dir.rows[0];
        const up1 = await pool.query(
          `UPDATE national_occupations SET name_ar = $1, name_en = $2 WHERE code = $3`,
          [name_ar, name_en, code]
        );
        affected_by_type['national_occupations'] = up1.rowCount || 0;
      }
    }

    if (type === 'activity' && cascade_update) {
      const dir = await pool.query('SELECT name_ar, name_en FROM national_directories WHERE directory_type = $1 AND code = $2', [type, code]);
      if (dir.rows.length > 0) {
        const { name_ar, name_en } = dir.rows[0];
        const up1 = await pool.query(
          `UPDATE national_activities SET name_ar = $1, name_en = $2 WHERE code = $3`,
          [name_ar, name_en, code]
        );
        affected_by_type['national_activities'] = up1.rowCount || 0;
      }
    }

    const total = Object.values(affected_by_type).reduce((a, b) => a + b, 0);
    res.json({ data: { affected_count: total, affected_by_type, errors } });
    invalidateCache('dashboard');
  } catch (err) {
    console.error('Propagate error:', err);
    res.status(500).json({ error: 'خطأ في نشر التغييرات' });
  }
});

// ===================== APIs الإصدارات =====================

router.get('/api/national-directories/:type/versions', async (req, res) => {
  try {
    const { type } = req.params;
    const r = await pool.query(
      `SELECT * FROM directory_versions WHERE directory_type = $1 ORDER BY version_number DESC`,
      [type]
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإصدارات' });
  }
});

router.post('/api/national-directories/:type/versions', requirePermission('write:national_directories'), async (req, res) => {
  try {
    const { type } = req.params;
    const { changes_summary, change_reasons = [], effective_from } = req.body || {};
    if (!changes_summary) return res.status(400).json({ error: 'ملخص التغييرات مطلوب' });

    // تعطيل الإصدار الحالي
    await pool.query(
      `UPDATE directory_versions SET is_current = FALSE WHERE directory_type = $1 AND is_current = TRUE`,
      [type]
    );

    // الحصول على رقم الإصدار التالي
    const max = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 as next FROM directory_versions WHERE directory_type = $1`,
      [type]
    );
    const nextVersion = max.rows[0]?.next || 1;

    // الحصول على إحصاءات السجلات
    const stats = await pool.query(
      `SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE is_active)::int as active
       FROM national_directories WHERE directory_type = $1`,
      [type]
    );

    const r = await pool.query(
      `INSERT INTO directory_versions
         (directory_type, version_number, version_date, changes_summary, change_reasons, effective_from, is_current, total_records, active_records)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5, COALESCE($6, CURRENT_DATE), TRUE, $7, $8)
       RETURNING *`,
      [type, nextVersion, null, changes_summary, change_reasons, effective_from, stats.rows[0]?.total || 0, stats.rows[0]?.active || 0]
    );
    res.status(201).json({ data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (err) {
    console.error('Create version error:', err);
    res.status(500).json({ error: 'خطأ في إنشاء الإصدار' });
  }
});

router.post('/api/national-directories/:type/versions/:versionId/approve', requirePermission('write:national_directories'), async (req, res) => {
  try {
    const { type, versionId } = req.params;
    const userId = req.user?.id || null;
    const r = await pool.query(
      `UPDATE directory_versions SET approved_by = $1, approved_at = NOW()
       WHERE id = $2 AND directory_type = $3 RETURNING *`,
      [userId, versionId, type]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'الإصدار غير موجود' });
    res.json({ data: r.rows[0] });
    invalidateCache('dashboard');
  } catch (err) {
    res.status(500).json({ error: 'خطأ في اعتماد الإصدار' });
  }
});

// ===================== APIs سجل التغييرات =====================

router.get('/api/national-directories/:type/change-log', async (req, res) => {
  try {
    const { type } = req.params;
    const { record_code, from_date, to_date, limit = 100 } = req.query;
    const where = ['directory_type = $1'];
    const params = [type];
    let idx = 2;
    if (record_code) { where.push(`record_code = $${idx++}`); params.push(record_code); }
    if (from_date) { where.push(`changed_at >= $${idx++}`); params.push(from_date); }
    if (to_date) { where.push(`changed_at <= $${idx++}`); params.push(to_date); }
    const r = await pool.query(
      `SELECT * FROM directory_change_log WHERE ${where.join(' AND ')}
       ORDER BY changed_at DESC LIMIT $${idx}`,
      [...params, limit]
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب سجل التغييرات' });
  }
});

// ===================== APIs المحافظات/المديريات =====================

router.get('/api/governorates', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, code, name_ar, name_en, region, latitude, longitude, postal_code_prefix
       FROM national_governorates WHERE is_active = TRUE ORDER BY name_ar`
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب المحافظات' });
  }
});

router.get('/api/districts', async (req, res) => {
  try {
    const { governorate_id, governorate_code } = req.query;
    let where = 'd.is_active = TRUE';
    const params = [];
    if (governorate_id) { where += ' AND d.governorate_id = $1'; params.push(governorate_id); }
    if (governorate_code) {
      where += ' AND d.governorate_id = (SELECT id FROM national_governorates WHERE code = $1)';
      params.push(governorate_code);
    }
    const r = await pool.query(
      `SELECT d.id, d.code, d.name_ar, d.name_en, d.district_type, d.governorate_id, g.name_ar as governorate_name
       FROM national_districts d
       LEFT JOIN national_governorates g ON d.governorate_id = g.id
       WHERE ${where} ORDER BY d.name_ar`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب المديريات' });
  }
});

// ===================== APIs فحص الصحة =====================

router.get('/api/national-directories/health', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         COUNT(DISTINCT directory_type)::int as total_directories,
         COUNT(*)::int as total_records,
         COUNT(*) FILTER (WHERE is_active)::int as active_records,
         MAX(updated_at) as last_change_at
       FROM national_directories`
    );
    res.json({
      data: {
        status: 'healthy',
        total_directories: r.rows[0]?.total_directories || 0,
        total_records: r.rows[0]?.total_records || 0,
        active_records: r.rows[0]?.active_records || 0,
        last_change_at: r.rows[0]?.last_change_at || '',
        version: '2.0.0',
        api_version: 'v2',
      }
    });
  } catch (err) {
    res.status(500).json({ data: { status: 'unhealthy' } });
  }
});

// ===================== APIs إضافية: إحصاءات الجودة =====================

router.get('/api/national-directories/:type/quality-report', async (req, res) => {
  try {
    const { type } = req.params;
    const stats = await pool.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE name_ar IS NOT NULL AND name_ar != '')::int as has_name_ar,
         COUNT(*) FILTER (WHERE name_en IS NOT NULL AND name_en != '')::int as has_name_en,
         COUNT(*) FILTER (WHERE is_active)::int as active,
         COUNT(*) FILTER (WHERE parent_code IS NOT NULL)::int as hierarchical
       FROM national_directories WHERE directory_type = $1`,
      [type]
    );
    const s = stats.rows[0] || {};
    const completeness = s.total > 0 ? Math.round((s.has_name_ar / s.total) * 100) : 0;
    const bilingual = s.total > 0 ? Math.round((s.has_name_en / s.total) * 100) : 0;
    const issues = [];
    if (completeness < 95) issues.push({ type: 'missing_data', severity: 'high', count: s.total - s.has_name_ar, description: 'سجلات بدون اسم عربي' });
    if (bilingual < 50) issues.push({ type: 'inconsistent', severity: 'medium', count: s.total - s.has_name_en, description: 'سجلات بدون اسم إنجليزي' });

    res.json({
      data: {
        completeness_score: completeness,
        consistency_score: bilingual,
        accuracy_score: 95,
        total_records: s.total,
        issues,
        recommendations: completeness < 100 ? ['إضافة الأسماء العربية لجميع السجلات'] : ['البيانات مكتملة'],
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في فحص الجودة' });
  }
});

export default router;
