# System Architecture — UnionSphere Enterprise v2.4.0
> **الجمهورية اليمنية — وزارة الشؤون الاجتماعية والعمل**
> **Generated:** 2026-09-02 — factual snapshot after Waves 1-11

## 1. Topology (verified)
```
Browser (React 18.3 SPA, Vite 6.3, Tailwind 4, Radix) 
  → AuthContext:restoreSession → GET /api/auth/me (JWT)
  → ProtectedRoute (requireMinistry/requiredRoles/requiredPermissions) → RootLayoutNew
  → Page (UniversalDataView/SmartToolbar) → services/api.ts (Idempotency-Key, X-Correlation-Id, ETag cache)
  → Express 5.2 (server/index.js:140 middleware chain: securityHeaders → threatDetection → sanitize → csrf → requireMFA → roleRateLimit → performanceMonitor)
  → rbac.js:68 requirePermission (30 perms) + requireJurisdiction (governorate)
  → pg Pool → Neon PostgreSQL 17 (61 tables)
```

## 2. Build & Deploy
- **Vite:** `vite.config.ts:65` heavy chunks deferred (`vendor-pdf-defer 417k, xlsx 427k`), `modulePreload` excludes them, `swVersionStamp` per buildId.
- **Vercel:** `vercel.json:3` rewrites `/api/* → /api/index.js`, headers CSP/HSTS/Cache, region `fra1`, `vercel-build: pnpm run vercel-build (check:server + vite build)`.
- **Docker:** `Dockerfile` + `docker-compose.yml` + `nginx/` + `.env.example` (DATABASE_URL, JWT_SECRET>=32, ENCRYPTION_KEY).

## 3. Key Modules (file:line)
- **Routing:** `src/app/routes.tsx:124` 4 portals (`/ministry` 45 children, `/organization`, `/employer`, `/worker`).
- **Auth:** `src/app/contexts/AuthContext.tsx:66` + `src/app/hooks/usePermissions.tsx:94` + `src/app/roles.ts:4` single source.
- **Data:** `src/app/types/api.ts:1` PaginationMeta canonical, `src/app/services/*` 10 services.
- **Public:** `src/app/pages/public/PublicHome.tsx:15` + `PublicLayout.tsx:333` (Skip/A11y/Offline).
- **Failure:** `src/app/components/system/ErrorBoundary.tsx:205` canonical, `globalErrorGuards.ts:65`, `circuitBreaker.ts:147`.

## 4. Verified Metrics
- `tsc 0`, `eslint 643 warnings (0 errors)`, `vitest 25 files 220 tests`, `vite build 16.69s (316k+715k)`, `readiness 9/9`
