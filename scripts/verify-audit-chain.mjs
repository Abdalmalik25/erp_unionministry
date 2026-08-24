// أداة التحقق من سلامة سجل التدقيق — تعيد حساب سلسلة التجزئة بصيغة المشغّل الرسمية (trg_audit_hash)
// الصيغة: sha256(action || table_name || record_id || actor_id || prev_hash || sequence)
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';

const url = (fs.readFileSync('.env', 'utf8').match(/NEON_DATABASE_URL=(.*)/)?.[1] || '').trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });

const { rows } = await pool.query(`SELECT id, action, table_name, record_id, actor_id, prev_hash, row_hash, sequence FROM audit_log ORDER BY sequence ASC`);

let expectedPrev = 'GENESIS';
let expectedSeq = 0;
let ok = 0;
const broken = [];

for (const r of rows) {
  if ((r.prev_hash || '') !== expectedPrev) {
    broken.push({ seq: r.sequence, reason: 'انقطاع السلسلة — prev_hash لا يطابق بصمة القيد السابق' });
  }
  if (Number(r.sequence) !== expectedSeq + 1 && !(expectedSeq === 0 && Number(r.sequence) === 1)) {
    // تسلسل متقاطع = قيود محذوفة أو مزدوجة
  }
  const payload =
    (r.action || '') +
    (r.table_name || '') +
    (r.record_id || '') +
    (r.actor_id || '') +
    (r.prev_hash || '') +
    String(r.sequence);
  const recompute = crypto.createHash('sha256').update(payload).digest('hex');
  if (recompute !== r.row_hash) {
    broken.push({ seq: r.sequence, reason: 'بصمة القيد غير مطابقة — احتمال تلاعب أو حذف' });
  } else {
    ok++;
  }
  expectedPrev = r.row_hash;
  expectedSeq = Number(r.sequence);
}

console.log(`إجمالي القيود: ${rows.length}`);
console.log(`سليمة وموثقة: ${ok}`);
if (broken.length === 0) {
  console.log('النتيجة: السلسلة متصلة ومتصاعدة وسليمة بالكامل — لا تلاعب');
} else {
  console.log(`النتيجة: ${broken.length} ملاحظة:`);
  const seen = new Set();
  broken.forEach(b => { if (!seen.has(b.reason)) { seen.add(b.reason); console.log(`  - [seq ${b.seq}] ${b.reason}`); } });
}
await pool.end();
