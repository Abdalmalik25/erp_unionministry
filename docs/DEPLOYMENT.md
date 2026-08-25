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

### النسخ الاحتياطي المشفر (AES-256-GCM)
```powershell
node scripts/backup-db.mjs      # نسخ مشفرة
node scripts/restore-db.mjs     # فحص جاف — يتحقق ويقارن بلا كتابة
node scripts/restore-db.mjs --confirm   # استعادة فعلية داخل معاملة واحدة
```
- **التشفير**: AES-256-GCM (مشفّر + مُصادق ضد العبث) بعد ضغط gzip — النسخة الكاملة 126 جدولاً ≈ 0.85 MB.
- **المفتاح**: `BACKUP_KEY` في `.env` (سداسي 256-بت، يتولد تلقائياً أول مرة).
  ⚠️ انسخه إلى مخزن آمن منفصل — **فقدانه يعني فقدان كل النسخ**.
- **السلامة**: بصمة SHA-256 جانبية + مصادقة GCM — أي تلف أو عبث يُكتشف قبل فك التشفير ولا تُلمس القاعدة.
- **لا تسريب**: حتى أسماء الجداول والأعداد داخل المشفّر؛ على القرص ملف `.enc` وبصمته فقط.
- **الاحتفاظ**: آخر 8 نسخ تلقائياً، الأقدم يحذف.
- **الاستعادة**: افتراضياً فحص جاف يقارن 126 جدولاً بالحالة الحية؛ `--confirm` ينفّذ داخل معاملة واحدة (نجاح كامل أو تراجع كامل).
- المجلد مستثنى من git — والمهمة المجدولة `UnionMinistry-DBBackup` (أحد 6:00 ص) تنفذ النسخ المشفرة نفسها.

### نقطة فحص الصحة
- `GET /api/health` عام (خارج المصادقة) — المعالج المرجعي في `server/routes/system.js`.
- تعيد حمولة تشخيصية داخل المغلف القياسي: حالة القاعدة وزمن استجابتها ونسخة PostgreSQL والذاكرة ووضع الأمان، مع `service` بالاسم الرسمي العربي.
- أي مراقب خارجي (UptimeRobot أو ما يماثله) يُوجَّه إليها؛ لا حاجة لمصادقة.
- تُستخدم نفس النقطة في حلقات التحقق المحلية بعد كل نشر (`verify-resilience.mjs`).

### ترويسات الأمان
- HSTS على API (`vercel.json`) وعلى صفحات الموقع العامة (`max-age=63072000; includeSubDomains; preload`).
- CSP صارم على HTML، nosniff وframe-deny على المسارين.

### الدومين المختصر nlsmp.gov.ye (قيد التسجيل — لا يُعرض في الواجهات قبل عمله)
1. تسجيل النطاق لدى مزود .ye (TeleYemen / Y.NET) باسم الوزارة الرسمي.
2. في لوحة DNS: CNAME للسجل الجذري `nlsmp.gov.ye` → `cname.vercel-dns.com`.
3. إضافة الدومين في إعدادات مشروع Vercel → Domains والتحقق.
4. **القطع الآلي**: `node scripts/cutover-domain.mjs` — يرفض العمل ما لم يستجب
   النطاق في DNS فعلياً، ثم يحوّل canonical وog:url وsitemap وrobots دفعة واحدة.
5. حتى ذلك الحين يبقى `BRAND.domainShort` مرجعاً داخلياً فقط ولا يُطبع في أي واجهة.

### الأتمتة القائمة
- **نسخ احتياطي أسبوعي**: مهمة Windows مجدولة `UnionMinistry-DBBackup` — كل أحد 6:00 ص،
  تنفذ `scripts/backup-db.mjs` وتسجل في `backups/_schedule.log`. فحص الحالة:
  `Get-ScheduledTaskInfo UnionMinistry-DBBackup`
- تشغيل يدوي فوري: `Start-ScheduledTask UnionMinistry-DBBackup`
