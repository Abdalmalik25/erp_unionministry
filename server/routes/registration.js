// server/routes/registration.js — منظومة تسجيل المنشآت وفروعها (رسمية مؤسسية)
// البحث بالاسم/الرقم الوطني • طلب تسجيل بحالة «بانتظار الموافقة» • تعدد فروع
import express from 'express';
import { pool, paginate } from '../middleware/shared.js';

const router = express.Router();

const PENDING = 'under_review';
const AR_STATUS = { under_review: 'طلب بانتظار الموافقة', active: 'نشطة', inactive: 'مرفوضة', suspended: 'معلقة', dissolved: 'منحلة' };

// القيم المسموحة في enum السجل الرسمي
const ENTITY_TYPES = ['company','corporation','partnership','llc','cooperative','factory','shop','office','warehouse','restaurant','service','craft','other'];
const SECTORS = ['industry','services','agriculture','construction','healthcare','education','transportation','trade','technology','finance','tourism','other'];
const SIZES = ['small','medium','large','mega'];

function pickEnum(value, allowed, fallback) {
  const v = String(value || '').toLowerCase().trim();
  return allowed.includes(v) ? v : fallback;
}

/** توليد الرقم التالي بصيغة PREFIX-XXXXXX لعمود معيّن */
async function nextCode(column, prefix, pad = 6) {
  const r = await pool.query(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(${column}, '\\D', '', 'g'), '')::bigint), 0) + 1 AS nxt
     FROM commercial_establishments WHERE ${column} LIKE $1`,
    [`${prefix}-%`]
  );
  return `${prefix}-${String(r.rows[0].nxt).padStart(pad, '0')}`;
}

function sanitize(q) {
  return String(q || '').trim().replace(/[%_]/g, '').slice(0, 80);
}

// ============ 1) البحث بالاسم أو الرقم الوطني (لشاشة الدخول وكل العمليات) ============
router.get('/api/establishments/lookup', async (req, res) => {
  try {
    const q = sanitize(req.query.q);
    if (q.length < 2) return res.json({ data: [], total: 0 });
    const like = `%${q}%`;
    const r = await pool.query(
      `SELECT id, establishment_id, unified_code, national_number, commercial_register_number,
              name_ar, name_en, governorate, city, status, classification
       FROM commercial_establishments
       WHERE deleted_at IS NULL AND (
         national_number ILIKE $1 OR national_number = $2
         OR commercial_register_number ILIKE $1 OR unified_code ILIKE $1
         OR name_ar ILIKE $1 OR name_en ILIKE $1
       )
       ORDER BY (national_number = $2) DESC, (status = 'active') DESC, name_ar ASC
       LIMIT 8`,
      [like, q]
    );
    res.json({
      data: r.rows.map(row => ({ ...row, status_label: AR_STATUS[row.status] || row.status })),
      total: r.rows.length,
    });
  } catch (err) {
    console.error('lookup error:', err.message);
    res.status(500).json({ error: 'خطأ في البحث' });
  }
});

// ============ 2) طلب تسجيل منشأة جديدة (أو ربط بمنشأة قائمة) ============
router.post('/api/establishments/register-request', async (req, res) => {
  try {
    const b = req.body || {};
    const mode = b.mode === 'link' ? 'link' : 'new';

    // تحقق مدني أساسي
    if (mode === 'new') {
      if (!b.name_ar?.trim()) return res.status(400).json({ error: 'اسم المنشأة (عربي) مطلوب' });
      if (!b.owner_name?.trim()) return res.status(400).json({ error: 'اسم المالك مطلوب' });
      if (!b.phone?.trim()) return res.status(400).json({ error: 'هاتف التواصل مطلوب' });
      if (!b.governorate?.trim()) return res.status(400).json({ error: 'المحافظة مطلوبة' });
    } else {
      if (!b.establishment_id) return res.status(400).json({ error: 'معرف المنشأة مطلوب للربط' });
    }

    // ===== وضع الربط: منشأة قائمة — يسجَّل طلب إثبات ملكية داخل metadata =====
    if (mode === 'link') {
      const exists = await pool.query(
        `SELECT id, name_ar FROM commercial_establishments WHERE (id::text=$1 OR establishment_id=$1 OR national_number=$1 OR unified_code=$1) AND deleted_at IS NULL LIMIT 1`,
        [b.establishment_id]
      );
      if (exists.rows.length === 0) return res.status(404).json({ error: 'المنشأة غير موجودة في السجل الرسمي' });
      await pool.query(
        `UPDATE commercial_establishments
         SET metadata = jsonb_set(
               COALESCE(metadata,'{}'::jsonb),
               '{claims}',
               COALESCE(metadata->'claims','[]'::jsonb) || $2::jsonb),
             updated_at = NOW()
         WHERE id = (SELECT id FROM commercial_establishments WHERE (id::text=$1 OR establishment_id=$1 OR national_number=$1 OR unified_code=$1) AND deleted_at IS NULL LIMIT 1)`,
        [b.establishment_id, JSON.stringify([{ email: b.email || null, phone: b.phone || null, owner_name: b.owner_name || null, requested_at: new Date().toISOString(), state: PENDING }])]
      );
      return res.json({
        message: 'تم استلام طلب الربط — سيُراجع من قبل موظف السجل الرسمي',
        reference: exists.rows[0].name_ar,
        state: PENDING,
      });
    }

    // ===== وضع جديد: إدخال في السجل الرسمي بحالة بانتظار الموافقة =====
    const establishmentId = await nextCode('establishment_id', 'EST');
    const unifiedCode = await nextCode('unified_code', 'UC', 7);
    const nnRow = await pool.query(`
      SELECT 'NE-' || LPAD((COALESCE(MAX(NULLIF(regexp_replace(national_number,'\\D','','g'),'')::bigint),0)+1)::text,6,'0') AS nn
      FROM commercial_establishments
      WHERE national_number LIKE 'NE-%' AND national_number NOT LIKE 'NE-D%'`);
    const nationalNumber = nnRow.rows[0].nn;

    // السجل التجاري غير فارغ إلزامياً في المخطط — نولّد رقماً مبدئياً حتى استكمال الوثائق
    const crNumber = String(b.commercial_register || '').trim() || `CR-PENDING-${establishmentId.replace('EST-', '')}`;

    const ins = await pool.query(
      `INSERT INTO commercial_establishments
        (establishment_id, unified_code, commercial_register_number, national_number,
         name_ar, name_en, entity_type, sector, classification, status,
         governorate, city, address, phone, email, owner_name, capital_amount, employees_count, metadata)
       VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9,$10,$11,$12,NULLIF($13,''),$14,NULLIF($15,''),$16,COALESCE($17,0),COALESCE($18,0),$19::jsonb)
       RETURNING id, establishment_id, unified_code, national_number, name_ar, status`,
      [
        establishmentId, unifiedCode, crNumber, nationalNumber,
        String(b.name_ar).trim(), b.name_en || '',
        pickEnum(b.entity_type, ENTITY_TYPES, 'company'),
        pickEnum(b.sector, SECTORS, 'trade'),
        pickEnum(b.classification, SIZES, 'small'),
        PENDING,
        String(b.governorate).trim(), b.city || null, b.address || '',
        String(b.phone).trim(), b.email || '', String(b.owner_name).trim(),
        b.capital_amount ?? null, b.employees_count ?? null,
        JSON.stringify({
          registration_source: 'self_service_portal',
          owner_national_id: b.owner_national_id || null,
          requested_by: b.requested_by || b.email || null,
          requested_at: new Date().toISOString(),
          notes: b.notes || null,
        }),
      ]
    );
    const est = ins.rows[0];

    // الفروع — دعم تعدد الفروع منذ اللحظة الأولى
    const branches = Array.isArray(b.branches) ? b.branches.slice(0, 20) : [];
    let branchNo = 0;
    for (const br of branches) {
      if (!br.branch_name?.trim() && !br.name?.trim()) continue;
      branchNo++;
      await pool.query(
        `INSERT INTO commercial_branches
          (enterprise_id, branch_name, branch_type, governorate, city, address, phone, manager_name, employees_count, is_active, national_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0),false,$10)`,
        [
          est.id,
          br.branch_name || br.name,
          br.branch_type || 'فرع',
          br.governorate || b.governorate,
          br.city || null, br.address || null, br.phone || null,
          br.manager_name || null, br.employees_count ?? null,
          `${nationalNumber}-B${String(branchNo).padStart(2, '0')}`,
        ]
      );
    }

    res.status(201).json({
      message: 'تم استلام طلب التسجيل بنجاح — حالته الآن «طلب بانتظار الموافقة»',
      data: { ...est, status_label: AR_STATUS[PENDING], branches_registered: branchNo },
    });
  } catch (err) {
    console.error('register-request error:', err);
    res.status(500).json({ error: 'تعذر حفظ طلب التسجيل' });
  }
});

// ============ 3) فروع منشأة: عرض وإضافة وتعديل وحذف ============
router.get('/api/establishments/:id/branches', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, branch_name, branch_type, national_number, governorate, city, address, phone, manager_name, employees_count, is_active
       FROM commercial_branches WHERE deleted_at IS NULL AND enterprise_id = (
         SELECT id FROM commercial_establishments WHERE (id::text=$1 OR establishment_id=$1 OR national_number=$1) AND deleted_at IS NULL LIMIT 1
       ) ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ data: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('branches list error:', err.message);
    res.status(500).json({ error: 'تعذر جلب الفروع' });
  }
});

router.post('/api/establishments/:id/branches', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.branch_name?.trim()) return res.status(400).json({ error: 'اسم الفرع مطلوب' });
    const est = await pool.query(
      `SELECT id, national_number, governorate FROM commercial_establishments
       WHERE (id::text=$1 OR establishment_id=$1 OR national_number=$1) AND deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (est.rows.length === 0) return res.status(404).json({ error: 'المنشأة غير موجودة' });
    const parent = est.rows[0];
    const cnt = await pool.query(`SELECT COUNT(*)::int n FROM commercial_branches WHERE enterprise_id=$1 AND deleted_at IS NULL`, [parent.id]);
    const nn = `${parent.national_number}-B${String(Number(cnt.rows[0].n) + 1).padStart(2, '0')}`;
    const ins = await pool.query(
      `INSERT INTO commercial_branches
        (enterprise_id, branch_name, branch_type, governorate, city, address, phone, manager_name, employees_count, is_active, national_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,0),false,$10)
       RETURNING id, branch_name, national_number, is_active`,
      [parent.id, String(b.branch_name).trim(), b.branch_type || 'فرع',
       b.governorate || parent.governorate, b.city || null, b.address || null,
       b.phone || null, b.manager_name || null, b.employees_count ?? null, nn]
    );
    res.status(201).json({
      message: 'تمت إضافة الفرع — بانتظار اعتماد موظف السجل',
      data: { ...ins.rows[0], status_label: 'بانتظار الموافقة' },
    });
  } catch (err) {
    console.error('branch add error:', err.message);
    res.status(500).json({ error: 'تعذر إضافة الفرع' });
  }
});

// تعديل فرع قائم
router.put('/api/establishments/:id/branches/:branchId', async (req, res) => {
  try {
    const b = req.body || {};
    if (b.branch_name !== undefined && !String(b.branch_name).trim()) {
      return res.status(400).json({ error: 'اسم الفرع لا يمكن أن يكون فارغاً' });
    }
    const allowed = ['branch_name', 'branch_type', 'governorate', 'city', 'address', 'phone', 'manager_name', 'employees_count'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const col of allowed) {
      if (b[col] !== undefined) { fields.push(`${col} = $${idx++}`); values.push(b[col]); }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    values.push(req.params.branchId, req.params.id);
    const up = await pool.query(
      `UPDATE commercial_branches SET ${fields.join(', ')}
       WHERE id = $${idx++} AND enterprise_id = (
         SELECT id FROM commercial_establishments WHERE (id::text=$${idx} OR establishment_id=$${idx}) AND deleted_at IS NULL LIMIT 1
       ) RETURNING id, branch_name, national_number`,
      values
    );
    if (up.rows.length === 0) return res.status(404).json({ error: 'الفرع غير موجود' });
    res.json({ message: 'تم تحديث بيانات الفرع', data: up.rows[0] });
  } catch (err) {
    console.error('branch update error:', err.message);
    res.status(500).json({ error: 'تعذر تحديث الفرع' });
  }
});

// حذف فرع (ناعم — يحفظ السجل التاريخي)
router.delete('/api/establishments/:id/branches/:branchId', async (req, res) => {
  try {
    const del = await pool.query(
      `UPDATE commercial_branches SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL AND enterprise_id = (
         SELECT id FROM commercial_establishments WHERE (id::text=$2 OR establishment_id=$2) AND deleted_at IS NULL LIMIT 1
       ) RETURNING id, branch_name`,
      [req.params.branchId, req.params.id]
    );
    if (del.rows.length === 0) return res.status(404).json({ error: 'الفرع غير موجود' });
    res.json({ message: `تم حذف الفرع «${del.rows[0].branch_name}»` });
  } catch (err) {
    console.error('branch delete error:', err.message);
    res.status(500).json({ error: 'تعذر حذف الفرع' });
  }
});

// ============ 4) دورة الاعتماد لموظفي السجل الرسمي ============
router.get('/api/establishments/pending', async (_req, res) => {
  try {
    const { limit, offset } = paginate(_req);
    const r = await pool.query(
      `SELECT id, establishment_id, national_number, name_ar, owner_name, governorate, city, phone, email, created_at,
              (SELECT COUNT(*) FROM commercial_branches cb WHERE cb.enterprise_id = ce.id) AS branches_count
       FROM commercial_establishments ce
       WHERE status = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [PENDING, limit, offset]
    );
    res.json({ data: r.rows, total: r.rows.length });
  } catch (err) {
    console.error('pending list error:', err.message);
    res.status(500).json({ error: 'تعذر جلب الطلبات المعلقة' });
  }
});

router.patch('/api/establishments/:id/approve', async (req, res) => {
  try {
    const up = await pool.query(
      `UPDATE commercial_establishments SET status='active',
        metadata = jsonb_set(COALESCE(metadata,'{}'::jsonb),'{approved_at}',to_jsonb(NOW()::text))
       WHERE (id::text=$1 OR establishment_id=$1) AND status='under_review' RETURNING id, national_number, name_ar`,
      [req.params.id]
    );
    if (up.rows.length === 0) return res.status(404).json({ error: 'لا يوجد طلب معلق بهذا المعرف' });
    await pool.query(`UPDATE commercial_branches SET is_active=true WHERE enterprise_id=$1`, [up.rows[0].id]);
    res.json({ message: `تمت الموافقة على «${up.rows[0].name_ar}» وتفعيل جميع فروعها`, data: up.rows[0] });
  } catch (err) {
    console.error('approve error:', err.message);
    res.status(500).json({ error: 'تعذر الاعتماد' });
  }
});

router.patch('/api/establishments/:id/reject', async (req, res) => {
  try {
    const reason = String(req.body?.reason || 'غير محدد').slice(0, 300);
    const up = await pool.query(
      `UPDATE commercial_establishments SET status='inactive',
        metadata = jsonb_set(jsonb_set(COALESCE(metadata,'{}'::jsonb),'{rejected_at}',to_jsonb(NOW()::text)),'{rejection_reason}',to_jsonb($2::text))
       WHERE (id::text=$1 OR establishment_id=$1) AND status='under_review' RETURNING id, name_ar`,
      [req.params.id, reason]
    );
    if (up.rows.length === 0) return res.status(404).json({ error: 'لا يوجد طلب معلق بهذا المعرف' });
    res.json({ message: `تم رفض طلب «${up.rows[0].name_ar}» — السبب: ${reason}`, data: up.rows[0] });
  } catch (err) {
    console.error('reject error:', err.message);
    res.status(500).json({ error: 'تعذر الرفض' });
  }
});

export default router;
