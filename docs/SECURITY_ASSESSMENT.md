# Security Assessment — UnionSphere Enterprise

**Assessment Date:** 2026-08-20
**Scope:** server/index.js, AuthContext.tsx, security.ts, .env, package.json, vite.config.ts

---

## 1. SQL Injection Risks

**Severity: MEDIUM** — All SQL queries use parameterized placeholders (`$1`, `$2`...). No direct string interpolation of user input into SQL. However, there are structural risks:

| Location | Issue | Severity |
|---|---|---|
| `server/index.js:1817-1824` | `PUT /api/training-records/:id` iterates over `req.body` keys directly to build SET clauses (`${k} = $${idx++}`). Any key name from user input is used as a column name without validation — **SQL column injection**. | **HIGH** |
| `server/index.js:2413-2423` | `POST /api/legal-references` uses `d._table` from user body as table name: `INSERT INTO ${table}`. An attacker can inject arbitrary table names. | **HIGH** |
| `server/index.js:2428-2439` | `PUT /api/legal-references/:id` uses `d._table` as table name in UPDATE. | **HIGH** |
| `server/index.js:2442-2449` | `DELETE /api/legal-references/:id` uses `req.query.table` as table name. | **HIGH** |
| `server/index.js:2451-2501` | `PUT /api/risk-assessments/:id` iterates body keys as column names without validation. | **MEDIUM** |
| `server/index.js:2536-2547` | `PUT /api/compliance-matrices/:id` same pattern — body keys as column names. | **MEDIUM** |
| `server/index.js:2587-2598` | `PUT /api/maturity-assessments/:id` same pattern. | **MEDIUM** |
| `server/index.js:2642-2653` | `PUT /api/commercial-establishments/:id` same pattern. | **MEDIUM** |

**Note:** The majority of endpoints (entities, members, activities, etc.) use whitelisted column maps (`colMap`) and parameterized queries — these are safe.

---

## 2. Authentication Gaps

| Issue | Detail | Severity |
|---|---|---|
| **No server-side authentication** | `server/index.js` has zero authentication middleware. Every endpoint is publicly accessible. No JWT, session, or API key verification. | **CRITICAL** |
| **Auth is client-side only** | `AuthContext.tsx` manages auth in React. The Express server never validates sessions. Any `curl` request to `/api/*` works without credentials. | **CRITICAL** |
| **Demo credentials hardcoded** | `AuthContext.tsx:54-73` — Demo passwords `Ministry@2026` and `Engineers@2026` are base64-encoded (trivially reversible) and embedded in source code. | **HIGH** |
| **Supabase is placeholder** | `.env:9-10` — `VITE_SUPABASE_URL=https://placeholder.supabase.co` and `VITE_SUPABASE_ANON_KEY=placeholder-key`. Auth via Supabase is non-functional. | **HIGH** |
| **No server-side session validation** | Sessions are stored only in `localStorage` (client-side). The server never reads or validates session tokens. | **CRITICAL** |

---

## 3. Authorization Gaps

| Issue | Detail | Severity |
|---|---|---|
| **No RBAC** | No role-based access control on any endpoint. A user with `role: 'ministry_admin'` vs `role: 'organization'` has identical API access. | **CRITICAL** |
| **No resource ownership checks** | `DELETE /api/entities/:id` — any user can delete any entity. No check that the authenticated user owns or manages that resource. | **CRITICAL** |
| **Admin-only operations unprotected** | Sensitive operations (delete entities, manage violations, view audit logs) require no elevated privileges server-side. | **CRITICAL** |
| **Organization-scoped data not enforced** | `organizationId` on the User type is never used in API queries. An organization user can read all ministry-level data. | **HIGH** |

---

## 4. Input Validation

| Issue | Detail | Severity |
|---|---|---|
| **No validation library** | No `joi`, `zod`, `express-validator`, or `yup` in dependencies. No schema validation on any endpoint. | **HIGH** |
| **No type checking on POST/PUT** | `req.body` values are passed directly to SQL. No validation of types (e.g., `amount` could be a string, `status` could be arbitrary). | **HIGH** |
| **No email format validation** | `email` fields accept any string. | **MEDIUM** |
| **No string length limits** | Text fields (`description`, `notes`, etc.) accept arbitrarily long strings. | **MEDIUM** |
| **No date format validation** | Date fields accept any value. | **MEDIUM** |
| **`metadata` fields are untyped** | JSON `metadata` columns accept arbitrary JSON with no schema enforcement. | **MEDIUM** |

---

## 5. Secret Management

| Issue | Detail | Severity |
|---|---|---|
| **Database credentials in .env** | `.env:30-31` — Neon PostgreSQL credentials (`npg_dIXtW6LQw8sH`) are committed to the repo. | **CRITICAL** |
| **.env in version control** | The `.env` file is tracked in git. Database passwords are exposed in repository history. | **CRITICAL** |
| **SSL rejectUnauthorized: false** | `server/index.js:33` — `ssl: { rejectUnauthorized: false }` disables certificate verification for the database connection. Vulnerable to MITM attacks. | **HIGH** |
| **No secrets rotation** | No mechanism for rotating database credentials or API keys. | **MEDIUM** |

---

## 6. XSS Risks

| Issue | Detail | Severity |
|---|---|---|
| **React auto-escapes by default** | Most user input rendered via JSX is automatically escaped. Low direct XSS risk in standard React rendering. | LOW |
| **`dangerouslySetInnerHTML` not found** | No instances of raw HTML injection in React components. | LOW |
| **Security headers present** | `X-XSS-Protection: 1; mode=block` and CSP are configured in both `server/index.js:47` and `vite.config.ts:27-41`. | GOOD |
| **`escapeHTML` utility exists** | `security.ts:350-353` provides HTML escaping but is never imported or used in any component. | MEDIUM |
| **Client-side sanitizer is cosmetic** | `sanitizeInput()` in `security.ts` strips XSS patterns, but since the server has no auth, attackers bypass the client entirely. | MEDIUM |

---

## 7. CSRF Protection

| Issue | Detail | Severity |
|---|---|---|
| **CSRF token utilities exist but unused** | `security.ts:329-344` defines `generateCSRFToken()` and `validateCSRFToken()` but they are never called anywhere in the codebase. | **HIGH** |
| **CORS allows all origins** | `server/index.js:41` — `cors({ origin: true, credentials: true })` reflects any origin with credentials. This effectively disables the Same-Origin Policy. | **CRITICAL** |
| **No CSRF middleware** | No `csurf`, `csrf-csrf`, or equivalent middleware on the Express server. | **HIGH** |

---

## 8. Rate Limiting

| Issue | Detail | Severity |
|---|---|---|
| **Client-side only** | Rate limiting exists in `security.ts` but is implemented in `localStorage`. An attacker bypasses it entirely with direct HTTP requests. | **HIGH** |
| **No server-side rate limiting** | No `express-rate-limit` or equivalent middleware on any API endpoint. All endpoints are vulnerable to brute force and DoS. | **HIGH** |
| **No per-IP throttling** | No IP-based request throttling on the Express server. | **MEDIUM** |

---

## 9. Error Handling

| Issue | Detail | Severity |
|---|---|---|
| **DB error messages leaked** | Multiple endpoints return `err.message` directly: `server/index.js:118`, `1606`, `1702`, `1725`, `1790`, `2274`, `2289`, `2303`, `2333`, `2349`, `2363`, `2371`, `2410`, `2425`, `2439`, `2448`, `2465`, `2479`, `2492`, `2500`, `2519`, `2533`, `2546`, `2554`, `2570`, `2584`, `2597`, `2605`, `2624`, `2639`, `2652`, `2660`. This can expose database schema, table names, constraint names, and query structure. | **HIGH** |
| **Generic errors on most endpoints** | Many endpoints use `'خطأ في قاعدة البيانات'` (generic Arabic error) — good practice. But the exceptions leak `err.message`. | PARTIAL |
| **Health endpoint leaks DB name** | `GET /health:67` returns `current_database()` — exposes database name. | **LOW** |

---

## 10. File Upload

| Issue | Detail | Severity |
|---|---|---|
| **No file upload endpoints** | No `multipart/form-data` handling, no `multer` or `busboy` dependency. No file upload functionality exists. | N/A |
| **`file_url` fields accept arbitrary URLs** | `documents`, `licenses`, `evaluation_certificates` have `file_url` fields that accept any string — could be used to point to malicious resources. | **LOW** |

---

## Summary of Additional Security Issues

| Issue | Detail | Severity |
|---|---|---|
| **No HTTPS enforcement** | Server listens on plain HTTP. HSTS header is defined in `security.middleware.ts` but that file is never imported or used by the Express server. | **HIGH** |
| **No request size limiting beyond JSON** | `express.json({ limit: '10mb' })` is set, but no limits on other body parsing. | LOW |
| **Open DELETE on hard-delete** | `DELETE FROM members WHERE id = $1` (line 342) performs a hard delete — no soft delete like entities. Data is permanently lost. | **MEDIUM** |
| **Audit log API is write-only from client** | `POST /api/audit-log` accepts any payload — no authentication. Anyone can forge audit entries. | **HIGH** |
| **No Content-Security-Policy on server responses** | CSP is injected only via Vite build transform. Express API responses have no CSP header. | **MEDIUM** |
| **`escapeHTML` map is wrong** | `security.ts:351` — `map` has `&` → `&` (self-assignment, should be `&amp;`). HTML entities are not properly escaped. | **MEDIUM** |

---

## Risk Matrix

| Category | Findings | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| SQL Injection | 8 | 0 | 3 | 5 | 0 |
| Authentication | 5 | 3 | 2 | 0 | 0 |
| Authorization | 4 | 3 | 1 | 0 | 0 |
| Input Validation | 6 | 0 | 2 | 4 | 0 |
| Secret Management | 4 | 2 | 1 | 1 | 0 |
| XSS | 5 | 0 | 0 | 3 | 2 |
| CSRF | 3 | 1 | 2 | 0 | 0 |
| Rate Limiting | 3 | 0 | 2 | 1 | 0 |
| Error Handling | 3 | 0 | 1 | 1 | 1 |
| File Upload | 2 | 0 | 0 | 0 | 1 |
| Other | 6 | 0 | 2 | 3 | 1 |
| **TOTAL** | **49** | **9** | **16** | **18** | **5** |

---

## Top 5 Critical Fixes Required

1. **Add server-side authentication middleware** — Validate JWT/session tokens on every `/api/*` endpoint.
2. **Remove `.env` from version control** — Add to `.gitignore`, rotate all credentials immediately.
3. **Whitelist table/column names** — Eliminate dynamic table/column injection in legal-references and training-records endpoints.
4. **Restrict CORS** — Replace `origin: true` with the `ALLOWED_ORIGINS` list from `security.middleware.ts`.
5. **Add server-side rate limiting** — Install `express-rate-limit` and apply to all endpoints, especially auth-adjacent ones.
