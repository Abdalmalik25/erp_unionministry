// استعادة النسخ المشفرة — آمنة بالتصميم
//   فحص جاف (افتراضي):  node scripts/restore-db.mjs [backup-<stamp>.enc]
//   استعادة فعلية:      node scripts/restore-db.mjs --confirm [backup-<stamp>.enc]
// التحقق: بصمة SHA-256 ثم مصادقة GCM — أي عبث يُكتشف قبل لمس قاعدة البيانات
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import pg from 'pg';

const argv = process.argv.slice(2);
const confirm = argv.includes('--confirm');
const fileArg = argv.find(a => a.endsWith('.enc'));

function pickBackup() {
  if (fileArg) return path.join('backups', path.basename(fileArg));
  const list = fs.readdirSync('backups').filter(f => f.endsWith('.enc')).sort();
  if (!list.length) { console.error('لا توجد نسخ مشفرة في backups/'); process.exit(1); }
  return path.join('backups', list.at(-1));
}
const encPath = pickBackup();
console.log(`النسخة: ${encPath}${confirm ? '  [وضع الاستعادة الفعلي!]' : '  [فحص جاف]'}`);

// ---------- المفتاح ----------
const keyHex = fs.readFileSync('.env', 'utf8').match(/BACKUP_KEY=([0-9a-fA-F]{64})/)?.[1];
if (!keyHex) { console.error('✗ BACKUP_KEY غير موجود في .env — لا يمكن فك التشفير'); process.exit(1); }
const KEY = Buffer.from(keyHex, 'hex');

// ---------- تحقق السلامة: SHA-256 ----------
const blob = fs.readFileSync(encPath);
const sha = crypto.createHash('sha256').update(blob).digest('hex');
const shaSidecar = fs.existsSync(`${encPath}.sha256`) ? fs.readFileSync(`${encPath}.sha256`, 'utf8').split(/\s+/)[0] : null;
if (shaSidecar) {
  if (shaSidecar !== sha) { console.error('✗ فشلت بصمة SHA-256 — الملف مُعدَّل أو تالف. أوقف الاستعادة.'); process.exit(1); }
  console.log(`✓ بصمة SHA-256 مطابقة (${sha.slice(0, 16)}…)`);
}

// ---------- فك التشفير بمصادقة GCM ----------
try {
  if (blob.subarray(0, 9).toString('utf8') !== 'NLSMPBAK1') throw new Error('ترويسة غير معروفة');
  const ivLen = blob[9];
  const iv = blob.subarray(10, 10 + ivLen);
  const tag = blob.subarray(10 + ivLen, 10 + ivLen + 16);
  const data = blob.subarray(10 + ivLen + 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const plain = zlib.gunzipSync(Buffer.concat([decipher.update(data), decipher.final()]));
  var payload = JSON.parse(plain.toString('utf8'));
  console.log(`✓ التشفير سليم (GCM) — نسخة ${payload.stamp}، ${Object.keys(payload.tables).length} جدولاً`);
} catch {
  console.error('✗ فك التشفير فشل — ملف تالف أو مفتاح خاطئ أو عبث. لم تُلمس قاعدة البيانات.');
  process.exit(1);
}

// ---------- مقارنة بالحالة الحية ----------
const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });
await pool.query('SET statement_timeout = 300000');

let drift = 0;
const tableNames = Object.keys(payload.tables);
for (const t of tableNames) {
  let live;
  try { live = (await pool.query(`SELECT COUNT(*)::int AS n FROM "${t}"`)).rows[0].n; }
  catch { live = 'غير موجودة'; }
  const bc = (payload.tables[t] ?? []).length;
  if (live !== bc) { drift++; console.log(`Δ ${t}: النسخة=${bc} | الحي=${live}`); }
}
console.log(`جداول مختلفة: ${drift}/${tableNames.length}`);

if (!confirm) {
  console.log('فحص جاف اكتمل — لم تُكتب أي بيانات. للتنفيذ: --confirm');
} else {
  console.log('استعادة فعلية داخل معاملة واحدة…');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of tableNames) {
      const rows = payload.tables[t] ?? [];
      await client.query(`DELETE FROM "${t}"`);
      for (const row of rows) {
        const cols = Object.keys(row);
        if (!cols.length) continue;
        await client.query(
          `INSERT INTO "${t}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT DO NOTHING`,
          cols.map(c => row[c] === undefined ? null : row[c]),
        );
      }
    }
    await client.query('COMMIT');
    console.log('✓ استُعيدت النسخة المشفرة بنجاح');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('✗ فشل — تراجعت المعاملة كاملة:', e.message);
  } finally {
    client.release();
  }
}
await pool.end();
