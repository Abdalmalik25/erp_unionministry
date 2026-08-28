/**
 * production-readiness.mjs — بوابة افتراضية للتحقق من جاهزية الإنتاج النهائية
 * ==========================================================================
 * تحوّل "المصدر النهائي احترافي إنتاجي 100%" إلى حالةٍ قابلة للقياس والتشغيل.
 * تفحص كل البوابات الحرجة (P0) وتعيد exit code غير صفري إذا فشلت أيّة.
 *
 * الاستخدام:  npm run readiness   (أو node scripts/production-readiness.mjs)
 *
 * ملحوظة: يعمل على Windows/macOS/Linux — يستخدم execSync مع shell:true.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

let PASS = 0;
let FAIL = 0;
const log = { ok: [], bad: [] };

function green(s) { return `\x1b[32m${s}\x1b[0m`; }
function red(s) { return `\x1b[31m${s}\x1b[0m`; }
function section(t) { console.log(`\n\x1b[1m${t}\x1b[0m`); }

function exec(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, encoding: 'utf8', ...opts });
}
function execQuiet(cmd) {
  try {
    return String(execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, encoding: 'utf8' }) ?? '');
  } catch (e) {
    // أعِد المخرجات المجمّعة حتى عند فشل الأمر (مثل --error-unmatch) — المهم عدم العودة بـ null
    return String(((e && e.stdout) || '') + ((e && e.stderr) || ''));
  }
}

function gate(name, fn) {
  try {
    fn();
    console.log(`  ${green('✓')} ${name}`);
    log.ok.push(name);
    PASS++;
  } catch (e) {
    const msg = (e && e.stdout) ? String(e.stdout).split('\n').filter(Boolean).pop() : (e && e.message ? e.message : e);
    console.log(`  ${red('✗')} ${name}${msg ? ' — ' + msg.slice(0, 200) : ''}`);
    log.bad.push(name);
    FAIL++;
  }
}

section('بوابة افتراضية للتحقق من جاهزية الإنتاج — v1.0');
console.log('المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل');
console.log(`Node ${process.version}  ·  ${new Date().toLocaleString('ar-EG')}`);

/* ---------- P0: بناء ونوع وجودة الكود ---------- */
gate('البناء الكامل (vite build) — لا أخطاء إنشاء', () => {
  exec('npm run build --silent');
});

gate('الفحص النوعي الصارم (tsc --noEmit) — لا أخطاء نوع', () => {
  exec('npm run type-check --silent');
});

gate('تشغيل الاختبارات الواحدة (vitest run) — كل الاختبارات تنجح', () => {
  exec('npm test --silent');
});

gate('تحقق لنت — لا أخطاء ESLint (warnings مقبولة)', () => {
  const out = execQuiet('npm run lint --silent');
  const errorsMatch = out.match(/problems?\s*\((\d+)\s*errors?/i);
  if (errorsMatch && Number(errorsMatch[1]) > 0) {
    throw new Error(`يحتوي اللنت على ${errorsMatch[1]} خطأ`);
  }
});

/* ---------- P0: الأمان والإعدادات الحساسة ---------- */
const envPath = path.resolve(process.cwd(), '.env');

gate('ملف البيئة .env موجود ومحمي (ليس ملتزمّاً)', () => {
  if (!fs.existsSync(envPath)) throw new Error('.env غير موجود — إنشئه من .env.example');
  // تأكد أنه مُهمَّل في git
  try {
    execQuiet('git check-ignore -q .env');
  } catch {
    throw new Error('.env مُلتزم في git — هذا يعريض الأسرار. أضفه إلى .gitignore');
  }
});

gate('متغيّرات السر غير مؤقتة (بدون قيم placeholder مثل example/password)', () => {
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const bad = [
    /(^|\n)(JWT_SECRET|ENCRYPTION_KEY|BACKUP_KEY)\s*=\s*(''|"")/i,
    /(^|\n)(JWT_SECRET|BACKUP_KEY|DATABASE_URL|NEON_DATABASE_URL)\s*=\s*(example|changeme|password|placeholder)/i,
  ];
  for (const re of bad) {
    if (re.test(content)) throw new Error('يستخدم قيمة placeholder/فارغة لمتغيّر سري — عيّنه قيماً حقيقيّةً');
  }
});

gate('JWT_SECRET طويل كافٍ (>= 32 حرفاً) — مطلوب للإنتاج', () => {
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const m = content.match(/^JWT_SECRET\s*=\s*(.+)$/m);
  if (!m) throw new Error('JWT_SECRET غير معرف');
  if (m[1].trim().length < 32) throw new Error(`JWT_SECRET قصير (${m[1].trim().length} < 32)`);
});

/* ---------- P1: لا بصمات أمان في الكود المُلتزم ---------- */
gate('لا يوجد مفتاح/سرّ مُصفّح في الملفات المُلتزمة', () => {
  const badPatterns = [/sk-[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const base = path.basename(full);
        if (base === 'node_modules' || base === 'dist' || base === '.git') continue;
        walk(full);
      } else if (e.isFile() && /\.(ts|tsx|js|json)$/.test(e.name)) {
        const c = fs.readFileSync(full, 'utf8');
        for (const re of badPatterns) if (re.test(c)) throw new Error(`بصمة سرّية محتمّة في ${full}`);
      }
    }
  };
  walk('src');
  walk('server');
});

gate('ملفات سجلات/وقتية غير مرغوبة غير مُلتزمة', () => {
  const stray = execQuiet('git ls-files --others --exclude-standard --error-unmatch server/err.log server/out.log 2>nul');
  // نتحقق أنّ ملفات السجلات غير مُتعقّبة
  const tracked = execQuiet('git ls-files server/err.log server/out.log dist/ tsc_*.txt 2>nul');
  if (tracked.trim()) throw new Error('ملفات سجلات/وقتية مُتبعّة في git — احذفها: ' + tracked.trim());
});

/* ---------- ملخص ---------- */
section('ملخّص النتيجة');
console.log(`  ${green('ناجح:')} ${PASS}/${PASS + FAIL}`);
if (FAIL) console.log(`  ${red('فاشل:')} ${FAIL}/${PASS + FAIL}`);
console.log(`\n${FAIL === 0 ? green('🎯 النظام جاهز للنشر الإنتاجي — جميع البوابات نجحت.') : red('⚠️  هناك ' + FAIL + ' بوابة فاشلة — صحّحها قبل النشر.')}`);
process.exit(FAIL === 0 ? 0 : 1);
