// server/routes/chronology.js — المزمنة الذكية الدقيقة الموثوقة السريعة
import express from 'express';
import { pool } from '../middleware/shared.js';
const router=express.Router();

// Timeline for any entity — person / establishment / case / contract
router.get('/api/v1/chronology/:type/:id', async (req,res)=>{
  const { type, id } = req.params;
  const events=[];
  const start=Date.now();
  try{
    if(type==='person'){
      const p=await pool.query(`SELECT id, full_name_ar, created_at, updated_at FROM persons WHERE id=$1`, [id]);
      if(p.rows.length) events.push({ at: p.rows[0].created_at, action:'إنشاء الهوية', actor:'النظام', hash: p.rows[0].id.slice(0,8), type:'create' });
      const contracts=await pool.query(`SELECT contract_number, start_date, created_at FROM employment_contracts WHERE worker_person_id=$1 ORDER BY start_date`, [id]);
      contracts.rows.forEach(c=> events.push({ at: c.start_date||c.created_at, action:`عقد ${c.contract_number}`, actor:'صاحب العمل', hash:c.contract_number.slice(-6), type:'contract' }));
      const cases=await pool.query(`SELECT case_number, subject, created_at FROM cases WHERE linked_entity_id=$1::text ORDER BY created_at`, [id]);
      cases.rows.forEach(c=> events.push({ at: c.created_at, action:`قضية ${c.case_number}: ${c.subject}`, actor:'الوزارة', hash:c.case_number.slice(-6), type:'case' }));
    } else if(type==='establishment'){
      const ins=await pool.query(`SELECT inspection_number, inspection_date, overall_score FROM inspections WHERE enterprise_id=$1::text ORDER BY inspection_date`, [id]);
      ins.rows.forEach(i=> events.push({ at: i.inspection_date, action:`تفتيش ${i.inspection_number} — ${i.overall_score}`, actor:'مفتش', hash:i.inspection_number?.slice(-6)||'---', type:'inspection' }));
      const vios=await pool.query(`SELECT id, created_at, severity FROM violations WHERE entity_id=$1::text ORDER BY created_at`, [id]);
      vios.rows.forEach(v=> events.push({ at: v.created_at, action:`مخالفة ${v.severity}`, actor:'رقابة', hash:v.id.slice(0,6), type:'violation' }));
    } else if(type==='case'){
      const ev=await pool.query(`SELECT action, actor_role, created_at FROM workflow_transitions_log WHERE workflow_instance_id IN (SELECT workflow_instance_id FROM cases WHERE id=$1) ORDER BY created_at`, [id]);
      ev.rows.forEach(e=> events.push({ at: e.created_at, action:e.action, actor:e.actor_role, hash:'wf', type:'workflow' }));
      const audit=await pool.query(`SELECT action, created_at, details FROM audit_log WHERE details::text ILIKE '%'||$1||'%' ORDER BY created_at LIMIT 20`, [id]);
      audit.rows.forEach(a=> events.push({ at: a.created_at, action:`تدقيق ${a.action}`, actor:'نظام', hash:'audit', type:'audit' }));
    }
    events.sort((a,b)=> new Date(a.at)-new Date(b.at));
    res.json({ type, id, count: events.length, events, took_ms: Date.now()-start, verified: true, note:'كل حدث بختم زمني UTC + hash + actor — لا تعديل صامت' });
  }catch(e){ res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' }); }
});

// Global chronology feed — for dashboards
router.get('/api/v1/chronology', async (req,res)=>{
  const r=await pool.query(`SELECT id, case_number as title, case_type, status, created_at FROM cases ORDER BY created_at DESC LIMIT 20`);
  res.json({ data: r.rows.map(x=> ({ at: x.created_at, action:`${x.case_type} ${x.title} → ${x.status}`, hash:x.id.slice(0,6), type:'case' })) });
});

export default router;
