# دليل النشر الرسمي — المنظومة الوطنية للعمل النقابي

**وزارة الشؤون الاجتماعية والعمل — الجمهورية اليمنية**
الإصدار: 2.1.0 | آخر تحديث: أغسطس 2026

---

## 1. نظرة معمارية

```
┌─────────────────────┐      ┌──────────────────────────┐      ┌─────────────────┐
│  الواجهة (React 19) │ HTTP │  الخادم (Express 5 +     │ SSL  │  Neon PostgreSQL │
│  Vite / TypeScript  │ ───► │  JWT RBAC) :4000        │ ───► │  (مُدار سحابياً)  │
│  PWA — عمل دون اتصال │      │  يخدم dist/ إنتاجياً     │      │                 │
└─────────────────────┘      └──────────────────────────┘      └─────────────────┘
```

- **الواجهة**: React 19 + TypeScript + Tailwind v4، عربية RTL بالكامل، خطوط Tajawal/Noto Naskh الرسمية.
- **الخادم**: Node ≥ 20، Express 5.2، مصادقة JWT + RBAC بستة أدوار وزارية، سجل تدقيق شامل.
- **قاعدة البيانات**: PostgreSQL عبر Neon — 429 فهارس أداء، حذف ناعم، قيود تكامل مرجعية.

## 2. المتطلبات

| المكوّن | الحد الأدنى |
|---|---|
| Node.js | 20 LTS (مُختبر على 24) |
| npm | 10 |
| ذاكرة الخادم | 1 GB |
| منفذ | 4000 (API + الواجهة الإنتاجية) |

## 3. التثبيت والتهيئة

```bash
# 1) تثبيت الاعتماديات
npm install

# 2) تهيئة البيئة
cp .env.example .env
#   ثم عبّئ DATABASE_URL و NEON_DATABASE_URL و JWT_SECRET (≥32 حرفاً)
#   توليد سر آمن:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3) ترحيلات قاعدة البيانات (بالترتيب)
npm run db:migrate            # الترحيل الأساسي + الفهارس المبكرة
node scripts/migrate-performance-indexes.mjs   # 12 فهرساً للأداء
node scripts/migrate-policy-settings.mjs       # إعدادات السياسات (نسبة التعريب/اليمنة)

# 4) توفير الحساب الوزاري الأعلى
node scripts/provision-admin.mjs

# 5) بناء الواجهة
npm run build
```

## 4. التشغيل الإنتاجي

```bash
NODE_ENV=production ENABLE_AUTH=true npm run start:prod
# أو مباشرة: node server/index.js
```

يتحقق الخادم عند الإقلاع من بوابات P0 ويرفض البدء عند مخالفتها:
- `JWT_SECRET` موجود وطوله ≥ 32 حرفاً (تحذير < 64).
- `ENABLE_AUTH=true` في الإنتاج.
- الاتصال بقاعدة البيانات سليم.

### نقاط التحقق الصحية

| المسار | المصادقة | الغرض |
|---|---|---|
| `/api/health` | عامة | نبض الخدمة |
| `/api/version` | مميزة | الإصدار والبيئة وزمن التشغيل |
| `/api/system/policy` | عامة | سياسات النظام (نسبة اليمنة المستهدفة) |
| `/api/system/branding` | عامة | هوية الوزارة |

### اختبار ما بعد النشر

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/system/policy
curl -I http://localhost:4000/          # يجب 200 مع CSP من index.html
curl -I http://localhost:4000/dashboard # SPA fallback = 200
```

## 5. الأمان

- **الترويسات**: nosniff، X-Frame-Options DENY، HSTS سنة كاملة، Referrer-Policy صارمة؛ CSP مفصّل للواجهة عبر meta في `index.html` (يولّدها Vite)، ولـ API فقط `default-src 'none'`.
- **حد الطلبات**: 300 طلب / 15 دقيقة / عنوان IP.
- **الأسرار**: لا تُقرأ إلا من متغيرات البيئة؛ محمّلة عبر `server/lib/loadEnv.js` قبل أي وحدة تعتمدها (حماية من hoisting في ESM). ملف `.env` مستثنى من git.
- **كلمات المرور**: bcrypt بتكلفة 12، وقفل الحساب بعد محاولات فاشلة متكررة.
- **التدقيق**: كل عملية كتابة حساسة مسجلة في `audit_logs` مع المعرف والطابع الزمني.

## 6. الأدوار (RBAC)

`ministry_admin` · `ministry_staff` · `union_admin` · `union_officer` · `enterprise_admin` · `enterprise_user`

المصفوفة الكاملة في `src/app/hooks/usePermissions.tsx` ومختبرة في `src/app/utils/rbac.test.ts`.

## 7. الصيانة

```bash
npm run health-check    # فحص صحة شامل
npm run backup          # نسخة احتياطية منطقية
npm run cleanup         # تنظيف السجلات المؤقتة
npm test                # 74 اختباراً
npm run type-check      # تدقيق أنواع صارم
```

## 8. استكشاف الأخطاء

| العَرَض | السبب المحتمل | الحل |
|---|---|---|
| رفض الإقلاع «JWT_SECRET» | سر مفقود/قصير | راجع `.env` وأعد التشغيل |
| تحذير «JWT_SECRET <32 chars» | لم يُحمَّل .env | تأكد من استيراد loadEnv أول السطر |
| EADDRINUSE :4000 | عملية قائمة | `Get-NetTCPConnection -LocalPort 4000` ثم أوقف PID |
| مهلات DB الأولى | بداية باردة لـ Neon | اعتيادية — تختفي بعد أول استعلام |

## 9. سجل الإصدارات

### 2.1.0 — الإصدار المؤسسي الأول
- تكوين سياسات النظام مركزياً (نسبة اليمنة) عبر `system_settings` + `/api/system/policy`.
- ترحيل فهارس الأداء (429 فهارس إجمالاً).
- تقوية أمنية: تنظيف حد الطلبات، سد تسريبات رسائل الأخطاء، `/api/version`، خدمة dist إنتاجياً مع SPA fallback متوافق Express 5.
- إصلاح جوهري: تحميل متغيرات البيئة قبل أي وحدة أمان (ESM hoisting).
- تصفير الشيفرة الميتة (~77 ملفاً) وبقايا supabase والأسماء الأجنبية والعطب النصي.

## 10. الصمود التشغيلي

### النسخ الاحتياطي
```powershell
node scripts/backup-db.mjs
```
- ينسخ **كل** جداول القاعدة (126 جدولاً) ملفات JSON في `backups/<timestamp>/` مع `_manifest.txt` (جرد الصفوف والأحجام).
- المجلد مستثنى من git — النسخ تحتوي بيانات تشغيلية حساسة (جلسات، محاولات دخول).
- الجدولة الأسبوعية عبر Task Scheduler:
  `powershell -NoProfile -Command "node G:\App25\unionministry1\scripts\backup-db.mjs *>> G:\App25\unionministry1\backups\_schedule.log"`
- جدول `professions` (~14 MB) هو الأثقل؛ البداية الباردة لـ Neon تضيف ~3 ثوانٍ.
- يُعاد التحقق من أرضية المؤشرات المعروضة (مثل «3,607+ مهنة») مقابل بيان جرد النسخة دورياً.

### نقطة فحص الصحة
- `GET /api/health` عام (خارج المصادقة): `{ ok, db, time }` — 503 عند سقوط القاعدة.
- أي مراقب خارجي (UptimeRobot أو ما يماثله) يُوجَّه إليها؛ لا حاجة لمصادقة.
- تُستخدم نفس النقطة في حلقات التحقق المحلية بعد كل نشر.

### ترويسات الأمان
- HSTS على API (`vercel.json`) وعلى صفحات الموقع العامة (`max-age=63072000; includeSubDomains; preload`).
- CSP صارم على HTML، nosniff وframe-deny على المسارين.
