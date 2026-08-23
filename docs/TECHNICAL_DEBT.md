# Technical Debt Catalog — UnionSphere

> Comprehensive catalog of all technical debt discovered during Phase 0.
> Each item includes: severity, location, impact, and remediation strategy.

---

## 1. Critical Security Debt (9 items)

### TD-001: No Server-Side Authentication
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js` — entire file |
| **Evidence** | Zero authentication middleware. Every `/api/*` endpoint is publicly accessible. |
| **Impact** | Any person or bot can read, create, modify, or delete any data in the system. |
| **Remediation** | Add JWT authentication middleware. Validate tokens on every request. |
| **Effort** | 1 week |
| **Dependencies** | None |

### TD-002: No Role-Based Access Control
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js` — all endpoints |
| **Evidence** | No RBAC middleware. `role` field on User type is never checked server-side. |
| **Impact** | A regular user can delete entities, view audit logs, manage users — same access as admin. |
| **Remediation** | Create `roles` and `permissions` tables. Add RBAC middleware. |
| **Effort** | 1 week |
| **Dependencies** | TD-001 |

### TD-003: Credentials Committed to Git
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `.env:30-31` (tracked in git) |
| **Evidence** | Neon PostgreSQL credentials (`npg_dIXtW6LQw8sH`) are in version control. |
| **Impact** | Anyone with repo access has database credentials. History is permanently exposed. |
| **Remediation** | Remove `.env` from git. Rotate all credentials. Use environment variables in deployment. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-004: CORS Allows All Origins
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js:41` |
| **Evidence** | `cors({ origin: true, credentials: true })` reflects any origin with credentials. |
| **Impact** | Any website can make authenticated requests to the API on behalf of a logged-in user. |
| **Remediation** | Replace with explicit allowlist: `cors({ origin: ['https://yourdomain.com'], credentials: true })`. |
| **Effort** | 1 hour |
| **Dependencies** | None |

### TD-005: SQL Column/Table Injection
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js:1817-1824`, `2413-2449`, `2451-2653` |
| **Evidence** | 8 endpoints use user-supplied body keys as SQL column names or table names without validation. |
| **Impact** | Attacker can inject arbitrary SQL column/table names, potentially extracting or modifying data. |
| **Remediation** | Add column name validation. Use whitelists for all dynamic queries. |
| **Effort** | 2 days |
| **Dependencies** | None |

### TD-006: No CSRF Protection
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js` — no CSRF middleware |
| **Evidence** | `security.ts:329-344` defines CSRF utilities but they are never used. |
| **Impact** | Cross-site request forgery attacks can modify data using a user's browser. |
| **Remediation** | Add `csurf` or equivalent middleware. Implement CSRF token validation. |
| **Effort** | 1 day |
| **Dependencies** | TD-001 |

### TD-007: No Server-Side Rate Limiting
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js` — no rate limit middleware |
| **Evidence** | Rate limiting exists only in `security.ts` (client-side, localStorage). |
| **Impact** | Brute force attacks, DoS, API abuse — no protection. |
| **Remediation** | Add `express-rate-limit` middleware. Configure per-endpoint limits. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-008: Audit Log Client-Forged
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js:2236` — `POST /api/audit-log` |
| **Evidence** | Endpoint accepts any payload without authentication. Client sends audit entries. |
| **Impact** | Anyone can forge audit trail. Server records what client sends — no independent verification. |
| **Remediation** | Remove client-side audit POST. Implement server-side audit middleware on all writes. |
| **Effort** | 2 days |
| **Dependencies** | TD-001 |

### TD-009: SSL Certificate Verification Disabled
| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Location** | `server/index.js:33` |
| **Evidence** | `ssl: { rejectUnauthorized: false }` disables certificate verification for DB connection. |
| **Impact** | Man-in-the-middle attacks on database connection. Attacker can intercept all data. |
| **Remediation** | Set `rejectUnauthorized: true`. Configure proper CA certificate. |
| **Effort** | 1 hour |
| **Dependencies** | None |

---

## 2. High Severity Debt (8 items)

### TD-010: No Input Validation
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | All POST/PUT endpoints in `server/index.js` |
| **Evidence** | No `joi`, `zod`, `express-validator`, or `yup` in dependencies. No schema validation. |
| **Impact** | Invalid data types, missing required fields, excessively long strings — all accepted. |
| **Remediation** | Install Zod. Create validation schemas for all endpoints. Add middleware. |
| **Effort** | 1 week |
| **Dependencies** | None |

### TD-011: Hard Deletes Without Soft Delete
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | `server/index.js:342` (members), `:438` (activities), `:527` (elections), `:616` (documents), `:707` (violations), `:799` (professions), `:873` (services), `:960` (service-requests), `:1061` (worker-profiles), `:1183` (compliance-alerts), `:1278` (fee-payments), `:1385` (dispatches), `:1489` (reduction-requests), `:1577` (licenses), `:1673` (inspections), `:1761` (evaluation-certificates), `:1832` (training-records), `:1926` (profiles), `:2007` (notifications), `:2095` (board-members), `:2181` (commercial v1), `:2306` (labor-disputes), `:2366` (expatriate-licenses), `:2442` (legal-references), `:2495` (risk-assessments), `:2549` (compliance-matrices), `:2600` (maturity-assessments), `:2655` (commercial v2) |
| **Evidence** | `DELETE FROM table WHERE id = $1` — permanent deletion. Only `entities` uses soft delete. |
| **Impact** | Data permanently lost. No recovery possible. No audit trail of deletions. |
| **Remediation** | Add `deleted_at` and `deleted_by` columns to all tables. Update all DELETE queries to SET deleted_at. |
| **Effort** | 2 days |
| **Dependencies** | None |

### TD-012: Database Errors Leaked to Clients
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | 33+ endpoints in `server/index.js` |
| **Evidence** | `catch(err) { res.status(500).json({ error: err.message }) }` — exposes internal error details. |
| **Impact** | Database schema, table names, constraint names, and query structure exposed to attackers. |
| **Remediation** | Replace `err.message` with generic error messages. Log detailed errors server-side only. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-013: Client-Side Only Authentication
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | `src/app/contexts/AuthContext.tsx:54-73` |
| **Evidence** | Demo credentials base64-encoded (trivially reversible). Supabase is placeholder. Sessions in localStorage. |
| **Impact** | Auth is cosmetic. Any curl request bypasses authentication entirely. |
| **Remediation** | Implement server-side JWT auth. Move to bcrypt password hashing. |
| **Effort** | 1 week |
| **Dependencies** | TD-001 |

### TD-014: Organization Data Not Scoped
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | All API queries in `server/index.js` |
| **Evidence** | `organizationId` on User type is never used in API queries. All data is globally visible. |
| **Impact** | Organization users can read, modify, or delete ministry-level data and other organizations' data. |
| **Remediation** | Add `WHERE organization_id = $1` to all queries based on authenticated user's organization. |
| **Effort** | 2 days |
| **Dependencies** | TD-001, TD-002 |

### TD-015: Duplicate Commercial Endpoints
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | `server/index.js:2106-2190` (v1) and `2608-2665` (v2) |
| **Evidence** | Two sets of CRUD endpoints for commercial establishments: `/api/commercial` and `/api/commercial-establishments`. |
| **Impact** | Confusion, inconsistent data, maintenance burden. |
| **Remediation** | Deprecate v1 endpoints. Migrate frontend to v2. Remove v1 after migration. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-016: No Server-Side Audit Trail
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | `server/index.js` — no audit middleware |
| **Evidence** | Audit entries sent by client via `POST /api/audit-log`. Server doesn't independently record changes. |
| **Impact** | No reliable audit trail. Compliance requirements not met. |
| **Remediation** | Add server-side audit middleware that records all write operations with actor, timestamp, old/new values. |
| **Effort** | 2 days |
| **Dependencies** | TD-001 |

### TD-017: No Workflow Engine
| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Location** | Entire system |
| **Evidence** | Every entity has a `status` field but no state machine. State transitions are manual API calls. |
| **Impact** | No automated lifecycle management. No approval workflows. No escalation. No audit of state changes. |
| **Remediation** | Build workflow engine with state machine, transition rules, and approval flows. |
| **Effort** | 2 weeks |
| **Dependencies** | TD-001, TD-002 |

---

## 3. Medium Severity Debt (12 items)

### TD-018: Monolith Server (2671 lines)
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `server/index.js` — single file |
| **Evidence** | Entire backend in one file. 133 endpoints, all middleware, all business logic. |
| **Impact** | Unmaintainable. Cannot work on different domains simultaneously. Merge conflicts. |
| **Remediation** | Split into domain-based modules: `server/routes/entities.js`, `server/services/entities.js`, etc. |
| **Effort** | 1 week |
| **Dependencies** | None |

### TD-019: No API Versioning
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | All endpoints — `/api/*` |
| **Evidence** | No version prefix. Breaking changes affect all clients. |
| **Impact** | Cannot make backward-compatible changes. All clients must update simultaneously. |
| **Remediation** | Add `/api/v1/` prefix to all new endpoints. Keep old endpoints during transition. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-020: No Structured Logging
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `server/index.js` — `console.log`/`console.error` only |
| **Evidence** | No logging framework (winston, pino). No log levels. No structured output. |
| **Impact** | Cannot filter logs. Cannot ship to log aggregation. Cannot debug production issues. |
| **Remediation** | Install pino. Add request logging middleware. Add error logging. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-021: `escapeHTML` Bug
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `security.ts:351` |
| **Evidence** | `map['&'] = '&'` — self-assignment. Should be `map['&'] = '&amp;'`. |
| **Impact** | HTML entities not properly escaped. XSS vectors not fully mitigated. |
| **Remediation** | Fix the mapping. Add unit tests. |
| **Effort** | 1 hour |
| **Dependencies** | None |

### TD-022: Dynamic Body Keys as SQL Columns
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `server/index.js:1817-1824` (training-records), `:2451-2501` (risk-assessments), `:2536-2547` (compliance-matrices), `:2587-2598` (maturity-assessments), `:2642-2653` (commercial-establishments v2) |
| **Evidence** | `Object.keys(req.body).forEach(k => { setClauses.push(\`${k} = $${idx++}\`) })` — user input as column names. |
| **Impact** | Potential SQL injection via crafted column names. |
| **Remediation** | Add column name whitelist validation before using in queries. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-023: No File Upload
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | — |
| **Evidence** | `file_url` fields accept arbitrary URLs. No `multipart/form-data`, no `multer`. |
| **Impact** | Documents reference external URLs only. No actual file storage. |
| **Remediation** | Add Supabase Storage or S3 integration. Add multer middleware. Add virus scanning. |
| **Effort** | 1 week |
| **Dependencies** | None |

### TD-024: No i18n Framework
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | Entire frontend |
| **Evidence** | Arabic-only UI. No translation files. No locale switching. |
| **Impact** | Cannot support English-speaking users. Cannot add new languages. |
| **Remediation** | Install `react-i18next`. Create translation files. Add locale switching. |
| **Effort** | 2 weeks |
| **Dependencies** | None |

### TD-025: No Environment Separation
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `.env` only |
| **Evidence** | Single `.env` file. No dev/staging/production separation. |
| **Impact** | Testing in production. No isolated development environment. |
| **Remediation** | Create `.env.development`, `.env.staging`, `.env.production`. Add deployment scripts. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-026: CSRF Utilities Unused
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `security.ts:329-344` |
| **Evidence** | `generateCSRFToken()` and `validateCSRFToken()` defined but never imported or called. |
| **Impact** | CSRF protection code exists but is dead code. |
| **Remediation** | Either implement CSRF protection or remove dead code. |
| **Effort** | 1 hour |
| **Dependencies** | None |

### TD-027: `escapeHTML` Never Used
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `security.ts:350-353` |
| **Evidence** | `escapeHTML` utility defined but never imported in any component. |
| **Impact** | HTML escaping not applied where needed. |
| **Remediation** | Import and use in components that render user content. |
| **Effort** | 1 hour |
| **Dependencies** | TD-021 |

### TD-028: No HTTPS Enforcement
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `server/index.js` — plain HTTP listener |
| **Evidence** | HSTS header defined in `security.middleware.ts` but that file is never imported. |
| **Impact** | Data transmitted in plaintext. Vulnerable to eavesdropping. |
| **Remediation** | Enable HTTPS. Add HSTS header. Redirect HTTP to HTTPS. |
| **Effort** | 1 day (deployment config) |
| **Dependencies** | None |

### TD-029: CSP Not on API Responses
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `server/index.js` — API responses |
| **Evidence** | CSP is injected only via Vite build transform. Express API responses have no CSP header. |
| **Impact** | API responses not protected by Content Security Policy. |
| **Remediation** | Add CSP header middleware to Express. |
| **Effort** | 1 hour |
| **Dependencies** | None |

---

## 4. Low Severity Debt (5 items)

### TD-030: No Test Suite
| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | Vitest configured, zero test files |
| **Evidence** | `vitest.config.ts` exists. No `*.test.ts` or `*.spec.ts` files. |
| **Impact** | No regression protection. Refactoring is risky. |
| **Remediation** | Write unit tests for all services. Write integration tests for API endpoints. |
| **Effort** | 2 weeks |
| **Dependencies** | None |

### TD-031: No CI/CD Pipeline
| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | `.github/` directory — no workflows |
| **Evidence** | No GitHub Actions. No automated testing or deployment. |
| **Impact** | Manual deployment. No quality gates. No automated checks. |
| **Remediation** | Create GitHub Actions workflow for lint, type-check, test, build, deploy. |
| **Effort** | 1 day |
| **Dependencies** | TD-030 |

### TD-032: No Health Monitoring
| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | `/health` endpoint exists |
| **Evidence** | Health check returns status, time, db name. No uptime monitoring, alerting, or APM. |
| **Impact** | Cannot detect outages. No proactive alerting. |
| **Remediation** | Add UptimeRobot or similar. Add APM (New Relic, Datadog). |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-033: Health Endpoint Leaks DB Name
| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | `server/index.js:67` |
| **Evidence** | `SELECT current_database()` — exposes database name in health response. |
| **Impact** | Minor information disclosure. |
| **Remediation** | Remove database name from health response. |
| **Effort** | 5 minutes |
| **Dependencies** | None |

### TD-034: No Error Logging Framework
| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | `server/index.js` — `console.error` only |
| **Evidence** | Errors logged to console only. No structured error tracking. |
| **Impact** | Cannot aggregate errors. Cannot track error frequency. |
| **Remediation** | Add Sentry or similar error tracking service. |
| **Effort** | 1 day |
| **Dependencies** | None |

---

## 5. Code Quality Debt (5 items)

### TD-035: Inconsistent Naming (entity_id vs enterprise_id)
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | Multiple tables |
| **Evidence** | `commercial_branches.enterprise_id`, `commercial_contracts.enterprise_id`, `commercial_equipment.enterprise_id` vs `activities.entity_id`, `board_members.entity_id`, `documents.entity_id`. |
| **Impact** | Confusing. Developer must remember which FK name to use. |
| **Remediation** | Standardize on `entity_id` across all tables. Rename columns. |
| **Effort** | 1 day |
| **Dependencies** | None |

### TD-036: Missing Junction Tables
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | — |
| **Evidence** | No junction tables for many-to-many relationships: entity-occupation, entity-activity, worker-training, etc. |
| **Impact** | Cannot model complex relationships. Data duplication. |
| **Remediation** | Create junction tables with proper FKs and constraints. |
| **Effort** | 2 days |
| **Dependencies** | None |

### TD-037: Duplicate CRUD Patterns
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `server/index.js` — 25+ resource blocks |
| **Evidence** | Nearly identical CRUD logic repeated for each resource (GET all, GET by ID, POST, PUT, DELETE). |
| **Impact** | Bug fixes must be applied 25+ times. Inconsistent behavior across resources. |
| **Remediation** | Extract generic CRUD factory. Create reusable route handlers. |
| **Effort** | 1 week |
| **Dependencies** | TD-018 |

### TD-038: Frontend API Calls Inconsistent
| Field | Value |
|---|---|
| **Severity** | LOW |
| **Location** | `src/app/pages/ministry/*.tsx` |
| **Evidence** | Some pages use `useApi` hook, others use raw `fetch()`. Inconsistent error handling. |
| **Impact** | Inconsistent user experience. Different error handling patterns. |
| **Remediation** | Standardize on `useApi` hook. Refactor all pages to use it. |
| **Effort** | 3 days |
| **Dependencies** | None |

### TD-039: No Database Migrations
| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Location** | `scripts/migrate-sql.js` — ad-hoc script |
| **Evidence** | No versioned migration system (knex, prisma, drizzle). Schema changes are manual. |
| **Impact** | Cannot track schema changes. Cannot rollback. Cannot collaborate on migrations. |
| **Remediation** | Set up Drizzle ORM with migration support. Create initial migration from current schema. |
| **Effort** | 2 days |
| **Dependencies** | None |

---

## 6. Debt Summary

### By Severity

| Severity | Count | Items |
|---|---|---|
| **CRITICAL** | 9 | TD-001 to TD-009 |
| **HIGH** | 8 | TD-010 to TD-017 |
| **MEDIUM** | 12 | TD-018 to TD-029, TD-035 to TD-037, TD-039 |
| **LOW** | 5 | TD-030 to TD-034, TD-038 |
| **TOTAL** | **34** | — |

### By Category

| Category | Count | Items |
|---|---|---|
| **Security** | 14 | TD-001 to TD-009, TD-010, TD-013, TD-014, TD-021, TD-022, TD-028 |
| **Architecture** | 6 | TD-017, TD-018, TD-019, TD-036, TD-037, TD-039 |
| **Data Integrity** | 4 | TD-011, TD-012, TD-016, TD-035 |
| **Code Quality** | 5 | TD-020, TD-026, TD-027, TD-038, TD-039 |
| **Infrastructure** | 5 | TD-023, TD-024, TD-025, TD-029, TD-034 |
| **Testing** | 2 | TD-030, TD-031 |
| **Monitoring** | 2 | TD-032, TD-033 |

### Estimated Remediation Effort

| Priority | Items | Effort |
|---|---|---|
| **Immediate** (Week 1) | TD-003, TD-004, TD-009, TD-033 | 1 day |
| **Critical** (Week 1-2) | TD-001, TD-002, TD-005, TD-006, TD-007 | 2 weeks |
| **High** (Month 1) | TD-008, TD-010, TD-011, TD-012, TD-013, TD-014, TD-015, TD-016 | 2 weeks |
| **Medium** (Month 2) | TD-017, TD-018, TD-019, TD-020, TD-021, TD-022, TD-023, TD-024, TD-025, TD-026, TD-027, TD-028, TD-029, TD-035, TD-036, TD-037, TD-039 | 4 weeks |
| **Low** (Month 3) | TD-030, TD-031, TD-032, TD-034, TD-038 | 2 weeks |

**Total estimated remediation: ~11 weeks**

---

## 7. Debt Tracking

### Recommended Tracking Format

```markdown
| ID | Status | Owner | Start | Due | PR |
|----|--------|-------|-------|-----|----|
| TD-001 | In Progress | — | 2026-08-20 | 2026-08-27 | #123 |
| TD-002 | Pending | — | — | — | — |
```

### Definition of Done

A technical debt item is considered resolved when:
1. Code change is implemented
2. Tests are written and passing
3. Documentation is updated
4. Security review is completed (for security items)
5. PR is merged to main
