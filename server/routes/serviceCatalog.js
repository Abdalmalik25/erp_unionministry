// server/routes/serviceCatalog.js — Universal Service Framework (no-code service control)
import express from 'express';
import { pool, paginate } from '../middleware/shared.js';
import { validate } from '../middleware/validation.js';
import crypto from 'crypto';
import { invalidateCache } from '../middleware/cache.js';

const router = express.Router();

// List — RBAC aware, only active for public marketplace
router.get('/api/v1/services/catalog', async (req,res)=>{
  try{
    const { limit, page, offset } = paginate(req);
    const { category, stakeholder, is_active, search } = req.query;
    const conds=[]; const params=[]; let i=1;
    if (category) { conds.push(`category=$${i++}`); params.push(category); }
    if (stakeholder) { conds.push(`stakeholder=$${i++}`); params.push(stakeholder); }
    if (is_active!==undefined) { conds.push(`is_active=$${i++}`); params.push(is_active==='true'); }
    else conds.push(`deleted_at IS NULL`);
    if (search) { conds.push(`(title_ar ILIKE $${i} OR service_code ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const where = conds.length? 'WHERE '+conds.join(' AND'):'';
    const total = await pool.query(`SELECT COUNT(*)::int as c FROM service_catalog ${where}`, params);
    const rows = await pool.query(`SELECT id, service_code, title_ar, title_en, category, stakeholder, description_ar, sla_days, sla_policy_key, workflow_key, requires_documents, eligibility_rule, eligibility_rule_id, fees, office_type, is_active, is_digital, physical_verification_reason, version, created_by, created_at, updated_at, deleted_at FROM service_catalog ${where} ORDER BY service_code LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset]);
    res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
  }catch(e){ res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' }); }
});

// Get one
router.get('/api/v1/services/catalog/:code', async (req,res)=>{
  const r=await pool.query(`SELECT sc.*, rr.rule_code as eligibility_rule_code, wf.definition as workflow_def FROM service_catalog sc LEFT JOIN regulatory_rules rr ON sc.eligibility_rule_id=rr.id LEFT JOIN workflow_definitions wf ON sc.workflow_key=wf.workflow_key WHERE sc.service_code=$1`, [req.params.code]);
  if(!r.rows.length) return res.status(404).json({ error:'الخدمة غير موجودة', code:'NOT_FOUND' });
  res.json(r.rows[0]);
});

// Create — no code deploy needed (ministry_admin only)
router.post('/api/v1/services/catalog', async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية وزارة فقط', code:'FORBIDDEN' });
  const { service_code, title_ar, category, stakeholder, sla_days, workflow_key, requires_documents, eligibility_rule, office_type, fees, is_digital } = req.body;
  if(!service_code || !title_ar || !category) return res.status(400).json({ error:'service_code/title_ar/category مطلوبة', code:'VALIDATION_ERROR' });
  try{
    const r=await pool.query(
      `INSERT INTO service_catalog (service_code, title_ar, category, stakeholder, sla_days, workflow_key, requires_documents, eligibility_rule, office_type, fees, is_digital, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [service_code, title_ar, category, stakeholder||'all', sla_days||7, workflow_key||null, JSON.stringify(requires_documents||[]), eligibility_rule||null, office_type||'directorate', JSON.stringify(fees||{}), is_digital!==false, req.user.id]
    );
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  }catch(e){
    if(e.code==='23505') return res.status(409).json({ error:'رمز الخدمة مكرر', code:'DUPLICATE' });
    res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' });
  }
});

// Toggle active — إيقاف/تفعيل دون كود (nuclear requirement)
router.put('/api/v1/services/catalog/:code/toggle', async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية وزارة فقط', code:'FORBIDDEN' });
  const r=await pool.query(`UPDATE service_catalog SET is_active = NOT is_active, updated_at=NOW() WHERE service_code=$1 RETURNING *`, [req.params.code]);
  if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
  res.json(r.rows[0]);
  invalidateCache('dashboard');
});

// Update (no-code edit)
router.put('/api/v1/services/catalog/:code', async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية وزارة فقط', code:'FORBIDDEN' });
  const allowed=['title_ar','category','stakeholder','sla_days','workflow_key','requires_documents','eligibility_rule','office_type','fees','is_digital','is_active'];
  const sets=[]; const vals=[]; let i=1;
  for(const k of allowed) if(req.body[k]!==undefined){
    sets.push(`${k}=$${i++}`);
    vals.push(k==='requires_documents'||k==='fees'? JSON.stringify(req.body[k]): req.body[k]);
  }
  if(!sets.length) return res.status(400).json({ error:'لا حقول للتحديث', code:'VALIDATION_ERROR' });
  vals.push(req.params.code);
  const r=await pool.query(`UPDATE service_catalog SET ${sets.join(',')}, updated_at=NOW() WHERE service_code=$${i} RETURNING *`, vals);
  if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
  res.json(r.rows[0]);
  invalidateCache('dashboard');
});

// Instances — تقديم طلب خدمة (any stakeholder)
router.post('/api/v1/services/instances', async (req,res)=>{
  const { service_code, applicant_type, applicant_id, payload, documents } = req.body;
  if(!service_code) return res.status(400).json({ error:'service_code مطلوب', code:'VALIDATION_ERROR' });
  const svc=await pool.query(`SELECT id, service_code, title_ar, title_en, category, stakeholder, description_ar, sla_days, sla_policy_key, workflow_key, requires_documents, eligibility_rule, eligibility_rule_id, fees, office_type, is_active, is_digital, physical_verification_reason, version, created_by, created_at, updated_at, deleted_at FROM service_catalog WHERE service_code=$1 AND deleted_at IS NULL`, [service_code]);
  if(!svc.rows.length) return res.status(404).json({ error:'الخدمة غير موجودة', code:'NOT_FOUND' });
  if(!svc.rows[0].is_active) return res.status(403).json({ error:'الخدمة موقوفة حالياً', code:'SERVICE_SUSPENDED' });
  // SLA deadline
  const slaDays=svc.rows[0].sla_days||7;
  const deadline=new Date(Date.now()+slaDays*86400000).toISOString();
  const num=`SVC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  // create workflow instance if needed
  let wfId=null;
  if(svc.rows[0].workflow_key){
    const wf=await pool.query(`INSERT INTO workflow_instances (workflow_key, entity_type, entity_id, current_state, created_by) VALUES ($1,'service_instance',$2,'draft',$3) RETURNING id`, [svc.rows[0].workflow_key, num, req.user?.id||null]);
    wfId=wf.rows[0].id;
  }
  const r=await pool.query(
    `INSERT INTO service_instances (instance_number, service_code, applicant_type, applicant_id, payload, documents, workflow_instance_id, sla_deadline, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'submitted',$9) RETURNING *`,
    [num, service_code, applicant_type||'person', applicant_id||req.user?.id||null, JSON.stringify(payload||{}), JSON.stringify(documents||[]), wfId, deadline, req.user?.id||null]
  );
  res.status(201).json(r.rows[0]);
  invalidateCache('dashboard');
});

router.get('/api/v1/services/instances', async (req,res)=>{
  const { limit, page, offset } = paginate(req);
  const { service_code, status } = req.query;
  const conds=[]; const params=[]; let i=1;
  if(service_code){ conds.push(`service_code=$${i++}`); params.push(service_code); }
  if(status){ conds.push(`status=$${i++}`); params.push(status); }
  const where=conds.length? 'WHERE '+conds.join(' AND'):'';
  const total=await pool.query(`SELECT COUNT(*)::int as c FROM service_instances ${where}`, params);
  const rows=await pool.query(`SELECT id, instance_number, service_code, applicant_type, applicant_id, payload, documents, workflow_instance_id, case_id, status, sla_deadline, decision, certificate_url, certificate_hash, created_by, created_at, updated_at FROM service_instances ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset]);
  res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
});

// Certificate issue (after approval)
router.put('/api/v1/services/instances/:id/certificate', async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin','registry_officer'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية وزارة فقط', code:'FORBIDDEN' });
  const hash=crypto.createHash('sha256').update(req.params.id+Date.now()).digest('hex');
  const url=`/certificates/${req.params.id}.pdf`;
  const r=await pool.query(`UPDATE service_instances SET certificate_url=$1, certificate_hash=$2, status='completed', updated_at=NOW() WHERE id=$3 RETURNING *`, [url, hash, req.params.id]);
  if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
  res.json(r.rows[0]);
  invalidateCache('dashboard');
});

export default router;
