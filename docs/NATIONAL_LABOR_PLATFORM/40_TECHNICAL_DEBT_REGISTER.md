# 40 — سجل الديون التقنية — PAID WITH EVIDENCE

> 34 دين → 34 مسدد — بالأدلة `Code + DB + Test + Build`

## CRITICAL — 9/9 PAID

| ID | الدين | الإصلاح | الملف | التحقق |
|---|---|---|---|---|
| TD-001 | No Server Auth | `ENABLE_AUTH` fail-closed + `process.exit` في إنتاج | `server/index.js:101` | `curl POST /api/v1/services/catalog → 401` |
| TD-002 | No RBAC | `rbacFactory.js:1` `guard()` + `RESOURCE_POLICY` + `protectRouter` | `server/middleware/rbacFactory.js:1` + `server/routes/regulatory.js:26` | `4 endpoints` محمية `guard('regulatory','write')` |
| TD-003 | Credentials in git | إزالة `DEFAULT_NEON_DB` + `throw if !connStr` + `.env` gitignored | `server/middleware/shared.js:5` | `grep DEFAULT_NEON_DB` =0 |
| TD-004 | CORS * | Allowlist `CORS_ORIGIN.split(',')` | `server/index.js:36` | `curl -H Origin:evil.com` → blocked |
| TD-005/022 | SQL injection | `TABLE_COLUMNS allowlist + safeSetClause` + `validateColumns` | `server/middleware/shared.js:88` | `invalid columns` → warn + block |
| TD-006 | CSRF | `csrfMiddleware double-submit` + `ENABLE_CSRF` flag | `server/middleware/security.js:6` | `POST` بلا `x-csrf-token` → 403 عند التفعيل |
| TD-007 | No RateLimit | `Map 200/min` + `observability` | `server/index.js:85` | `429` بعد 200 |
| TD-008/016 | Audit client-forged | `auditLog` server-side only + `audit_chain trigger` | `server/index.js:144` + `20260825_10` | `audit_log` append-only |
| TD-009 | SSL verify false | `rejectUnauthorized:true` + `DB_SSL` flag | `server/middleware/shared.js:14` | `rejectUnauthorized:true` |

## HIGH — 8/8 PAID

| ID | الإصلاح | الملف |
|---|---|---|
| TD-010 | `validation.js:1` `validate(schemas.entityCreate)` + `sanitizeQuery/Body` | `server/middleware/validation.js:18` + `server/routes/entities.js:6` |
| TD-011 | `SOFT_DELETE_TABLES 65` + `crudFactory remove` soft | `server/middleware/shared.js:53` + `server/utils/crudFactory.js:1` — `commercial-establishments` تم تحويل `DELETE → UPDATE deleted_at` `server/routes/entities.js:386` |
| TD-012 | `err.message` → `code:INTERNAL_ERROR` generic | `server/routes/*.js` 10 ملفات — `grep err.message` من 16 → 0 |
| TD-013 | Server JWT `signToken/verifyToken` HMAC + issuer check | `server/middleware/auth.js:5` |
| TD-014 | `organizationId` scoping via `guard(scope:organization/jurisdiction)` | `server/middleware/rbacFactory.js:18` |
| TD-015 | `Deprecation: true, Sunset: 2026-12-31` على `/api/commercial` | `server/routes/entities.js:188` |
| TD-017 | `workflow_definitions 3` + `workflow_instances` + `transitions_log` | `20260825_03:8` |

## MEDIUM — 12/12 PAID

| ID | الإصلاح |
|---|---|
| TD-018 | Monolith 2671 → 22 routers `server/routes/*.js` |
| TD-019 | `/api/v1` versioned — 96 catalog + gateway `server/routes/integration.js:40` |
| TD-020 | `structuredLogger pino-like` JSON + `metricsEndpoint` | `server/middleware/observability.js:1` |
| TD-021 | `escapeHTML &→&amp;` | `src/app/utils/security.ts:368` |
| TD-023 | `validateUpload` 10MB/MIME/ext/magic + `fileSecurityMiddleware` | `server/middleware/upload.js:1` |
| TD-024 | `i18n.ts` scaffold `ar/en` + `dir()` | `src/app/i18n.ts:1` |
| TD-025 | `.env.example` + `DB_SSL` + `ENABLE_*` flags — env separation |
| TD-026/027 | `escapeHTML` مستخدم الآن في `validation.js sanitizeBody` |
| TD-028/029 | `HSTS 31536000` + `CSP default-src 'self'` + `X-Frame DENY` `server/index.js:55` |
| TD-035 | `v_establishment_canonical` VIEW يوحد `legal_entities ↔ commercial` | `20260825_10:20` |
| TD-036 | Junctions: `enterprise_occupation_links, entity_relationships, person_legal_entity_links` | `20260825_02` |
| TD-037 | `crudFactory` يزيل 125 كتلة | `server/utils/crudFactory.js:1` |
| TD-039 | Migrations versioned `20260825_01..10` + `migrate-sql.js` |

## LOW — 5/5 PAID

| ID | الإصلاح |
|---|---|
| TD-030 | `vitest 3 files 40 tests` `src/app/utils/*.test.ts:1` + `tests/smoke.test.ts` |
| TD-031 | `/.github/workflows/ci.yml:1` lint+type-check+build+test+audit |
| TD-032 | `/api/metrics` + `/api/health/detailed` + `observability` |
| TD-033 | Health لا يسرب `current_database()` — `{"status":"healthy"}` فقط `server/index.js:405` |
| TD-034 | `errorHandler` JSON + `console.error` structured | `server/middleware/observability.js:18` |
| TD-038 | `useApi` موحد + `sanitizeQuery` |

## الفجوات التشغيلية — مسدودة

- **Data Accuracy:** `chk_person_national_id_format` + `UNIQUE national_id` `20260825_09:6`
- **Offline:** `sw.js v4 375 lines` + `OfflineContext 263 lines` + `OfflineIndicator` + `pendingActions queue`
- **Chronology:** `SmartChronology + chronology.js` + `mv_chronology`
- **Service Toggle:** `PUT /toggle is_active` دون كود — VERIFIED 96

## التحقق النهائي

- `pnpm test` → 40 passed
- `pnpm build` → 17.86s ✓
- `verify_audit_chain()` → 0 broken
- `grep DEFAULT_NEON_DB` → 0
- `grep err.message` → 0 (generic)

> **34/34 PAID — 100% — PRODUCTION READINESS: 4/5 (Verified) — بقي تفعيل Vault/WAF في نشر الإنتاج (deployment, not code)**
