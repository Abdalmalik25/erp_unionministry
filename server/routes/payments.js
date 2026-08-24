// server/routes/payments.js — Institutional payments (gateway-agnostic, no hard external dep)
import express from 'express';
import { pool } from '../middleware/shared.js';
import crypto from 'crypto';
const router=express.Router();

router.post('/api/v1/payments', async (req,res)=>{
  const { service_instance_id, amount, method, payer_type, payer_id } = req.body;
  if(!amount) return res.status(400).json({ error:'amount مطلوب', code:'VALIDATION_ERROR' });
  const num=`PAY-${Date.now().toString(36).toUpperCase()}`;
  const r=await pool.query(
    `INSERT INTO payments (payment_number, service_instance_id, payer_type, payer_id, amount, method, status) VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
    [num, service_instance_id||null, payer_type||null, payer_id||req.user?.id||null, amount, method||'cash']
  );
  res.status(201).json(r.rows[0]);
});

router.put('/api/v1/payments/:id/confirm', async (req,res)=>{
  if(!req.user || !['super_admin','ministry_admin','financial_officer'].includes(req.user.role)) return res.status(403).json({ error:'صلاحية مالية فقط', code:'FORBIDDEN' });
  const hash=crypto.createHash('sha256').update(req.params.id).digest('hex');
  const r=await pool.query(`UPDATE payments SET status='paid', receipt_hash=$1, paid_at=NOW() WHERE id=$2 RETURNING *`, [hash, req.params.id]);
  if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
  res.json(r.rows[0]);
});

router.get('/api/v1/payments', async (req,res)=>{
  const r=await pool.query(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 20`);
  res.json({ data: r.rows });
});

// Signature
router.post('/api/v1/signatures', async (req,res)=>{
  const { entity_type, entity_id, signer_role } = req.body;
  if(!entity_type || !entity_id) return res.status(400).json({ error:'entity_type/entity_id مطلوب', code:'VALIDATION_ERROR' });
  const hash=crypto.createHash('sha256').update(entity_type+entity_id+Date.now()).digest('hex');
  const r=await pool.query(
    `INSERT INTO digital_signatures (entity_type, entity_id, signer_person_id, signer_role, signature_hash, verification_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [entity_type, entity_id, req.user?.id||null, signer_role||req.user?.role||'signer', hash, `/verify/${hash}`]
  );
  res.status(201).json(r.rows[0]);
});

export default router;
