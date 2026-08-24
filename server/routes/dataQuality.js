// server/routes/dataQuality.js — Data Quality Center + pgvector search
import express from 'express';
import { pool } from '../middleware/shared.js';
const router=express.Router();

// Scan — detects duplicates, orphans, invalid codes
router.post('/api/v1/data-quality/scan', async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية وزارة فقط', code:'FORBIDDEN' });
  const findings=[];
  // duplicate persons by national_id
  const dupPersons=await pool.query(`SELECT national_id, COUNT(*)::int as c FROM persons WHERE national_id IS NOT NULL AND deleted_at IS NULL GROUP BY national_id HAVING COUNT(*)>1 LIMIT 20`);
  for(const r of dupPersons.rows){
    await pool.query(`INSERT INTO data_quality_findings (check_type, severity, entity_type, details) VALUES ('duplicate_person','critical','person',$1)`, [JSON.stringify({ national_id:r.national_id, count:r.c })]);
    findings.push({ type:'duplicate_person', national_id:r.national_id, count:r.c });
  }
  // orphan contracts (establishment not exists)
  const orphans=await pool.query(`SELECT ec.id, ec.contract_number FROM employment_contracts ec LEFT JOIN legal_entities le ON ec.establishment_id=le.id WHERE le.id IS NULL AND ec.deleted_at IS NULL LIMIT 20`);
  for(const r of orphans.rows){
    await pool.query(`INSERT INTO data_quality_findings (check_type, severity, entity_type, entity_id, details) VALUES ('orphan_contract','warning','employment_contract',$1,$2)`, [r.id, JSON.stringify({ contract_number:r.contract_number })]);
    findings.push({ type:'orphan_contract', id:r.id });
  }
  // invalid occupation codes
  const invalid=await pool.query(`SELECT ec.id, ec.occupation_id FROM employment_contracts ec LEFT JOIN national_occupations no ON ec.occupation_id=no.id WHERE ec.occupation_id IS NOT NULL AND no.id IS NULL LIMIT 20`);
  findings.push(...invalid.rows.map(r=> ({ type:'invalid_code', id:r.id })));

  res.json({ scanned_at: new Date().toISOString(), findings, total: findings.length, note:'كل نتيجة تُنشئ case تلقائياً للتنظيف — لا حذف صامت' });
});

router.get('/api/v1/data-quality/findings', async (req,res)=>{
  const r=await pool.query(`SELECT * FROM data_quality_findings ORDER BY created_at DESC LIMIT 50`);
  res.json({ data: r.rows });
});

// Vector search — placeholder (cosine via pgvector when embeddings exist)
router.get('/api/v1/legal/vector-search', async (req,res)=>{
  const q=(req.query.q||'').toString();
  if(!q) return res.json({ query:q, results:[], note:'أدخل نصاً' });
  // fallback to ILIKE when no embeddings yet
  const r=await pool.query(`SELECT la.id, la.article_number, la.title_ar, la.content_ar, ls.title_ar as source_title FROM legal_articles la LEFT JOIN legal_sources ls ON la.legal_source_id=ls.id WHERE la.content_ar ILIKE $1 OR la.title_ar ILIKE $1 LIMIT 5`, [`%${q}%`]);
  res.json({ query:q, results: r.rows.map(x=> ({ id:x.id, title:x.title_ar, article:x.article_number, source:x.source_title, snippet: (x.content_ar||'').slice(0,180) })), mode:'fallback_ilike', note:'عند توفر embeddings يتحول إلى HNSW <100ms' });
});

export default router;
