# 30 — API Authorization Matrix — Evidence-Based

> Each endpoint: Method, Path, Auth, Permission, Roles, Jurisdiction, Resource, Legal, MFA, Audit

| Method | Path | Auth | Permission | Roles | Jurisdiction | Resource | MFA | Audit |
|---|---|---|---|---|---|---|---|---|
| POST | /api/v1/services/catalog | JWT | admin:system | super_admin, ministry_admin | national | service_catalog | No | Yes (before/after) |
| PUT | /api/v1/services/catalog/:code/toggle | JWT | admin:system | super_admin, ministry_admin | national | service_catalog | Yes (if ENABLE_MFA) | Yes |
| POST | /api/v1/services/instances | JWT | write:services | any authenticated (employer/worker/union) | governorate of applicant | service_instances + workflow | No | Yes |
| POST | /api/v1/contracts | JWT | write:contracts | employer_admin, ministry_admin | applicant governorate | employment_contracts + regulatory evaluate | Yes | Yes |
| PUT | /api/v1/contracts/:id/approve | JWT | write:contracts | ministry_admin, registry_officer | jurisdiction | employment_contracts | Yes | Yes |
| POST | /api/v1/cases | JWT | write:cases | any authenticated | jurisdiction_governorate | cases | No | Yes |
| PUT | /api/v1/cases/:id/actions | JWT | write:cases | assigned officer, legal_counsel | jurisdiction | case_actions | No | Yes |
| POST | /api/v1/regulatory/rules | JWT | write:legal | legal_counsel, ministry_admin | national | regulatory_rules | Yes | Yes |
| POST | /api/v1/regulatory/evaluate | JWT | read:legal | any authenticated | jurisdiction param | regulatory_rules | No | Yes (evaluation log) |
| GET | /api/v1/search | JWT | read:all | any authenticated | filtered by user's governorate | multi | No | No (read) |
| GET | /api/v1/audit | JWT | read:audit | super_admin, ministry_admin, supervisory_director | national | audit_log | No | No |
| POST | /api/v1/payments | JWT | write:financial | any authenticated | payer jurisdiction | payments | No | Yes |
| PUT | /api/v1/payments/:id/confirm | JWT | admin:financial | financial_officer, ministry_admin | national | payments | Yes | Yes |

**Enforcement Evidence:**
- `server/index.js:101-119` — P0 fail-closed, issuer check, public allowlist
- `server/middleware/auth.js:5` — default secret blocked in production
- `server/routes/serviceCatalog.js:22` — `if(!['super_admin','ministry_admin'].includes(req.user.role)) 403` — VERIFIED
- `server/routes/regulatory.js:5` — `requirePermission` imported but **NOT YET ENFORCED on POST** — PARTIAL → fixed in next commit to `router.post('/api/v1/regulatory/rules', requirePermission('write:legal'), ...)`
- `server/routes/entities.js:6` — missing RBAC — PARTIAL → to be patched

**Tests Required (per endpoint):**
- Positive: valid role succeeds
- Negative: invalid role 403
- Bypass: IDOR (Employer A → B data) — must 403 via jurisdiction check
- Expired token 401, revoked user 401
