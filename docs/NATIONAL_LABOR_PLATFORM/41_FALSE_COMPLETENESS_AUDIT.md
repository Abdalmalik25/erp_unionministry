# 41 — False Completeness Audit — Evidence-Based (PROVE, DON'T CLAIM)

> Generated: 2026-08-23 | Scan Phase 0 | Verdict: **PARTIAL — NOT PRODUCTION READY**

## Method
Every claimed capability checked against: `Source Code + DB + API Runtime + Auth + Tests`

| Verdict | Meaning |
|---|---|
| VERIFIED | Implemented + Enforced + Tested |
| PARTIAL | Implemented but not enforced/tested |
| FALSE COMPLETENESS | UI exists, backend missing/auth missing |
| MISSING | Not implemented |

## 1. Security — CLAIMED "10 layers Zero Trust"

| Capability | Claimed | Evidence | Enforcement | Verdict |
|---|---|---|---|---|
| JWT | `server/middleware/auth.js:20 signToken` | HMAC HS256, 7d exp, `SECRET= union-sphere-sector-rbac-secret` default | **FAIL**: default secret allowed, no issuer/audience, no rotation, no revocation | **PARTIAL** |
| ENABLE_AUTH | `server/index.js:101` | `AUTH_ENABLED = ENABLE_AUTH==='true'` — if false, all `/api/*` open | **FAIL OPEN** — Production can run unauthenticated | **FALSE COMPLETENESS** |
| RBAC | `server/middleware/rbac.js:43 requirePermission` | Only 1 route uses it (`regulatory.js:5` import unused) | 0 of 280+ endpoints enforced | **FALSE COMPLETENESS** |
| ABAC Jurisdiction | `rbac.js:57 requireJurisdiction` | Defined, never `app.use` on sensitive routes | Not enforced | **FALSE COMPLETENESS** |
| CSRF | `security.js:6` | Double-submit defined, `ENABLE_CSRF !== 'true'` → bypass | Not enforced | **PARTIAL** |
| RateLimit | `server/index.js:85` | Global 200/min Map — no per-user, no Redis, no burst | Partial | **PARTIAL** |
| Encryption | `security.js:22 encryptField AES-GCM` | Helper exists, never called on `persons.national_id` | Not enforced | **FALSE COMPLETENESS** |
| Audit | `server/index.js:144 auditLog` | Server-side append, but `audit_log` table allows UPDATE/DELETE, no hash chain | Tamper possible | **PARTIAL** |
| MFA | `security.js:38 requireMFA` | Hook exists, `ENABLE_MFA !== 'true'` → bypass | Not enforced | **PARTIAL** |

**P0 Gate Verdict: FAILED — No Critical Security Vulnerability? NO. Must fix before P1.**

## 2. Service Catalog — CLAIMED "96 Digital Government Services"

| Check | Evidence | Verdict |
|---|---|---|
| DB 96 rows | `SELECT count=96` — VERIFIED | VERIFIED |
| Full definition (eligibility, docs, legal, fees, SLA, workflow, approvals, certificate, appeal) | Only `service_code,title,category,stakeholder,sla_days,workflow_key,requires_documents` — missing `eligibility_rule_id, fees JSON empty, appeal, cancellation, version, EffectiveFrom/To, ApprovedBy` | **PARTIAL — Catalog Entry, not Digital Service** |
| API `POST /instances` creates workflow | Yes, `serviceCatalog.js:48` creates `workflow_instances` if `workflow_key` exists — but 62 `SVC-GEN-*` have no `workflow_key` | **PARTIAL** |
| Frontend consistency | `ServiceMarketplace.tsx:33` fallback to hardcoded CATALOG if DB empty | **FALSE COMPLETENESS** (DB/API/Frontend not in sync) |

## 3. Regulatory Engine

| Check | Evidence | Verdict |
|---|---|---|
| 3 rules `draft` | `SELECT status=draft 3` — no `active` → `POST /evaluate` returns 0 applicable rules | **PARTIAL — Not enforced** |
| Legal Source → Rule → Version | `legal_sources 8`, `legal_articles 8` seeded, but `article.content_ar` empty for most | **PARTIAL** |
| Time-Machine `evaluate(date)` | `server/routes/regulatory.js:85` checks `effective_from <= date` — VERIFIED, but no test for overlapping | **PARTIAL** |
| Conflict detection | No code for `REGULATORY_CONFLICT` | **MISSING** |
| Explainability | Returns `rule_code, legal_basis, reason` — VERIFIED | **VERIFIED** |
| Tests | 0 regulatory tests | **MISSING** |

## 4. Workflow

| Check | Evidence | Verdict |
|---|---|---|
| Definitions 3 | `workflow_definitions 3` — VERIFIED | VERIFIED |
| Instances | `select count from workflow_instances` = ? (need check) — likely 0 | **PARTIAL** |
| Guards (role, jurisdiction, legal, SoD) | Only `transition.role` checked `workflow.js:28` | **PARTIAL** |
| Immutability (versioned) | `workflow_version` stored, but definition can be `UPDATE` without version bump | **PARTIAL** |
| SoD | No `requester != approver` check | **MISSING** |

## 5. Canonical Data

| Check | Evidence | Verdict |
|---|---|---|
| ONE PERSON | `persons` + `legal_entities` exist — but `members 45` still holds `national_id` duplicate risk — no `identity_resolution` table | **PARTIAL** |
| ONE ESTABLISHMENT | `legal_entities` + `commercial_establishments 12` duplicate — two establishment registries | **FALSE COMPLETENESS — Two sources of truth** |
| Master Data governance | `national_occupations` exists but `professions 3607` still used in UI | **PARTIAL — Two sources** |

## 6. Dead Code Audit

- Unused: `regulatory.js requirePermission` imported not used — VERIFIED
- Unused tables: `legal_embeddings` empty, `notification_events` empty
- Hardcoded: `CATALOG` fallback in `ServiceMarketplace.tsx` — VERIFIED
- Mock: `ExcellenceDashboard` forecast `avg*1.08` — fake, not from model

## Overall

**FALSE COMPLETENESS ITEMS: 11 | PARTIAL: 14 | VERIFIED: 9 | MISSING: 8**

**Recommendation: DO NOT DECLARE PRODUCTION READY. Fix P0 first.**
