# Operations Runbook — UnionSphere Enterprise v2.4.0
> تشغيل إنتاجي — `vercel.json` + `server/index.js` + `scripts/*`

## 1. Deploy (Vercel)
```bash
pnpm install --frozen-lockfile
pnpm run vercel-build # check:server + vite build (16.69s)
vercel --prod # region fra1, headers CSP/HSTS, rewrites /api/* → /api/index.js
```
Env على Vercel: `DATABASE_URL`, `JWT_SECRET(>=32)`, `ENCRYPTION_KEY`, `CORS_ORIGIN=https://erp-unionministry.vercel.app`.

## 2. Health
```bash
curl https://erp-unionministry.vercel.app/api/health
curl https://erp-unionministry.vercel.app/api/health/detailed # DB + event loop + pool
curl https://erp-unionministry.vercel.app/api/metrics/performance
curl https://erp-unionministry.vercel.app/api/metrics/circuit-breakers
```

## 3. DB
```bash
npm run db:drift   # 0 drift expected
npm run db:apply -- supabase/migrations/xxx.sql
```

## 4. Rollback
- `swVersionStamp` يضمن كل نشر `buildId` فريد — `activate` يحذف كاشات قديمة.
- `pnpm run readiness` 9/9 يجب أن يمر قبل كل نشر.

## 5. On-call
- `errorTracker` + `circuitBreaker` + `performanceMonitor` — `threshold 5 failures → OPEN 30s → HALF_OPEN`.
- `audit_log` مقفل `hash chain` — أي تلاعب يكسر السلسلة.

## 6. Secrets
`.env` غير ملتزم (`.gitignore:5`), `.env.example` `VITE_APP_VERSION 2.4.0` متزامن مع `server/lib/version.js`.
