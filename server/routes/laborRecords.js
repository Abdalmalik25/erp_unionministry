// server/routes/laborRecords.js — سجلات قطاع شؤون العمل
// مصنع CRUD عام مبني على النموذج المرجعي الشخصي-المركزي (persons):
// كل مسار kebab-case (/api/ministry-employees) والجدول يُشتق بتحويل الشرطة.
// يدعم: دمج persons للعرض، إنشاء/ربط الشخص تلقائياً، توليد الأرقام التسلسلية، soft-delete موحد.
import { pool, paginate, countQuery, softDeleteFilter, auditLog } from '../middleware/shared.js';
import express from 'express';

const router = express.Router();

// ---------- تعريفات السجلات (البنية الحقيقية في القاعدة) ----------
const RECORDS = {
  'directorates': {
    columns: ['code', 'name_ar', 'governorate', 'notes'],
    search: ['name_ar', 'code', 'governorate'],
    filters: ['governorate'],
    required: ['name_ar'],
  },
  'ministry-offices': {
    columns: ['office_code', 'name_ar', 'name_en', 'office_type', 'parent_office_id',
      'governorate', 'directorate', 'address', 'phone', 'manager_person_id', 'is_active'],
    search: ['name_ar', 'office_code', 'directorate'],
    filters: ['governorate', 'office_type'],
    required: ['name_ar'],
  },
  'inspectors': {
    personFk: 'person_id',
    requiredPerson: true,
    autoCodes: [{ column: 'inspector_number', prefix: 'INS-', pad: 5 }],
    columns: ['inspector_number', 'person_id', 'office_id', 'specialization', 'governorate', 'is_active'],
    search: ['inspector_number', 'specialization', 'p.full_name_ar'],
    filters: ['office_id', 'specialization', 'governorate'],
    required: [],
  },
  'ministry-employees': {
    personFk: 'person_id',
    requiredPerson: true,
    autoCodes: [
      { column: 'employee_number', prefix: 'EMP-', pad: 6 },
      { column: 'national_number', prefix: 'ME-', pad: 6 },
    ],
    columns: ['employee_number', 'national_number', 'person_id', 'office_id', 'position', 'department', 'is_active'],
    search: ['employee_number', 'national_number', 'position', 'department', 'p.full_name_ar'],
    filters: ['office_id', 'department'],
    required: [],
  },
  'inspection-criteria': {
    autoCodes: [{ column: 'criteria_code', prefix: 'CRIT-', pad: 4 }],
    columns: ['criteria_code', 'title_ar', 'description', 'sector', 'establishment_type',
      'activity_isic4', 'inspection_kind', 'applies_to', 'frequency_months', 'weight',
      'is_mandatory', 'legal_reference', 'status'],
    search: ['title_ar', 'criteria_code', 'legal_reference'],
    filters: ['sector', 'establishment_type', 'inspection_kind', 'applies_to', 'status'],
    required: ['title_ar'],
  },
  'work-injuries': {
    personFk: 'worker_person_id',
    requiredPerson: true,
    autoCodes: [{ column: 'injury_number', prefix: 'INJ-', pad: 6 }],
    columns: ['injury_number', 'worker_person_id', 'establishment_id', 'injury_date',
      'injury_type', 'severity', 'location', 'description', 'medical_report_url', 'status'],
    search: ['injury_number', 'location', 'description', 'p.full_name_ar'],
    filters: ['status', 'severity', 'injury_type'],
    required: ['injury_date'],
  },
  'insurance-records': {
    personFk: 'insured_person_id',
    autoCodes: [{ column: 'policy_number', prefix: 'POL-', pad: 6 }],
    columns: ['policy_number', 'insurance_type', 'insured_person_id', 'insured_national_id',
      'enterprise_name', 'provider_name', 'coverage_start', 'coverage_end', 'premium_amount',
      'coverage_amount', 'beneficiaries_count', 'status'],
    search: ['policy_number', 'provider_name', 'enterprise_name', 'p.full_name_ar'],
    filters: ['insurance_type', 'status'],
    required: [],
  },
  'irregular-workers': {
    personFk: 'person_id',
    autoCodes: [{ column: 'registration_number', prefix: 'IRW-', pad: 6 }],
    columns: ['registration_number', 'person_id', 'full_name', 'national_id', 'gender',
      'birth_date', 'nationality', 'governorate', 'district', 'phone', 'activity_type',
      'workplace_description', 'daily_income', 'monthly_income', 'has_insurance',
      'has_fitness_certificate', 'registered_via', 'regularization_path', 'status'],
    search: ['full_name', 'registration_number', 'national_id', 'activity_type'],
    filters: ['governorate', 'status', 'activity_type'],
    required: ['full_name'],
  },
  'health-fitness-certificates': {
    personFk: 'worker_person_id',
    requiredPerson: true,
    autoCodes: [{ column: 'certificate_number', prefix: 'FIT-', pad: 6 }],
    columns: ['certificate_number', 'worker_person_id', 'issue_date', 'expiry_date',
      'issuing_authority', 'medical_center', 'fitness_result', 'restrictions',
      'document_url', 'document_hash'],
    search: ['certificate_number', 'medical_center', 'issuing_authority', 'p.full_name_ar'],
    filters: ['fitness_result'],
    required: [],
  },
  'experience-certificates': {
    personFk: 'person_id',
    requiredPerson: true,
    autoCodes: [{ column: 'certificate_number', prefix: 'EXP-', pad: 6 }],
    columns: ['certificate_number', 'person_id', 'occupation', 'occupation_code',
      'enterprise_name', 'experience_years', 'experience_level', 'issued_by',
      'issue_date', 'is_verified', 'status'],
    search: ['certificate_number', 'occupation', 'enterprise_name', 'p.full_name_ar'],
    filters: ['status', 'experience_level'],
    required: [],
  },
  'work-procedures': {
    personFk: 'person_id',
    autoCodes: [{ column: 'procedure_code', prefix: 'PRC-', pad: 5 }],
    columns: ['procedure_code', 'procedure_name', 'procedure_type', 'person_id',
      'worker_national_id', 'enterprise_name', 'start_date', 'end_date', 'reference_number',
      'approved_by', 'approval_date', 'legal_basis', 'description', 'status'],
    search: ['procedure_name', 'procedure_code', 'enterprise_name', 'reference_number', 'p.full_name_ar'],
    filters: ['status', 'procedure_type'],
    required: ['procedure_name'],
  },
};

const PERSON_SELECT = ', p.full_name_ar AS person_name, p.national_id AS person_national_id';
const PERSON_JOIN = def => def.personFk ? ` LEFT JOIN persons p ON p.id = t.${def.personFk}` : '';

// ---------- مساعدات ----------
async function ensurePerson(d) {
  if (d.person_id) return d.person_id;
  const name = d.person_full_name;
  if (!name || !String(name).trim()) return null;
  const nid = d.person_national_id ? String(d.person_national_id).trim() : null;
  if (nid) {
    const ex = await pool.query(
      `SELECT id FROM persons WHERE national_id = $1 AND deleted_at IS NULL`, [nid]);
    if (ex.rows.length) return ex.rows[0].id;
  }
  const r = await pool.query(
    `INSERT INTO persons (full_name_ar, national_id, phone) VALUES ($1,$2,$3) RETURNING id`,
    [String(name).trim(), nid, d.person_phone || null]);
  return r.rows[0].id;
}

async function nextCode(table, column, prefix, pad) {
  const r = await pool.query(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(${column}, '\\D', '', 'g'), '')::bigint), 0) AS mx
     FROM ${table} WHERE ${column} LIKE $1`,
    [prefix + '%']
  );
  const n = Number(r.rows[0].mx || 0) + 1;
  return prefix + String(n).padStart(pad, '0');
}

// ---------- مصنع CRUD عام ----------
function registerRecord(resource, def) {
  const table = resource.replace(/-/g, '_');

  // GET list — بحث + فلاتر + ترقيم صفحات + soft-delete + دمج بيانات الشخص
  router.get(`/api/${resource}`, async (req, res) => {
    try {
      const { limit, page, offset, includeDeleted } = paginate(req);
      const params = [];
      let idx = 1;
      let where = '1=1';
      where += softDeleteFilter(table, includeDeleted, 't');
      for (const f of def.filters) {
        if (req.query[f] !== undefined && req.query[f] !== '') {
          where += ` AND t.${f} = $${idx++}`; params.push(req.query[f]);
        }
      }
      if (req.query.search) {
        const like = `%${req.query.search}%`;
        where += ` AND (${def.search.map(col => `${col}::text ILIKE $${idx}`).join(' OR ')})`;
        params.push(like); idx++;
      }
      const { sql: countSql, params: countParams } = countQuery(`${table} t${def.personFk ? PERSON_JOIN(def) : ''}`, where, params);
      const total = await pool.query(countSql, countParams);
      const r = await pool.query(
        `SELECT t.*${def.personFk ? PERSON_SELECT : ''} FROM ${table} t${PERSON_JOIN(def)}
         WHERE ${where} ORDER BY t.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      );
      res.json({ data: r.rows, total: total.rows[0].count, page, limit });
    } catch (err) {
      console.error(`[${resource}] list error:`, err.message);
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });

  // GET one
  router.get(`/api/${resource}/:id`, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT t.*${def.personFk ? PERSON_SELECT : ''} FROM ${table} t${PERSON_JOIN(def)} WHERE t.id = $1`,
        [req.params.id]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
      res.json(r.rows[0]);
    } catch (err) {
      console.error(`[${resource}] get error:`, err.message);
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });

  // POST create — تحقق + ربط/إنشاء الشخص + توليد الأرقام التسلسلية تلقائياً
  router.post(`/api/${resource}`, async (req, res) => {
    try {
      const d = { ...req.body };
      for (const reqField of def.required) {
        if (!d[reqField] || (typeof d[reqField] === 'string' && !d[reqField].trim())) {
          return res.status(400).json({ error: `الحقل المطلوب مفقود: ${reqField}` });
        }
      }
      if (def.personFk) {
        const pid = await ensurePerson(d);
        if (!pid && def.requiredPerson) {
          return res.status(400).json({ error: 'مطلوب إدخال بيانات الشخص (الاسم على الأقل)' });
        }
        if (pid) d[def.personFk] = pid;
      }
      for (const ac of def.autoCodes || []) {
        if (!d[ac.column]) d[ac.column] = await nextCode(table, ac.column, ac.prefix, ac.pad);
      }
      const fields = def.columns.filter(col => d[col] !== undefined);
      if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
      const placeholders = fields.map((_, i) => `$${i + 1}`);
      fields.push('created_at', 'updated_at');
      placeholders.push('NOW()', 'NOW()');
      const values = fields.slice(0, -2).map(col => d[col]);
      const r = await pool.query(
        `INSERT INTO ${table} (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        values
      );
      auditLog('create', table, req.user?.id || req.headers['x-user-id'], { id: r.rows[0].id }).catch(() => {});
      res.status(201).json({ success: true, record: r.rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'القيمة مستخدمة مسبقاً (تكرار رقم تسلسلي)' });
      if (err.code === '23514') return res.status(400).json({ error: 'قيمة غير مطابقة لقيود الحقل: ' + err.detail });
      if (err.code === '23503') return res.status(400).json({ error: 'مرجع غير موجود (شخص/مكتب/منشأة)' });
      console.error(`[${resource}] create error:`, err.message);
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });

  // PUT update
  router.put(`/api/${resource}/:id`, async (req, res) => {
    try {
      const d = { ...req.body };
      delete d[def.personFk]; // ربط الشخص لا يتغير بعد الإنشاء
      const fields = [];
      const values = [];
      let idx = 1;
      for (const col of def.columns) {
        if (d[col] !== undefined) {
          fields.push(`${col} = $${idx++}`);
          values.push(d[col]);
        }
      }
      if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
      fields.push('updated_at = NOW()');
      values.push(req.params.id);
      const r = await pool.query(
        `UPDATE ${table} SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
        values
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
      auditLog('update', table, req.user?.id || req.headers['x-user-id'], { id: req.params.id }).catch(() => {});
      res.json({ success: true, record: r.rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'القيمة مستخدمة مسبقاً (تكرار رقم تسلسلي)' });
      if (err.code === '23514') return res.status(400).json({ error: 'قيمة غير مطابقة لقيود الحقل: ' + err.detail });
      console.error(`[${resource}] update error:`, err.message);
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });

  // DELETE soft
  router.delete(`/api/${resource}/:id`, async (req, res) => {
    try {
      const r = await pool.query(
        `UPDATE ${table} SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [req.params.id, req.user?.id || req.headers['x-user-id'] || null]
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
      auditLog('delete', table, req.user?.id || req.headers['x-user-id'], { id: req.params.id }).catch(() => {});
      res.json({ success: true });
    } catch (err) {
      console.error(`[${resource}] delete error:`, err.message);
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });

  // restore
  router.put(`/api/${resource}/:id/restore`, async (req, res) => {
    try {
      const r = await pool.query(
        `UPDATE ${table} SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'غير موجود' });
      res.json({ success: true });
    } catch (err) {
      console.error(`[${resource}] restore error:`, err.message);
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });
}

// ---------- مسارات تحليلية مساندة (قبل المصنع لتجنب ظل :id) ----------

// شهادات اللياقة الصحية القريبة من الانتهاء (تنبيهات استباقية)
router.get('/api/health-fitness-certificates/expiring', async (req, res) => {
  try {
    const days = Math.min(365, parseInt(req.query.days) || 30);
    const r = await pool.query(
      `SELECT hfc.*, p.full_name_ar AS person_name
       FROM health_fitness_certificates hfc
       LEFT JOIN persons p ON p.id = hfc.worker_person_id
       WHERE hfc.deleted_at IS NULL AND hfc.expiry_date IS NOT NULL
         AND hfc.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval
       ORDER BY hfc.expiry_date ASC`,
      [days]
    );
    res.json({ data: r.rows });
  } catch (err) {
    console.error('fitness expiring error:', err.message);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// معايير التفتيش المنطبقة على منشأة (حسب القطاع/النوع/النشاط)
router.get('/api/inspection-criteria/for-establishment', async (req, res) => {
  try {
    const { sector, establishment_type, activity_isic4 } = req.query;
    const r = await pool.query(
      `SELECT * FROM inspection_criteria
       WHERE deleted_at IS NULL AND status = 'ساري'
         AND (applies_to = 'جميع المنشآت'
              OR (applies_to = 'حسب القطاع' AND sector = $1)
              OR (applies_to = 'حسب النوع' AND establishment_type = $2)
              OR (applies_to = 'حسب النشاط' AND activity_isic4 = $3))
       ORDER BY is_mandatory DESC, weight DESC`,
      [sector || null, establishment_type || null, activity_isic4 || null]
    );
    res.json({ data: r.rows });
  } catch (err) {
    console.error('criteria for-establishment error:', err.message);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

Object.entries(RECORDS).forEach(([resource, def]) => registerRecord(resource, def));

// إحصاءات سريعة لكل السجلات (للوحة القيادة) — المفاتيح بأسماء الجداول
router.get('/api/labor-records/stats', async (_req, res) => {
  try {
    const entries = Object.keys(RECORDS).map(resource => [resource, resource.replace(/-/g, '_')]);
    const results = await Promise.all(entries.map(([, table]) =>
      pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE deleted_at IS NULL`)
    ));
    const stats = {};
    entries.forEach(([, table], i) => { stats[table] = results[i].rows[0].count; });
    res.json(stats);
  } catch (err) {
    console.error('labor stats error:', err.message);
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
