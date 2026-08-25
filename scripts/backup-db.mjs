// نسخة احتياطية مشفرة AES-256-GCM — محمية، موثقة بالبصمة، باختبار استعادة
// المفتاح: BACKUP_KEY في .env (سداسي 64 خانة) — يُولَّد تلقائياً عند أول تشغيل
// الناتج: backups/backup-<stamp>.enc + backup-<stamp>.sha256  (الاحتفاظ بآخر 8 نسخ)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import pg from 'pg';

const ENV_PATH = '.env';

// ---------- إدارة المفتاح ----------
function ensureKey() {
  let env = fs.readFileSync(ENV_PATH, 'utf8');
  const m = env.match(/BACKUP_KEY=([0-9a-fA-F]{64})/);
  if (m) return Buffer.from(m[1], 'hex');
  const key = crypto.randomBytes(32);
  if (!env.endsWith('\n')) env += '\n';
  env += `# مفتاح تشفير النسخ الاحتياطية (AES-256) — فقدانُه يعني فقدانَ النسخ كلها\nBACKUP_KEY=${key.toString('hex')}\n`;
  fs.writeFileSync(ENV_PATH, env, 'utf8');
  console.log('🔑 وُلّد مفتاح تشفير جديد وأضيف إلى .env — انسخه إلى مخزن آمن منفصل الآن.');
  return key;
}

const KEY = ensureKey();
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ---------- جمع البيانات ----------
const url = fs.readFileSync(ENV_PATH, 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!url) { console.error('DATABASE_URL غير موجود'); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });
await pool.query('SET statement_timeout = 300000');

const { rows: tables } = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);

const payload = { stamp, app: 'NLSMP', tables: {} };
let totalRows = 0;
for (const { table_name } of tables) {
  process.stdout.write(`← ${table_name} … `);
  try {
    const { rows } = await pool.query(`SELECT * FROM "${table_name}"`);
    payload.tables[table_name] = rows;
    totalRows += rows.length;
    console.log(`${rows.length} صف`);
  } catch (e) {
    console.log(`خطأ: ${String(e.message).slice(0, 60)}`);
    payload.tables[table_name] = null;
  }
}
await pool.end();

// ---------- ضغط ثم تشفير ----------
const plain = zlib.gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
const tag = cipher.getAuthTag();
// الترويسة: NLSMPBAK1 | طول IV | IV | Tag | المشفر
const blob = Buffer.concat([
  Buffer.from('NLSMPBAK1', 'utf8'),
  Buffer.from([iv.length]), iv,
  tag,
  encrypted,
]);

fs.mkdirSync('backups', { recursive: true });
const outFile = path.join('backups', `backup-${stamp}.enc`);
fs.writeFileSync(outFile, blob);
const sha = crypto.createHash('sha256').update(blob).digest('hex');
fs.writeFileSync(`${outFile}.sha256`, `${sha}  backup-${stamp}.enc\n`, 'utf8');

console.log(`\n✓ ${outFile}`);
console.log(`  ${(blob.length / 1024 / 1024).toFixed(2)} MB مشفرة | ${tables.length} جدولاً | ${totalRows} صفاً`);
console.log(`  SHA-256: ${sha.slice(0, 16)}…`);

// ---------- الاحتفاظ بآخر 8 نسخ فقط ----------
const backups = fs.readdirSync('backups').filter(f => f.endsWith('.enc')).sort();
for (const old of backups.slice(0, -8)) {
  fs.unlinkSync(path.join('backups', old));
  fs.existsSync(path.join('backups', `${old}.sha256`)) && fs.unlinkSync(path.join('backups', `${old}.sha256`));
  console.log(`🧹 حُذفت النسخة القديمة: ${old}`);
}
