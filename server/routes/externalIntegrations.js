// externalIntegrations.js — محول ذكي: live → fallback → mock (كفاءة واعتمادية)
import express from 'express';
import { pool } from '../middleware/shared.js';
import { requirePermission } from '../middleware/rbac.js';
import crypto from 'crypto';
import { invalidateCache } from '../middleware/cache.js';
const router=express.Router();

// List
router.get('/api/v1/integrations', async (_req,res)=>{
  const r=await pool.query(`SELECT id, code, name_ar, name_en, party_type, base_url, auth_type, status, mode, is_required, timeout_ms, retry_count, last_check_at, last_error, config, created_at, updated_at FROM external_integrations ORDER BY code`);
  res.json({ data: r.rows });
});
// Toggle mode/status — بدون كود
router.put('/api/v1/integrations/:code/mode', requirePermission('write:integrations'), async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية وزارة', code:'FORBIDDEN' });
  const { mode, status } = req.body;
  const r=await pool.query(`UPDATE external_integrations SET mode=COALESCE($1,mode), status=COALESCE($2,status), updated_at=NOW() WHERE code=$3 RETURNING *`, [mode||null, status||null, req.params.code]);
  if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
  res.json(r.rows[0]);
  invalidateCache('dashboard');
});

// Verify — ذكي: يحاول live، يسقط لـ mock/cache/queue
router.post('/api/v1/integrations/:code/verify', requirePermission('write:integrations'), async (req,res)=>{
  const { code } = req.params;
  const payload = req.body;
  const start=Date.now();
  const integ = await pool.query(`SELECT id, code, name_ar, name_en, party_type, base_url, auth_type, status, mode, is_required, timeout_ms, retry_count, last_check_at, last_error, config, created_at, updated_at FROM external_integrations WHERE code=$1`, [code]);
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
  // Live attempt — استدعاء HTTP حقيقي لـ base_url مع مهلة + إعادة محاولة + تحديث حالة الطرف
  try{
    if(!cfg.base_url) throw new Error('no_base_url_configured');
    const endpoint = LIVE_ENDPOINTS[code] || '/verify';
    const url = cfg.base_url.replace(/\/+$/,'') + endpoint;
    const headers = { 'Content-Type':'application/json' };
    if (cfg.config?.api_key) headers['Authorization'] = `Bearer ${cfg.config.api_key}`;
    if (cfg.config?.api_key_header && cfg.config?.api_key) headers[cfg.config.api_key_header] = cfg.config.api_key;
    const controller=new AbortController();
    const t=setTimeout(()=> controller.abort(), cfg.timeout_ms||5000);
    let resp=null, lastErr=null;
    const attempts = 1 + Math.min(Number(cfg.retry_count)||0, 3);
    for(let a=0; a<attempts; a++){
      try{
        resp = await fetch(url, { method:'POST', signal:controller.signal, headers, body: JSON.stringify(payload) });
        break;
      }catch(e){ lastErr=e; }
    }
    clearTimeout(t);
    if(!resp) throw lastErr || new Error('upstream_unreachable');
    if(!resp.ok) throw new Error(`upstream_${resp.status}`);
    const upstream = await resp.json();
    await pool.query(`UPDATE external_integrations SET last_check_at=NOW(), last_error=NULL WHERE code=$1`, [code]);
    const result = normalizeLive(code, upstream);
    await pool.query(`INSERT INTO external_cache (cache_key, integration_code, response, expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL '5 minutes') ON CONFLICT (cache_key) DO UPDATE SET response=$3`, [cacheKey, code, JSON.stringify(result)]);
    return res.json({ mode:'live', result, took_ms: Date.now()-start });
  }catch(e){
    await pool.query(`UPDATE external_integrations SET last_check_at=NOW(), last_error=$2 WHERE code=$1`, [code, String(e?.message||e).slice(0,300)]);
    // السقوط الآمن القائم — طابور مزامنة + استجابة محلية (محفوظ تزايدياً)
    await pool.query(`INSERT INTO external_sync_queue (integration_code, payload, operation, status, next_retry_at) VALUES ($1,$2,'verify','pending', NOW()+INTERVAL '5 minutes')`, [code, JSON.stringify(payload)]);
    const mock = mockVerify(code, payload);
    return res.json({ mode:'fallback', result: mock, took_ms: Date.now()-start, queued:true, warning:'الطرف الخارجي غير متاح — تمت المعالجة محلياً وستتم المزامنة لاحقاً' });
  }
});

// نقاط النهاية القياسية لكل طرف حسب بروتوكولاته المتعارف عليها
const LIVE_ENDPOINTS = {
  civil_id: '/verify/identity',
  commercial_register: '/verify/commercial-register',
  social_insurance: '/verify/insurance',
  chamber: '/verify/membership',
};

// تطبيع استجابة الطرف الخارجي إلى الشكل الموحد الذي تستهلكه الواجهة
function normalizeLive(code, upstream){
  const d = upstream?.data || upstream?.result || upstream || {};
  if(code==='civil_id'){
    return { valid: d.valid ?? d.verified ?? d.match ?? false, national_id: d.national_id ?? d.id_number, full_name: d.full_name ?? d.name ?? null, status: d.status ?? 'verified', source: 'live' };
  }
  if(code==='commercial_register'){
    return { valid: d.valid ?? d.exists ?? d.active ?? false, commercial_register: d.commercial_register ?? d.registration_number, owner: d.owner ?? d.entity_name ?? null, status: d.status ?? 'verified', source: 'live' };
  }
  if(code==='social_insurance') return { insured: d.insured ?? d.registered ?? false, status: d.status ?? 'active', source: 'live' };
  if(code==='chamber') return { member: d.member ?? d.is_member ?? false, status: d.status ?? 'active', source: 'live' };
  return { ok: d.ok ?? true, ...d, source: 'live' };
}

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
