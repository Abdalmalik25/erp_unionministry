// server/routes/workerPortal.js — بوابة العمال الرقمية الشاملة
// End-to-End: يجمع كل بيانات العامل من جداول متعددة في استجابة موحدة
import { pool } from '../middleware/shared.js';
import { cacheMiddleware } from '../middleware/cache.js';
import express from 'express';

const router = express.Router();

// Apply caching to GET endpoints only — 30s TTL for worker data
const withCache = cacheMiddleware(30 * 1000);

// ============================================================================
// 1) جلب جواز العمل الرقمي الشامل (Worker Digital Passport)
// ============================================================================
router.get('/api/worker-portal/:personId/passport', withCache, async (req, res) => {
  try {
    const { personId } = req.params;

    // 1. البيانات الأساسية للشخص
    const person = await pool.query(
      `SELECT p.*, p.full_name_ar, p.national_id, p.date_of_birth, p.gender, p.nationality,
              p.governorate, p.directorate, p.phone, p.email, p.photo_url, p.status
       FROM persons p WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [personId]
    );
    if (person.rows.length === 0) return res.status(404).json({ error: 'الشخص غير موجود' });
    const p = person.rows[0];

    // 2. سجل العامل (worker_registry)
    const worker = await pool.query(
      `SELECT wr.*, no.code as occupation_code, no.name_ar as occupation_name
       FROM worker_registry wr
       LEFT JOIN national_occupations no ON wr.occupation_id = no.id
       WHERE wr.person_id = $1`,
      [personId]
    );

    // 3. العقود (latest 10)
    const contracts = await pool.query(
      `SELECT ec.*, le.name_ar as establishment_name, ctr.name_ar as contract_type_name
       FROM employment_contracts ec
       LEFT JOIN legal_entities le ON ec.establishment_id = le.id
       LEFT JOIN contract_types_registry ctr ON ec.contract_type_id = ctr.id
       WHERE ec.worker_person_id = $1 AND ec.deleted_at IS NULL
       ORDER BY ec.start_date DESC LIMIT 10`,
      [personId]
    );

    // 4. شهادات اللياقة الصحية
    const healthCerts = await pool.query(
      `SELECT * FROM health_fitness_certificates
       WHERE worker_person_id = $1 AND deleted_at IS NULL
       ORDER BY issue_date DESC LIMIT 5`,
      [personId]
    );

    // 5. شهادات الخبرة
    const expCerts = await pool.query(
      `SELECT * FROM experience_certificates
       WHERE person_id = $1 AND deleted_at IS NULL
       ORDER BY issue_date DESC LIMIT 10`,
      [personId]
    );

    // 6. إصابات العمل
    const injuries = await pool.query(
      `SELECT * FROM work_injuries
       WHERE worker_person_id = $1 AND deleted_at IS NULL
       ORDER BY injury_date DESC LIMIT 5`,
      [personId]
    );

    // 7. سجلات التدريب
    const training = await pool.query(
      `SELECT * FROM training_records
       WHERE worker_person_id = $1 AND deleted_at IS NULL
       ORDER BY training_date DESC LIMIT 10`,
      [personId]
    );

    // 8. النزاعات/القضايا
    const cases = await pool.query(
      `SELECT c.*, wo.name_ar as workflow_state
       FROM cases c
       LEFT JOIN workflow_instances wi ON c.workflow_instance_id = wi.id
       LEFT JOIN workflow_definitions wo ON wi.workflow_key = wo.workflow_key
       WHERE c.linked_entity_id = $1::text AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC LIMIT 5`,
      [personId]
    );

    // 9. التأمينات الاجتماعية
    const insurance = await pool.query(
      `SELECT * FROM insurance_records
       WHERE insured_person_id = $1 AND deleted_at IS NULL
       ORDER BY coverage_start DESC LIMIT 3`,
      [personId]
    );

    // 10. وثائق مرفوعة
    const documents = await pool.query(
      `SELECT * FROM documents
       WHERE entity_id = $1::text AND entity_type = 'worker'
       ORDER BY created_at DESC LIMIT 20`,
      [personId]
    );

    // 11. حساب الإحصاءات
    const activeContracts = contracts.rows.filter(c => c.status === 'active');
    const upcomingExpiries = healthCerts.rows.filter(c => {
      if (!c.expiry_date) return false;
      const days = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      return days > 0 && days <= 30;
    });

    res.json({
      data: {
        person: p,
        worker_registry: worker.rows[0] || null,
        contracts: contracts.rows,
        active_contract: activeContracts[0] || null,
        health_certificates: healthCerts.rows,
        experience_certificates: expCerts.rows,
        injuries: injuries.rows,
        training_records: training.rows,
        cases: cases.rows,
        insurance: insurance.rows,
        documents: documents.rows,
        stats: {
          total_contracts: contracts.rows.length,
          active_contracts: activeContracts.length,
          health_certs: healthCerts.rows.length,
          expiring_soon: upcomingExpiries.length,
          training_count: training.rows.length,
          open_cases: cases.rows.filter(c => !['closed', 'resolved'].includes(c.status)).length,
          injuries_count: injuries.rows.length,
          has_insurance: insurance.rows.length > 0,
          documents_count: documents.rows.length,
        }
      }
    });
  } catch (err) {
    console.error('Passport error:', err);
    res.status(500).json({ error: 'خطأ في جلب بيانات جواز العمل' });
  }
});

// ============================================================================
// 2) طلب خدمة من البوابة (نقل خدمة / إنهاء عقد / شهادة خبرة / فحص طبي)
// ============================================================================
router.post('/api/worker-portal/service-request', async (req, res) => {
  try {
    const {
      person_id, service_code, payload, documents
    } = req.body || {};

    if (!person_id || !service_code) {
      return res.status(400).json({ error: 'person_id و service_code مطلوبان' });
    }

    // توليد رقم الطلب
    const ref = `WRK-SR-${Date.now().toString(36).toUpperCase()}`;
    const deadline = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 أيام افتراضي

    const r = await pool.query(
      `INSERT INTO service_requests
         (request_number, service_code, applicant_type, applicant_id, payload, documents,
          status, deadline, created_by)
       VALUES ($1, $2, 'person', $3, $4, $5, 'submitted', $6, $3)
       RETURNING *`,
      [ref, service_code, person_id, JSON.stringify(payload || {}), JSON.stringify(documents || []), deadline]
    );

    res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('Service request error:', err);
    res.status(500).json({ error: 'خطأ في تقديم الطلب' });
  }
});

// ============================================================================
// 3) تتبع الطلبات
// ============================================================================
router.get('/api/worker-portal/:personId/requests', withCache, async (req, res) => {
  try {
    const { personId } = req.params;
    const r = await pool.query(
      `SELECT sr.*, sc.name_ar as service_name, sc.category
       FROM service_requests sr
       LEFT JOIN service_catalog sc ON sr.service_code = sc.service_code
       WHERE sr.applicant_id = $1
       ORDER BY sr.created_at DESC LIMIT 30`,
      [personId]
    );
    res.json({ data: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
});

// ============================================================================
// 4) تقديم شكوى / بلاغ / إصابة
// ============================================================================
router.post('/api/worker-portal/report', async (req, res) => {
  try {
    const { person_id, case_type, subject, description, linked_entity_id, linked_entity_type, documents } = req.body || {};
    if (!person_id || !case_type || !subject) {
      return res.status(400).json({ error: 'الحقول المطلوبة ناقصة' });
    }

    // توليد رقم القضية
    const caseNumber = `CASE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    // حساب SLA
    const sla = await pool.query(
      `SELECT max_response_hours FROM sla_policies WHERE applies_to = $1 AND is_active = true LIMIT 1`,
      [case_type]
    );
    const slaHours = sla.rows[0]?.max_response_hours || 72;
    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000);

    const r = await pool.query(
      `INSERT INTO cases
         (case_number, case_type, subject, description, linked_entity_id, linked_entity_type,
          priority, sla_deadline, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'medium', $7, 'filed', $8)
       RETURNING *`,
      [caseNumber, case_type, subject, description, linked_entity_id, person_id, slaDeadline, person_id]
    );

    // إضافة المستندات إن وجدت
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        await pool.query(
          `INSERT INTO case_documents (case_id, document_name, file_url, file_hash, mime_type, file_size, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [r.rows[0].id, doc.name, doc.url, doc.hash, doc.mime, doc.size, person_id]
        );
      }
    }

    res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'خطأ في تقديم البلاغ' });
  }
});

// ============================================================================
// 5) رفع وثيقة
// ============================================================================
router.post('/api/worker-portal/document/upload', async (req, res) => {
  try {
    const { person_id, document_name, file_url, file_hash, file_size, mime_type, document_type, classification = 'private' } = req.body || {};
    if (!person_id || !document_name || !file_url) {
      return res.status(400).json({ error: 'الحقول المطلوبة ناقصة' });
    }

    const r = await pool.query(
      `INSERT INTO documents
         (document_name, entity_type, entity_id, file_url, file_hash, file_size, mime_type,
          document_type, classification, uploaded_by)
       VALUES ($1, 'worker', $2, $3, $4, $5, $6, $7, $8, $2)
       RETURNING *`,
      [document_name, person_id, file_url, file_hash, file_size, mime_type, document_type || 'other', classification]
    );

    res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'خطأ في رفع الوثيقة' });
  }
});

// ============================================================================
// 6) الإحصاءات السريعة للوحة التحكم
// ============================================================================
router.get('/api/worker-portal/:personId/dashboard', withCache, async (req, res) => {
  try {
    const { personId } = req.params;
    const queries = await Promise.all([
      // العقود النشطة
      pool.query(
        `SELECT COUNT(*)::int as count FROM employment_contracts
         WHERE worker_person_id = $1 AND status = 'active' AND deleted_at IS NULL`,
        [personId]
      ),
      // الشهادات الصحية القاربت الانتهاء
      pool.query(
        `SELECT COUNT(*)::int as count FROM health_fitness_certificates
         WHERE worker_person_id = $1 AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
           AND deleted_at IS NULL`,
        [personId]
      ),
      // الشكاوى المفتوحة
      pool.query(
        `SELECT COUNT(*)::int as count FROM cases
         WHERE linked_entity_id = $1::text AND status NOT IN ('closed', 'resolved') AND deleted_at IS NULL`,
        [personId]
      ),
      // شهادات الخبرة
      pool.query(
        `SELECT COUNT(*)::int as count FROM experience_certificates
         WHERE person_id = $1 AND deleted_at IS NULL`,
        [personId]
      ),
      // دورات التدريب
      pool.query(
        `SELECT COUNT(*)::int as count FROM training_records
         WHERE worker_person_id = $1 AND deleted_at IS NULL`,
        [personId]
      ),
      // إصابات العمل
      pool.query(
        `SELECT COUNT(*)::int as count FROM work_injuries
         WHERE worker_person_id = $1 AND deleted_at IS NULL`,
        [personId]
      ),
    ]);

    res.json({
      data: {
        active_contracts: queries[0].rows[0]?.count || 0,
        expiring_health_certs: queries[1].rows[0]?.count || 0,
        open_cases: queries[2].rows[0]?.count || 0,
        experience_certs: queries[3].rows[0]?.count || 0,
        training_count: queries[4].rows[0]?.count || 0,
        injury_count: queries[5].rows[0]?.count || 0,
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'خطأ في جلب لوحة التحكم' });
  }
});

// ============================================================================
// 7) الـ Timeline الذكي (Smart Chronology)
// ============================================================================
router.get('/api/worker-portal/:personId/timeline', withCache, async (req, res) => {
  try {
    const { personId } = req.params;
    const events = [];

    // أحداث الشخص الأساسية
    const p = await pool.query(`SELECT created_at FROM persons WHERE id = $1`, [personId]);
    if (p.rows[0]) {
      events.push({ at: p.rows[0].created_at, type: 'identity', action: 'إنشاء الهوية', icon: 'user', hash: personId.slice(0, 8) });
    }

    // العقود
    const c = await pool.query(
      `SELECT contract_number, start_date, end_date, status, created_at FROM employment_contracts
       WHERE worker_person_id = $1 AND deleted_at IS NULL ORDER BY start_date`,
      [personId]
    );
    c.rows.forEach(co => {
      events.push({ at: co.start_date, type: 'contract_start', action: `بدء عقد ${co.contract_number}`, icon: 'briefcase', status: co.status, hash: co.contract_number });
      if (co.end_date) {
        events.push({ at: co.end_date, type: 'contract_end', action: `انتهاء عقد ${co.contract_number}`, icon: 'briefcase', hash: co.contract_number });
      }
    });

    // شهادات اللياقة
    const h = await pool.query(
      `SELECT certificate_number, issue_date, expiry_date FROM health_fitness_certificates
       WHERE worker_person_id = $1 AND deleted_at IS NULL`,
      [personId]
    );
    h.rows.forEach(cert => {
      events.push({ at: cert.issue_date, type: 'health_cert', action: `شهادة لياقة ${cert.certificate_number}`, icon: 'heart-pulse', hash: cert.certificate_number });
    });

    // إصابات العمل
    const i = await pool.query(
      `SELECT injury_number, injury_date, severity FROM work_injuries
       WHERE worker_person_id = $1 AND deleted_at IS NULL`,
      [personId]
    );
    i.rows.forEach(inj => {
      events.push({ at: inj.injury_date, type: 'injury', action: `إصابة عمل ${inj.injury_number}`, icon: 'alert-triangle', severity: inj.severity, hash: inj.injury_number });
    });

    // التدريب
    const t = await pool.query(
      `SELECT certificate_number, training_name, training_date FROM training_records
       WHERE worker_person_id = $1 AND deleted_at IS NULL`,
      [personId]
    );
    t.rows.forEach(tr => {
      events.push({ at: tr.training_date, type: 'training', action: `تدريب: ${tr.training_name}`, icon: 'graduation-cap', hash: tr.certificate_number });
    });

    // ترتيب زمني
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    res.json({ data: events });
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ error: 'خطأ في جلب السجل الزمني' });
  }
});

// ============================================================================
// 8) تنبيهات ذكية للبوابة
// ============================================================================
router.get('/api/worker-portal/:personId/alerts', withCache, async (req, res) => {
  try {
    const { personId } = req.params;
    const alerts = [];

    // شهادات لياقة تنتهي قريباً
    const h = await pool.query(
      `SELECT certificate_number, expiry_date, issuing_authority FROM health_fitness_certificates
       WHERE worker_person_id = $1 AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '60 days'
         AND deleted_at IS NULL`,
      [personId]
    );
    h.rows.forEach(cert => {
      const days = Math.ceil((new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      alerts.push({
        type: 'health_cert_expiring',
        severity: days < 7 ? 'critical' : days < 30 ? 'high' : 'medium',
        title: `شهادة لياقة تنتهي خلال ${days} يوم`,
        description: `رقم الشهادة: ${cert.certificate_number} — مصدرها: ${cert.issuing_authority}`,
        action_url: '/worker-portal/health',
      });
    });

    // عقود تنتهي قريباً
    const c = await pool.query(
      `SELECT contract_number, end_date, le.name_ar as establishment FROM employment_contracts ec
       LEFT JOIN legal_entities le ON ec.establishment_id = le.id
       WHERE ec.worker_person_id = $1 AND ec.status = 'active'
         AND ec.end_date IS NOT NULL AND ec.end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
         AND ec.deleted_at IS NULL`,
      [personId]
    );
    c.rows.forEach(co => {
      const days = Math.ceil((new Date(co.end_date).getTime() - Date.now()) / (1000 * 3600 * 24));
      alerts.push({
        type: 'contract_expiring',
        severity: days < 7 ? 'high' : 'medium',
        title: `عقد عمل ينتهي خلال ${days} يوم`,
        description: `رقم العقد: ${co.contract_number} — المنشأة: ${co.establishment}`,
        action_url: '/worker-portal/contracts',
      });
    });

    // شكاوى في انتظار الرد
    const cs = await pool.query(
      `SELECT case_number, subject, sla_status FROM cases
       WHERE linked_entity_id = $1::text AND status NOT IN ('closed', 'resolved') AND deleted_at IS NULL
         AND sla_status IN ('overdue', 'at_risk')`,
      [personId]
    );
    cs.rows.forEach(c => {
      alerts.push({
        type: 'case_sla_warning',
        severity: c.sla_status === 'overdue' ? 'critical' : 'high',
        title: `قضية ${c.case_number} تجاوزت الموعد`,
        description: c.subject,
        action_url: `/worker-portal/cases`,
      });
    });

    res.json({ data: alerts });
  } catch (err) {
    console.error('Alerts error:', err);
    res.status(500).json({ error: 'خطأ في جلب التنبيهات' });
  }
});

export default router;
