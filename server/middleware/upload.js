// upload.js — TD-023 payoff: منظومة رفع إنتاجية كاملة (بلا اعتماديات خارجية)
// تحقق حقيقي: الامتداد + MIME + بصمة المحتوى (magic bytes) + SHA-256 للمحتوى
// تخزين فعلي على القرص بأسماء عشوائية مشتقة من crypto + حماية من path traversal
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALLOWED_MIME = new Set(['application/pdf','image/jpeg','image/png','application/msword','text/csv']);
const ALLOWED_EXT = new Set(['.pdf','.jpg','.jpeg','.png','.doc','.docx','.csv']);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads');

/** فحص magic bytes حقيقي — بصمة المحتوى لا تُخدع بادعاءات الرؤوس */
export function sniffMagic(buf){
  if(!buf || buf.length < 8) return null;
  const b = buf;
  if (b[0]===0x25 && b[1]===0x50 && b[2]===0x44 && b[3]===0x46) return 'application/pdf';               // %PDF
  if (b[0]===0xFF && b[1]===0xD8 && b[2]===0xFF) return 'image/jpeg';                                    // JPEG
  if (b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47) return 'image/png';                      // PNG
  if (b[0]===0xD0 && b[1]===0xCF && b[2]===0x11 && b[3]===0xE0) return 'application/msword';             // OLE2 (doc)
  if (b[0]===0x50 && b[1]===0x4B && (b[2]===0x03 || b[2]===0x05 || b[2]===0x07)) return 'application/zip'; // PK (docx)
  // CSV/نص: كل البايتات المبكرة قابلة للطباعة أو CRLF/TAB/BOM
  const head = b.subarray(0, Math.min(512, b.length));
  const printable = [...head].every(c => (c>=0x20 && c<0x7F) || c===0x0A || c===0x0D || c===0x09 || c>=0x80 || c===0xEF);
  if (printable) return 'text/csv';
  return null;
}

export function validateUpload(file){
  if(!file || !Buffer.isBuffer(file.buffer)) return { ok:false, error:'لا يوجد ملف صالح' };
  if(file.size > MAX_SIZE || file.buffer.length > MAX_SIZE) return { ok:false, error:'حجم الملف >10MB' };
  const ext = '.'+ (file.originalname||'').split('.').pop().toLowerCase();
  if(!ALLOWED_EXT.has(ext)) return { ok:false, error:'امتداد غير مسموح' };
  if(!ALLOWED_MIME.has(file.mimetype)) return { ok:false, error:'MIME غير مسموح' };
  // بصمة المحتوى الحقيقية — تطابق التوقيع مع الامتداد/MIME المصرح
  const sniffed = sniffMagic(file.buffer);
  if(!sniffed) return { ok:false, error:'بصمة الملف غير معروفة — مرفوض', code:'MAGIC_MISMATCH' };
  const compatible =
    sniffed === file.mimetype ||
    (sniffed === 'application/zip' && ext === '.docx') ||
    (sniffed === 'application/msword' && ext === '.doc');
  if(!compatible) return { ok:false, error:'محتوى الملف لا يطابق نوعه المصرح', code:'MAGIC_MISMATCH' };
  // اسم تخزين عشوائي حقيقي — لا قابلية للتخمين ولا path traversal
  const safeName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
  // بصمة SHA-256 حقيقية للمحتوى — للتكامل والتحقق من عدم العبث لاحقاً
  const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
  return { ok:true, safeName, sha256 };
}

/** تخزين فعلي على القرص داخل UPLOAD_DIR المعزول */
export function saveUpload(buffer, safeName){
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const target = path.join(UPLOAD_DIR, path.basename(safeName)); // basename يمنع أي traversal
  if (!target.startsWith(UPLOAD_DIR)) return { ok:false, error:'مسار تخزين غير صالح' };
  fs.writeFileSync(target, buffer, { mode: 0o600 });
  return { ok:true, storagePath: target };
}

export function readStoredFile(safeName){
  const target = path.join(UPLOAD_DIR, path.basename(safeName));
  if (!target.startsWith(UPLOAD_DIR) || !fs.existsSync(target)) return null;
  return fs.readFileSync(target);
}

export function fileSecurityMiddleware(req,res,next){
  // For multipart, validate; for JSON file_url, validate URL
  if(req.body?.file_url){
    try{
      const u=new URL(req.body.file_url);
      if(!['https:'].includes(u.protocol)) return res.status(400).json({ error:'رابط الملف يجب https', code:'INVALID_URL' });
    }catch{ return res.status(400).json({ error:'رابط غير صالح', code:'INVALID_URL' }); }
  }
  next();
}
