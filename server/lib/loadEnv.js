// server/lib/loadEnv.js — محمّل متغيرات البيئة الموحد
// يستورد كسطر أول في كل وحدة تقرأ process.env على مستوى الملف،
// لأن رفع الاستيرادات في ESM ينفذ الوحدات المعتمدة قبل كود النقطة الرئيسية.
let loaded = false;
if (!loaded) {
  loaded = true;
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  // loadEnv في server/lib → الجذر على مستويين للأعلى
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
  try {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    });
  } catch {
    // لا يوجد .env (بيئة سحابية بمتغيرات نظام) — آمن
  }
}
