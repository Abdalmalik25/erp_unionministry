# Troubleshooting — UnionSphere Enterprise v2.4.0
> تشخيص سريع مبني على سلوك فعلي للكود والخادم — لا تخمين

## 1) فشل تسجيل الدخول
| العرض | السبب المحتمل | الإجراء |
|---|---|---|
| `401 جلسة غير صالحة` | `auth_token` منتهي أو `JWT_SECRET` غير متطابق بين `.env` والخادم | `localStorage.removeItem('auth_token')` + إعادة دخول؛ تحقق `JWT_SECRET>=32` في `scripts/production-readiness.mjs:7` |
| `429 تم تعليق المحاولات` | `server/middleware/roleRateLimit.js:11` أو `security.ts:384 recordFailedAttempt` قفل 15د | انتظر العدّاد في `Login.tsx:lockoutUntil` أو `clearRateLimit('login_'+email)` محلياً للاختبار |
| `403 خارج نطاق اختصاصك` | `rbac.js:81 requireJurisdiction` — محافظة/مديرية لا تطابق `user.governorate` | أضف `?governorate=` الصحيح أو استخدم حساب `super_admin` |

## 2) شاشة بيضاء بعد النشر
- السبب: `dist/sw.js` قديم يخدم حزمة قديمة.
- الحل: `vite.config.ts:105 swVersionStamp` يولد `buildId` فريد كل نشر + `activate` يحذف كاشات قديمة. للمستخدم: `Ctrl+Shift+R` أو `Clear Site Data`.

## 3) تحذيرات ESLint كثيرة (719→ الآن 643)
- `any 560` — دين P2 في `services/*` و `enterprise/*`، يتطلب هجرة `zod` major؛ لا يعطل البناء (`tsc 0`).
- `unused 77` — استيرادات ميتة، تُزال تدريجياً عبر `fix-unused.mjs` بلا كسر `tsc`.

## 4) فشل `tsc --noEmit` بعد تعديل `any`
- أي `meta: any → PaginationMeta` كسر `ContractManager.tsx:88` (`unknown→number`) — تراجع فوري وإبقاء `any` حيث `// disable` مبرر.

## 5) اختبارات `vitest` تفشل لمسار
- `tests/routes-smoke.test.ts` يفحص `routes.tsx` نصياً — حدث `path: "indicators"` لا `"/ministry/indicators"` — تم التصحيح لفحص `segment`.

## 6) أداء أول زيارة بطيء
- الحزم الثقيلة `xlsx 427kB/jspdf 417kB/recharts 18kB` معزولة `vendor-pdf-defer` + `modulePreload` يستثنيها (`vite.config.ts:65 HEAVY_DEFERRED_CHUNKS`) — لا تُحمّل إلا عند أول تصدير/رسم.

## 7) قاعدة البيانات — `db:drift` يبلغ انحرافاً
- نفذ `npm run db:apply -- supabase/migrations/xxx.sql` ثم `npm run db:drift` — يتحقق `supabase/migrations/20260826_01_missing_schema_tables.sql` idempotent.

## 8) CORS مرفوض في الإنتاج
- `vercel.json:61` كان `*` — تم تضييقه إلى `https://erp-unionministry.vercel.app` + `Vary: Origin` — حدث `vercel.json` وأعد النشر.
