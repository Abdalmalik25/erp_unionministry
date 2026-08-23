// server/routes/laborRecords.js — سجلات قطاع شؤون العمل الناقصة
// مصنع CRUD عام يولّد مسارات GET/POST/PUT/DELETE/restore لكل سجل جديد
// وفق "المتطلبات الإضافية للنظام" (برنامج قطاع شؤون العمل)
import { pool, paginate, countQuery, softDeleteFilter, auditLog } from '../middleware/shared.js';
import express from 'express';

const router = express.Router();

// ---------- تعريفات السجلات: الأعمدة المسموحة + حقول البحث + الفلاتر ----------
const RECORDS = {
  directorates: {
    columns: ['code', 'name_ar', 'governorate', 'notes', 'metadata'],
    search: ['name_ar', 'code', 'governorate'],
    filters: ['governorate'],
    required: ['name_ar', 'governorate'],
  },
  ministry_offices: {
    columns: ['office_code', 'office_name', 'office_level', 'parent_office_id', 'governorate',
      'directorate_id', 'jurisdiction', 'address', 'phone', 'email', 'manager_name',
      'manager_phone', 'employees_count', 'status', 'notes', 'metadata'],
    search: ['office_name', 'office_code', 'manager_name', 'jurisdiction'],
    filters: ['governorate', 'office_level', 'status'],
    required: ['office_name'],
  },
  inspectors: {
    columns: ['inspector_code', 'full_name', 'national_id', 'gender', 'job_title', 'specialization',
      'inspector_level', 'office_id', 'employment_source', 'phone', 'email', 'appointment_date',
      'is_osh_certified', 'osh_cert_date', 'last_evaluation_score', 'status', 'notes', 'metadata'],
    search: ['full_name', 'inspector_code', 'national_id', 'specialization'],
    filters: ['office_id', 'status', 'inspector_level', 'employment_source'],
    required: ['full_name'],
  },
  ministry_employees: {
    columns: ['employee_code', 'full_name', 'national_id', 'gender', 'job_title', 'department',
      'office_id', 'employment_type', 'job_description_ref', 'qualification', 'hire_date',
      'phone', 'email', 'status', 'notes', 'metadata'],
    search: ['full_name', 'employee_code', 'national_id', 'job_title', 'department'],
    filters: ['office_id', 'status', 'employment_type'],
    required: ['full_name'],
  },
  inspection_criteria: {
    columns: ['criteria_code', 'title_ar', 'description', 'sector', 'establishment_type',
      'activity_isic4', 'inspection_kind', 'applies_to', 'frequency_months', 'weight',
      'is_mandatory', 'legal_reference', 'status', 'notes', 'metadata'],
    search: ['title_ar', 'criteria_code', 'legal_reference'],
    filters: ['sector', 'establishment_type', 'inspection_kind', 'applies_to', 'status'],
    required: ['title_ar'],
  },
  work_injuries: {
    columns: ['injury_number', 'case_type', 'worker_name', 'worker_national_id', 'enterprise_name',
      'commercial_register', 'governorate', 'injury_date', 'report_date', 'severity', 'body_part',
      'cause_description', 'location', 'lost_work_days', 'medical_facility', 'medical_status',
      'insurance_claimed', 'claim_number', 'compensation_amount', 'committee_decision', 'status',
      'notes', 'metadata'],
    search: ['injury_number', 'worker_name', 'worker_national_id', 'enterprise_name'],
    filters: ['status', 'severity', 'case_type', 'governorate'],
    required: ['worker_name', 'injury_date'],
  },
  insurance_records: {
    columns: ['policy_number', 'insurance_type', 'insured_name', 'insured_national_id',
      'enterprise_name', 'provider_name', 'coverage_start', 'coverage_end', 'premium_amount',
      'coverage_amount', 'beneficiaries_count', 'linked_injury_id', 'status', 'notes', 'metadata'],
    search: ['policy_number', 'insured_name', 'enterprise_name', 'provider_name'],
    filters: ['insurance_type', 'status'],
    required: ['insured_name'],
  },
  irregular_workers: {
    columns: ['registration_number', 'full_name', 'national_id', 'gender', 'birth_date',
      'nationality', 'governorate', 'directorate_id', 'district', 'phone', 'activity_type',
      'workplace_description', 'daily_income', 'monthly_income', 'has_insurance',
      'has_fitness_certificate', 'registered_via', 'registered_at', 'regularization_path',
      'status', 'notes', 'metadata'],
    search: ['full_name', 'registration_number', 'national_id', 'activity_type'],
    filters: ['governorate', 'status', 'activity_type'],
    required: ['full_name'],
  },
  health_fitness_certificates: {
    columns: ['certificate_number', 'worker_name', 'worker_national_id', 'enterprise_name',
      'occupation', 'exam_date', 'exam_center', 'fitness_result', 'restrictions',
      'initial_screening', 'expiry_date', 'doctor_name', 'status', 'notes', 'metadata'],
    search: ['certificate_number', 'worker_name', 'worker_national_id', 'enterprise_name'],
    filters: ['status', 'fitness_result'],
    required: ['worker_name'],
  },
  experience_certificates: {
    columns: ['certificate_number', 'worker_name', 'worker_national_id', 'occupation',
      'occupation_code', 'enterprise_name', 'experience_years', 'experience_level', 'issued_by',
      'issue_date', 'verified_by', 'verification_date', 'is_verified', 'status', 'notes', 'metadata'],
    search: ['certificate_number', 'worker_name', 'worker_national_id', 'occupation', 'enterprise_name'],
    filters: ['status', 'experience_level'],
    required: ['worker_name'],
  },
  'work-procedures': {
    columns: ['procedure_code', 'procedure_name', 'procedure_type', 'worker_name', 'worker_national_id',
      'enterprise_name', 'occupation', 'start_date', 'end_date', 'reference_number', 'approved_by',
      'approval_date', 'legal_basis', 'description', 'status', 'notes', 'metadata'],
    search: ['procedure_name', 'procedure_code', 'worker_name', 'worker_national_id', 'enterprise_name'],
    filters: ['status', 'procedure_type'],
    required: ['procedure_name', 'worker_name'],
  },
};

// ---------- مصنع CRUD عام ----------
function registerRecord(resource, def) {
  const table = resource.replace(/-/g, '_');

  // GET list — بحث + فلاتر + ترقيم صفحات + soft-delete
  router.get(`/api/${resource}`, async (req, res) => {
    try {
      const { limit, page, offset, includeDeleted } = paginate(req);
      const params = [];
      let idx = 1;
      let where = '1=1';
      where += softDeleteFilter(table, includeDeleted);
      for (const f of def.filters) {
        if (req.query[f]) { where += ` AND ${f} = $${idx++}`; params.push(req.query[f]); }
      }
      if (req.query.search) {
        const like = `%${req.query.search}%`;
        where += ` AND (${def.search.map(c => `${c} ILIKE $${idx}`).join(' OR ')})`;
        params.push(like); idx++;
      }
      const { sql: countSql, params: countParams } = countQuery(table, where, params);
      const total = await pool.query(countSql, countParams);
      const r = await pool.query(
        `SELECT * FROM ${table} WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
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
      const r = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'غير موجود' });
      res.json(r.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });

  // POST create — مع توليد رقم تسلسلي تلقائي عند غيابه
  router.post(`/api/${resource}`, async (req, res) => {
    try {
      const d = req.body;
      for (const reqField of def.required) {
        if (!d[reqField] || (typeof d[reqField] === 'string' && !d[reqField].trim())) {
          return res.status(400).json({ error: `الحقل المطلوب مفقود: ${reqField}` });
        }
      }
      const fields = def.columns.filter(c => d[c] !== undefined);
      if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للإدخال' });
      const placeholders = fields.map((_, i) => `$${i + 1}`);
      fields.push('created_at', 'updated_at');
      placeholders.push('NOW()', 'NOW()');
      const values = fields.slice(0, -2).map(c => d[c]);
      const r = await pool.query(
        `INSERT INTO ${table} (${fields.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        values
      );
      auditLog('create', table, req.user?.id || req.headers['x-user-id'], { id: r.rows[0].id }).catch(() => {});
      res.status(201).json({ success: true, record: r.rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'الرقم التسلسلي مستخدم مسبقاً' });
      if (err.code === '23514') return res.status(400).json({ error: 'قيمة غير مطابقة لقيود الحقل: ' + err.detail });
      console.error(`[${resource}] create error:`, err.message);
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });

  // PUT update
  router.put(`/api/${resource}/:id`, async (req, res) => {
    try {
      const fields = [];
      const values = [];
      let idx = 1;
      for (const col of def.columns) {
        if (req.body[col] !== undefined) {
          fields.push(`${col} = $${idx++}`);
          values.push(req.body[col]);
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
      if (err.code === '23505') return res.status(409).json({ error: 'الرقم التسلسلي مستخدم مسبقاً' });
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
      res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
  });
}

Object.entries(RECORDS).forEach(([resource, def]) => registerRecord(resource, def));

// ---------- مسارات تحليلية مساندة ----------

// إحصاءات سريعة لكل السجلات الجديدة (للوحة القيادة)
router.get('/api/labor-records/stats', async (_req, res) => {
  try {
    const tables = Object.keys(RECORDS);
    const queries = tables.map(t =>
      pool.query(`SELECT COUNT(*)::int AS count FROM ${t} WHERE deleted_at IS NULL`)
    );
    const results = await Promise.all(queries);
    const stats = {};
    tables.forEach((t, i) => { stats[t] = results[i].rows[0].count; });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

// شهادات اللياقة الصحية القريبة من الانتهاء (تنبيهات استباقية)
router.get('/api/health-fitness-certificates/expiring', async (req, res) => {
  try {
    const days = Math.min(365, parseInt(req.query.days) || 30);
    const r = await pool.query(
      `SELECT * FROM health_fitness_certificates
       WHERE deleted_at IS NULL AND expiry_date IS NOT NULL
         AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval
       ORDER BY expiry_date ASC`,
      [days]
    );
    res.json({ data: r.rows });
  } catch (err) {
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
    res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
  }
});

export default router;
