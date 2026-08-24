# المنظومة الوطنية للعمل النقابي

**وزارة الشؤون الاجتماعية والعمل — الجمهورية اليمنية**
الإصدار 2.1.0 — الإصدار المؤسسي الأول

منصة حكومية موحدة لإدارة قطاع العمل: النقابات والاتحادات، المنشآت التجارية، العاملون، والتفتيش والامتثال — وفق الأنظمة القانونية اليمنية (قانون العمل رقم 12 لسنة 1995 وتعديلاته).

---

## المعمارية

| الطبقة | التقنية | الملاحظات |
|---|---|---|
| الواجهة | React 19 + TypeScript + Vite + Tailwind v4 | عربية RTL، خطوط Tajawal/Noto Naskh الرسمية، PWA بعمل دون اتصال |
| الخادم | Node ≥ 20 + Express 5.2 | JWT + RBAC بستة أدوار، سجل تدقيق شامل، يخدم الواجهة إنتاجياً على :4000 |
| قاعدة البيانات | PostgreSQL (Neon) مع SSL | 429 فهرس أداء، حذف ناعم، ترحيلات مُرقّمة ومتكررة الأمان |

## البنية

```
src/app/            الواجهة (مكونات، صفحات، سياقات، خطافات، أدوات)
server/             الخادم (index.js, routes/, middleware/, lib/)
scripts/            الترحيلات وأدوات التشغيل والفحص
supabase/migrations/ ترحيلات SQL الأساسية
docs/               التوثيق الرسمي (DEPLOYMENT, SECURITY, NATIONAL_LABOR_PLATFORM/)
docs/archive/       وثائق مراحل التطوير السابقة
tests/              اختبارات الدخان
```

## التشغيل السريع

```bash
npm install
cp .env.example .env      # ثم عبّئ DATABASE_URL و JWT_SECRET
npm run db:setup          # ترحيل + تهيئة البيانات المرجعية
npm run build             # بناء الواجهة
npm run start:prod        # تشغيل الإنتاجي على :4000
```

الدليل الكامل متطلبات البيئة وبوابات الإقلاع الأمنية والتحقق بعد النشر: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

## الجودة

- `npm run type-check` — تدقيق أنواع صارم (صفر أخطاء)
- `npm test` — 74 اختباراً (RBAC، البوابات، API، الدخان)
- `node scripts/scan-mojibake.mjs` — مسح العطب النصي (صفر)
- `node scripts/check-staged-secrets.mjs` — فحص أسرار ما قبل الالتزام

## الأمان

المصادقة إلزامية إنتاجياً (`ENABLE_AUTH=true`، يرفض الخادم الإقلاع خلافها)، bcrypt(12)، حد طلبات 300/15د، ترويسات HSTS/CSP صارمة، سجلات تدقيق غير قابلة للتلاعب. التفاصيل في [docs/SECURITY.md](docs/SECURITY.md).

## الأدوار

`ministry_admin` · `ministry_staff` · `union_admin` · `union_officer` · `enterprise_admin` · `enterprise_user`

مصفوفة الصلاحيات: `src/app/hooks/usePermissions.tsx` — مختبرة بالكامل.

## السياسات المؤسسية

إعدادات السياسات (كنسبة اليمنة المستهدفة) تُدار من قاعدة البيانات عبر `system_settings` وتُتاح للواجهة عبر `GET /api/system/policy` — دون الحاجة لتعديل الشيفرة.

---

© وزارة الشؤون الاجتماعية والعمل — جميع الحقوق محفوظة
