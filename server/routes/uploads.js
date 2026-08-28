// server/routes/uploads.js — منظومة رفع إنتاجية كاملة
// رفع ثنائي خام (رؤوس x-file-name + x-file-mime)، تحقق magic bytes + SHA-256،
// تخزين عشوائي معزول، سجل في uploaded_files، وتنزيل محمي بالمصادقة.
import express from 'express';
import crypto from 'crypto';
import { pool } from '../middleware/shared.js';
import { validateUpload, saveUpload, readStoredFile } from '../middleware/upload.js';

const router = express.Router();
const MIME_MAP = {
  'application/pdf':'application/pdf',
  'image/jpeg':'image/jpeg',
  'image/png':'image/png',
  'application/msword':'application/msword',
  'text/csv':'text/csv; charset=utf-8',
};

// رفع — جسم خام ثنائي (limit 10MB مطابق لحد validateUpload)
router.post('/api/v1/uploads', express.raw({ type: '*/*', limit: '10mb' }), async (req,res)=>{
  if(!req.user) return res.status(401).json({ error:'غير مصرح', code:'UNAUTHORIZED' });
  if(!req.body || !req.body.length) return res.status(400).json({ error:'لا يوجد محتوى ملف', code:'EMPTY_FILE' });
  const originalName = String(req.headers['x-file-name']||'file.bin');
  const mime = String(req.headers['x-file-mime']||'application/octet-stream');
  const check = validateUpload({ buffer: req.body, size: req.body.length, originalname: originalName, mimetype: mime });
  if(!check.ok) return res.status(400).json({ error: check.error, code: check.code || 'INVALID_FILE' });
  const saved = saveUpload(req.body, check.safeName);
  if(!saved.ok) return res.status(500).json({ error: saved.error, code:'STORAGE_ERROR' });
  try {
    const r = await pool.query(
      `INSERT INTO uploaded_files (original_name, safe_name, mime_type, size_bytes, sha256, storage_path, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, original_name, mime_type, size_bytes, sha256, created_at`,
      [originalName, check.safeName, mime, req.body.length, check.sha256, saved.storagePath, req.user.sub]);
    res.status(201).json({ ...r.rows[0], url: `/api/v1/uploads/${r.rows[0].id}` });
  } catch (e) {
    res.status(500).json({ error:'خطأ في تسجيل الملف', code:'INTERNAL_ERROR' });
  }
});

// تنزيل — مصادقة مطلوبة + بث فعلي من القرص
router.get('/api/v1/uploads/:id', async (req,res)=>{
  if(!req.user) return res.status(401).json({ error:'غير مصرح', code:'UNAUTHORIZED' });
  const r = await pool.query('SELECT * FROM uploaded_files WHERE id=$1', [req.params.id]);
  if(!r.rows.length) return res.status(404).json({ error:'غير موجود', code:'NOT_FOUND' });
  const f = r.rows[0];
  const content = readStoredFile(f.safe_name);
  if(!content) return res.status(410).json({ error:'الملف لم يعد متوفراً', code:'FILE_GONE' });
  // تحقق سلامة عند التنزيل — الشهادة الرقمية للمحتوى
  const live = crypto.createHash('sha256').update(content).digest('hex');
  if (live !== f.sha256) return res.status(500).json({ error:'فشل التحقق من سلامة الملف', code:'INTEGRITY_FAIL' });
  res.setHeader('Content-Type', MIME_MAP[f.mime_type] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(f.original_name)}"`);
  res.setHeader('X-Content-SHA256', f.sha256);
  res.send(content);
});

// سجل الملفات
router.get('/api/v1/uploads', async (req,res)=>{
  if(!req.user) return res.status(401).json({ error:'غير مصرح', code:'UNAUTHORIZED' });
  const r = await pool.query(
    'SELECT id, original_name, mime_type, size_bytes, sha256, created_at FROM uploaded_files ORDER BY created_at DESC LIMIT 100');
  res.json({ data: r.rows });
});

export default router;