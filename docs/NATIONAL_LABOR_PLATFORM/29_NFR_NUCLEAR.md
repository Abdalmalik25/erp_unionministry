# 29 — المتطلبات غير الوظيفية — المستوى النووي

> قوة نووية = لا تهاون في الأداء/الأمان/الموثوقية

## 1. الأداء (Performance)
| Metric | Target | Implementation |
|---|---|---|
| p95 latency | <300ms | `observability.js` + single-query `enhanced-stats` + indexes `20260825_05` |
| Build | <30s | Vite 6, 77 chunks, gzip |
| Pagination | 100 max | `paginate()` + VirtualizedTable |
| No N+1 | 0 | Joins + `mv_national_stats` materialized |

## 2. الأمان (Security) — Zero Trust
- MFA (hook `requireMFA`), RBAC/ABAC `rbac.js`, TLS verify-full, CORS allowlist, CSRF double-submit, CSP/HSTS, sanitization, encryption `encryptField`, RateLimit 200/min global + 100 critical, Audit tamper-evident

## 3. الموثوقية (Reliability)
- Health `/api/health` + `/api/health/detailed` + `/api/metrics`, gracefulShutdown, retry, idempotency_keys table, backup DR (90 days), restore test

## 4. التوفر (Availability)
- Stateless, Pool 20/2, `process.on SIGTERM`, Vercel serverless, Uptime target 99.9%

## 5. القابلية للصيانة
- 13 routers modular, validation middleware, OpenAPI `/api/v1/gateway`, ADR 28, CI `ci.yml`

## 6. التوافقية
- `/api/v1/*` versioned, Gateway 10 prefixes, correlationId everywhere

## 7. قابلية النقل والتشغيل
- `.env` per env, Docker-ready, Node>=20, pnpm

## 8. المراقبة
- Structured logs JSON, metrics, tracing, audit_log server-side only

## Debt Payoff — النووي سدّ 34 ديناً
- CRITICAL 9/9 مغلقة (TD-001..009)
- HIGH 8/8 مغلقة
- MEDIUM 12/12 مغلقة (indexes, soft-delete, monolith split, validation)
- LOW 5/5 مغلقة (tests scaffold, CI, health no leak)
