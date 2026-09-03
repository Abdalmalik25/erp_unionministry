# Testing Strategy — UnionSphere Enterprise v2.4.0
> استراتيجية اختبار مبنية على ما هو منفذ فعلاً — 25 ملف، 220 اختبار، 9/9 readiness

## 1) الهرم الحالي
| المستوى | الأداة | الحجم | الحالة |
|---|---|---|---|
| **Static** | `tsc --noEmit`, `eslint`, `scripts/check-server-syntax.mjs` (71 file) | كل دفع | ✅ 0 errors, 643 warnings |
| **Unit** | `vitest` — `src/app/utils/*.test.ts`, `src/app/types/api.test.ts`, `content/institutional.test.ts` | 220 اختبار | ✅ 25 files PASS |
| **Integration** | `server/middleware/auth` JWT, `security.test` RateLimit/Audit, `api.test` | حدود API/DB | ✅ |
| **E2E smoke** | `tests/routes-smoke.test.ts` (14 اختبار للمسارات الحرجة) + `tests/smoke.test.ts` + `tests/performance.test.ts` | مسارات + أداء | ✅ (25 files) |
| **E2E full** | Playwright/Cypress للسيناريوهات الحرجة (Login→CRUD→Permissions→Export) | غير موجود | ⛔ VERIFICATION BLOCKED — مسجل كـ P2 |

## 2) تشغيل محلي
```bash
pnpm run type-check        # tsc --noEmit (69s)
npx eslint src --ext .ts,.tsx
npx vitest run             # 220 PASS (2.4s)
npx vite build             # 23.60s
node scripts/production-readiness.mjs  # 9/9 PASS
```

## 3) التغطية والحدود
- `vitest.config.ts:12` `include: ['src/**/*.test.ts','tests/**/*.test.ts']` — يشمل `tests/` بعد التحديث.
- `coverage thresholds: 80/70/80/80` — غير مفعل في CI بعد، يتطلب `pnpm test:coverage`.

## 4) اختبار `PaginationMeta` الجديد
- `src/app/types/api.test.ts:1` — يتحقق أن `PaginationMeta` تحل محل `any` بلا كسر (`total`, `totalPages`, `hasMore`, index signature).

## 5) فجوات مسجلة
- لا E2E متكامل لرحلات `Login→Session→CRUD→Search→Pagination→Permissions→Export` — يجب إضافته قبل التوقيع النهائي.
- لا اختبار هجرة `supabase/migrations` — يغطى عبر `db:drift` يدوياً.

## 6) سياسة Zero Regression
قبل أي تعديل: `typecheck → lint → unit → build` — أي كسر `any→unknown` يُراجع فوراً (كما حدث `PrintExportManager:247` و `IntegrationAware:56` وتم التراجع).
