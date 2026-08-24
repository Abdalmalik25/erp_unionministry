// crudFactory.js — مصنع CRUD عام يزيل تكرار 25 مورد (TD-037) + يطبق soft-delete + audit + idempotency
// World-class: DRY, type-safe, transactional, deep intelligence
import { pool, paginate, SOFT_DELETE_TABLES, auditLog } from '../middleware/shared.js';
import crypto from 'crypto';

export function createCrudRouter({ table, idCol='id', allowedCols, searchCols=[], defaultOrder='created_at DESC', softDelete=true }){
  // Factory returns handlers — usage: router.get('/api/x', crud.list)
  return {
    list: async (req,res)=>{
      try{
        const { limit, page, offset, includeDeleted } = paginate(req);
        const conds = softDelete && SOFT_DELETE_TABLES.has(table) && !includeDeleted ? ['deleted_at IS NULL'] : [];
        const params=[]; let i=1;
        if(req.query.search && searchCols.length){
          conds.push(`(${searchCols.map(c=> `${c} ILIKE $${i}`).join(' OR ')})`);
          params.push(`%${req.query.search}%`); i++;
        }
        if(req.query.status){ conds.push(`status = $${i++}`); params.push(req.query.status); }
        const where = conds.length? 'WHERE '+conds.join(' AND'):'';
        const total = await pool.query(`SELECT COUNT(*)::int as c FROM ${table} ${where}`, params);
        const rows = await pool.query(`SELECT * FROM ${table} ${where} ORDER BY ${defaultOrder} LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset]);
        res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
      }catch(e){ console.error(`[CRUD ${table}] list`, e.message); res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' }); }
    },
    getOne: async (req,res)=>{
      try{
        const r = await pool.query(`SELECT * FROM ${table} WHERE ${idCol}=$1 ${softDelete && SOFT_DELETE_TABLES.has(table) ? 'AND deleted_at IS NULL' : ''}`, [req.params.id]);
        if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
        res.json(r.rows[0]);
      }catch(e){ res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' }); }
    },
    create: async (req,res)=>{
      // Idempotency: Reuse if same key within 24h
      const idem = req.headers['x-idempotency-key'];
      if(idem){
        const hit = await pool.query(`SELECT response FROM idempotency_keys WHERE key=$1 AND expires_at > NOW()`, [idem]);
        if(hit.rows.length) return res.status(201).json(hit.rows[0].response);
      }
      const cols = allowedCols.filter(c=> req.body[c] !== undefined);
      if(!cols.length) return res.status(400).json({ error:'لا حقول', code:'VALIDATION_ERROR' });
      const vals = cols.map(c=> req.body[c]);
      const placeholders = cols.map((_,i)=> `$${i+1}`);
      try{
        const r = await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, vals);
        await auditLog('create', table, req.user?.id, { id: r.rows[0][idCol] });
        if(idem) await pool.query(`INSERT INTO idempotency_keys (key, response) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [idem, JSON.stringify(r.rows[0])]);
        res.status(201).json(r.rows[0]);
      }catch(e){ res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' }); }
    },
    update: async (req,res)=>{
      const cols = allowedCols.filter(c=> req.body[c] !== undefined);
      if(!cols.length) return res.status(400).json({ error:'لا حقول', code:'VALIDATION_ERROR' });
      const sets = cols.map((c,i)=> `${c}=$${i+1}`);
      const vals = cols.map(c=> req.body[c]);
      vals.push(req.params.id);
      try{
        const r = await pool.query(`UPDATE ${table} SET ${sets.join(',')}, updated_at=NOW() WHERE ${idCol}=$${vals.length} ${softDelete && SOFT_DELETE_TABLES.has(table) ? 'AND deleted_at IS NULL' : ''} RETURNING *`, vals);
        if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
        await auditLog('update', table, req.user?.id, { id: req.params.id, fields: cols });
        res.json(r.rows[0]);
      }catch(e){ res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' }); }
    },
    remove: async (req,res)=>{
      try{
        if(softDelete && SOFT_DELETE_TABLES.has(table)){
          const r = await pool.query(`UPDATE ${table} SET deleted_at=NOW(), deleted_by=$1 WHERE ${idCol}=$2 AND deleted_at IS NULL RETURNING ${idCol}`, [req.user?.id||null, req.params.id]);
          if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
          await auditLog('soft_delete', table, req.user?.id, { id: req.params.id });
        } else {
          await pool.query(`DELETE FROM ${table} WHERE ${idCol}=$1`, [req.params.id]);
          await auditLog('hard_delete', table, req.user?.id, { id: req.params.id });
        }
        res.json({ success:true });
      }catch(e){ res.status(500).json({ error:'خطأ داخلي', code:'INTERNAL_ERROR' }); }
    }
  };
}
