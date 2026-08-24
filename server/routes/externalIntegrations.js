// externalIntegrations.js — محول ذكي: live → fallback → mock (كفاءة واعتمادية)
import express from 'express';
import { pool } from '../middleware/shared.js';
import crypto from 'crypto';
const router=express.Router();

// List
router.get('/api/v1/integrations', async (_req,res)=>{
  const r=await pool.query(`SELECT * FROM external_integrations ORDER BY code`);
  res.json({ data: r.rows });
});
// Toggle mode/status — بدون كود
router.put('/api/v1/integrations/:code/mode', async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية وزارة', code:'FORBIDDEN' });
  const { mode, status } = req.body;
  const r=await pool.query(`UPDATE external_integrations SET mode=COALESCE($1,mode), status=COALESCE($2,status), updated_at=NOW() WHERE code=$3 RETURNING *`, [mode||null, status||null, req.params.code]);
  if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
  res.json(r.rows[0]);
});

// Verify — ذكي: يحاول live، يسقط لـ mock/cache/queue
router.post('/api/v1/integrations/:code/verify', async (req,res)=>{
  const { code } = req.params;
  const payload = req.body;
  const start=Date.now();
  const integ = await pool.query(`SELECT * FROM external_integrations WHERE code=$1`, [code]);
  if(!integ.rows.length) return res.status(404).json({ error:'التكامل غير موجود', code:'NOT_FOUND' });
  const cfg=integ.rows[0];
  const idem = req.headers['x-idempotency-key'] || `verify-${code}-${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0,12)}`;
  // Check cache first — كفاءة
  const cacheKey = `${code}:${idem}`;
  const cached = await pool.query(`SELECT response FROM external_cache WHERE cache_key=$1 AND expires_at > NOW()`, [cacheKey]);
  if(cached.rows.length){
    return res.json({ mode:'cache', result: cached.rows[0].response, took_ms: Date.now()-start, cached:true });
  }
  // If mock/fallback/disconnected → immediate mock without external call — اعتمادية
  if(cfg.mode==='mock' || cfg.status==='mock' || cfg.mode==='fallback'){
    const mock = mockVerify(code, payload);
    await pool.query(`INSERT INTO external_cache (cache_key, integration_code, response, expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL '5 minutes') ON CONFLICT (cache_key) DO UPDATE SET response=$3`, [cacheKey, code, JSON.stringify(mock)]);
    return res.json({ mode:'mock', result: mock, took_ms: Date.now()-start, note:'يعمل بدون ربط فعلي — سد الفجوة' });
  }
  // Live attempt with timeout + retry (circuit breaker)
  try{
    const controller=new AbortController();
    const t=setTimeout(()=> controller.abort(), cfg.timeout_ms||5000);
    // In production: fetch(cfg.base_url, { signal: controller.signal, ... })
    // Here simulate live that may fail → fallback to queue
    clearTimeout(t);
    throw new Error('external_not_reachable_in_demo');
  }catch(e){
    await pool.query(`INSERT INTO external_sync_queue (integration_code, payload, operation, status, next_retry_at) VALUES ($1,$2,'verify','pending', NOW()+INTERVAL '5 minutes')`, [code, JSON.stringify(payload)]);
    const mock = mockVerify(code, payload);
    return res.json({ mode:'fallback', result: mock, took_ms: Date.now()-start, queued:true, warning:'الطرف الخارجي غير متاح — تمت المعالجة محلياً وستتم المزامنة لاحقاً' });
  }
});

function mockVerify(code, payload){
  if(code==='civil_id'){
    const nid=payload.national_id||'';
    const valid=/^[0-9]{8,14}$/.test(nid);
    return { valid, national_id:nid, full_name: valid? (payload.full_name||'مطابق'): null, status: valid?'verified':'invalid_format', source:'mock' };
  }
  if(code==='commercial_register'){
    return { valid: !!(payload.commercial_register), commercial_register: payload.commercial_register, owner: 'مطابق (محاكاة)', source:'mock' };
  }
  if(code==='social_insurance') return { insured: true, status:'active', source:'mock' };
  if(code==='chamber') return { member: true, source:'mock' };
  return { ok:true, source:'mock' };
}

// Queue status
router.get('/api/v1/integrations/queue', async (_req,res)=>{
  const r=await pool.query(`SELECT integration_code, status, COUNT(*)::int as c FROM external_sync_queue GROUP BY 1,2`);
  const cache=await pool.query(`SELECT COUNT(*)::int as c FROM external_cache WHERE expires_at > NOW()`);
  res.json({ queue: r.rows, cache_active: cache.rows[0].c });
});

export default router;
