# Current Architecture — UnionSphere

> Documenting the existing system state as discovered on 2026-08-20.
> This is the "AS-IS" architecture before any refactoring.

---

## 1. Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Frontend** | React | 19.x | SPA with TypeScript |
| **Build** | Vite | 6.x | HMR, ESBuild, SWC |
| **Styling** | Tailwind CSS | 4.x | RTL support via `dir="rtl"` |
| **Charts** | Recharts | 2.x | Dashboard visualizations |
| **UI Library** | shadcn/ui + Radix | — | Card, Button, Modal, Table, etc. |
| **Backend** | Express.js | 4.x | Single `server/index.js` (2671 lines) |
| **Database** | Neon PostgreSQL | 17.x | Serverless PostgreSQL |
| **DB Driver** | pg (node-postgres) | — | Connection pool via `Pool` |
| **Auth** | Client-side Supabase | Placeholder | Non-functional; demo credentials |
| **State** | React Context + useState | — | No Redux/Zustand |
| **Testing** | Vitest | — | Configured, zero test files |
| **Linting** | ESLint + Prettier | — | Configured |
| **Deployment** | Vercel | — | Serverless functions |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  React SPA  │  │  AuthContext │  │  Security Layer   │  │
│  │  (Vite Dev) │  │  (client)    │  │  (client-side)    │  │
│  └──────┬──────┘  └──────────────┘  └───────────────────┘  │
│         │                                                    │
│  ┌──────┴──────────────────────────────────────────────┐    │
│  │              fetch() / useApi hook                   │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │ HTTP (no auth headers)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     VERCEL / EXPRESS                         │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              server/index.js (2671 lines)              │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │   CORS   │  │  JSON    │  │  Static files     │   │  │
│  │  │ (open)   │  │  Parser  │  │  (Vite build)     │   │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  │                                                        │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │         133 REST ENDPOINTS                      │   │  │
│  │  │  (no auth middleware, no RBAC, no validation)   │   │  │
│  │  └──────────────────────┬─────────────────────────┘   │  │
│  └─────────────────────────┼──────────────────────────────┘  │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │ SQL (parameterized)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEON POSTGRESQL                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              60 tables, ~3,700+ rows                 │    │
│  │                                                       │    │
│  │  Core:                                                │    │
│  │    organizational_entities (13 rows, 106 columns)     │    │
│  │    members (5 rows, 34 columns)                       │    │
│  │    activities (3 rows, 29 columns)                    │    │
│  │    professions (3590 rows, 94 columns)                │    │
│  │    isic4_classifications (65 rows, 23 columns)        │    │
│  │    governorates (20 rows, 8 columns)                  │    │
│  │                                                       │    │
│  │  Supporting:                                          │    │
│  │    audit_log (18 rows) | documents (3) | services(12) │    │
│  │    violations(1) | elections(1) | risk_assessments(2)  │    │
│  │    ... + 48 more tables                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### Request Lifecycle (Current)

```
1. User action in React component
2. Component calls fetch('/api/xxx') or useApi hook
3. Express receives request — NO auth check
4. Query built with whitelist (colMap) or dynamic keys
5. SQL executed against Neon PostgreSQL
6. Result returned as JSON
7. Client-side security.ts logs to localStorage + audit_log table
```

### Authentication Flow (Current)

```
1. User enters credentials on Login page
2. AuthContext checks hardcoded demo users or Supabase placeholder
3. On success, user object stored in localStorage
4. React Router checks userType for route guards (ministry/organization)
5. Server never validates the session
6. Any curl/fetch to /api/* works without credentials
```

### Data Writes (Current)

```
1. POST /api/entities — direct INSERT, no validation
2. PUT /api/entities/:id — whitelisted columns, parameterized query
3. DELETE /api/entities/:id — soft delete (sets deleted_at)
4. DELETE /api/members/:id — HARD DELETE (permanent)
5. No workflow engine — status changes are manual
6. No audit trail from server — client sends audit entries
```

---

## 4. Component Structure

### Frontend Structure

```
src/
├── app/
│   ├── routes.tsx                    # Route definitions
│   ├── App.tsx                       # Root component
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Auth state (client-side)
│   │   └── OfflineContext.tsx         # Offline detection
│   ├── components/
│   │   ├── layouts/
│   │   │   ├── RootLayoutNew.tsx      # Sidebar + topbar + content
│   │   │   └── ...
│   │   ├── ui/                        # shadcn/ui components
│   │   └── shared/                    # StatusBadge, PageHeader, etc.
│   ├── hooks/
│   │   ├── useApi.ts                  # fetch wrapper
│   │   ├── useConfirm.ts              # Confirmation dialog
│   │   └── ...
│   ├── lib/
│   │   ├── security.ts                # Client-side security utils
│   │   └── utils.ts                   # General utilities
│   └── pages/
│       ├── ministry/                  # 31 page files
│       │   ├── DashboardNewEnhanced.tsx
│       │   ├── EnterpriseDashboard.tsx
│       │   ├── CommercialEstablishmentsManagement.tsx
│       │   ├── UnionsManagementNew.tsx
│       │   ├── MembersManagementNew.tsx
│       │   ├── ElectionsManagement.tsx
│       │   ├── ActivitiesManagement.tsx
│       │   ├── DocumentsManagement.tsx
│       │   ├── ServicesManagement.tsx
│       │   ├── ViolationsManagement.tsx
│       │   ├── ... (20 more)
│       │   └── Profile.tsx
│       ├── organization/              # 5 page files
│       │   ├── Dashboard.tsx
│       │   ├── MembersManagement.tsx
│       │   ├── ActivitiesManagement.tsx
│       │   ├── DocumentsManagement.tsx
│       │   └── ServicesManagement.tsx
│       └── shared/                    # Login, NotFound, etc.
```

### Backend Structure

```
server/
├── index.js                          # ENTIRE BACKEND (2671 lines)
│   ├── Lines 1-62: Setup, CORS, middleware
│   ├── Lines 64-120: Health + Dashboard endpoints
│   ├── Lines 123-255: Entity CRUD (5 endpoints)
│   ├── Lines 256-350: Member CRUD (4 endpoints)
│   ├── Lines 351-448: Activity CRUD (4 endpoints)
│   ├── Lines 449-536: Election CRUD (4 endpoints)
│   ├── Lines 537-625: Document CRUD (4 endpoints)
│   ├── Lines 626-715: Violation CRUD (4 endpoints)
│   ├── Lines 716-808: Profession CRUD (4 endpoints)
│   ├── Lines 809-882: Service CRUD (4 endpoints)
│   ├── Lines 883-969: Service Request CRUD (4 endpoints)
│   ├── Lines 970-1070: Worker Profile CRUD (5 endpoints)
│   ├── Lines 1071-1192: Compliance Alert CRUD (7 endpoints)
│   ├── Lines 1193-1288: Fee Payment CRUD (5 endpoints)
│   ├── Lines 1289-1395: Worker Dispatch CRUD (5 endpoints)
│   ├── Lines 1396-1498: Reduction Request CRUD (5 endpoints)
│   ├── Lines 1499-1586: License CRUD (4 endpoints)
│   ├── Lines 1587-1682: Inspection CRUD (4 endpoints)
│   ├── Lines 1683-1770: Evaluation Certificate CRUD (4 endpoints)
│   ├── Lines 1771-1841: Training Record CRUD (4 endpoints)
│   ├── Lines 1842-1935: Profile CRUD (5 endpoints)
│   ├── Lines 1936-2016: Notification CRUD (4 endpoints)
│   ├── Lines 2017-2104: Board Member CRUD (4 endpoints)
│   ├── Lines 2105-2190: Commercial Establishment v1 (4 endpoints)
│   ├── Lines 2191-2213: ISIC-4 (read-only)
│   ├── Lines 2214-2254: Audit Log (read + write)
│   ├── Lines 2255-2313: Labor Dispute CRUD (4 endpoints)
│   ├── Lines 2314-2372: Expatriate License CRUD (4 endpoints)
│   ├── Lines 2373-2450: Legal Reference CRUD (4 endpoints)
│   ├── Lines 2451-2501: Risk Assessment CRUD (4 endpoints)
│   ├── Lines 2502-2556: Compliance Matrix CRUD (4 endpoints)
│   ├── Lines 2557-2607: Maturity Assessment CRUD (4 endpoints)
│   ├── Lines 2608-2665: Commercial Establishment v2 (4 endpoints)
│   └── Lines 2666-2671: Catch-all 404
└── (no other files — monolith)
```

---

## 5. Known Technical Debt

### Critical (9 items)

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | **No server-side auth** | `server/index.js` | All API endpoints publicly accessible |
| 2 | **No RBAC** | `server/index.js` | All users have identical API access |
| 3 | **Credentials in .env** | `.env` | Database passwords exposed in git |
| 4 | **CORS origin: true** | `server/index.js:41` | Any origin can make credentialed requests |
| 5 | **SQL column injection** | Lines 1817-1824, 2413-2449 | Attacker can inject column/table names |
| 6 | **No CSRF protection** | `server/index.js` | Cross-site request forgery possible |
| 7 | **No rate limiting** | `server/index.js` | Brute force and DoS attacks possible |
| 8 | **Audit log client-forged** | `POST /api/audit-log` | Anyone can forge audit entries |
| 9 | **SSL verify disabled** | `server/index.js:33` | MITM on database connection |

### High (8 items)

| # | Issue | Location | Impact |
|---|---|---|---|
| 10 | **No input validation** | All POST/PUT endpoints | No schema validation on any request body |
| 11 | **Hard deletes** | Members, activities, elections, etc. | Data permanently lost |
| 12 | **DB errors leaked** | 33+ endpoints | Schema/table names exposed in errors |
| 13 | **Client-side only auth** | `AuthContext.tsx` | Sessions in localStorage only |
| 14 | **No server-side audit** | `server/index.js` | Server records what client sends, no independent audit |
| 15 | **No workflow engine** | All entities | Status transitions manual, no state machine |
| 16 | **Duplicate commercial endpoints** | `/api/commercial` + `/api/commercial-establishments` | v1 and v2 coexist |
| 17 | **Organization data not scoped** | All queries | Organization users see all ministry data |

### Medium (7 items)

| # | Issue | Location | Impact |
|---|---|---|---|
| 18 | **Monolith server** | `server/index.js` | 2671-line single file, unmaintainable |
| 19 | **No API versioning** | All endpoints | Breaking changes affect all clients |
| 20 | **No error logging framework** | `server/index.js` | console.log only, no structured logging |
| 21 | **`escapeHTML` bug** | `security.ts:351` | `&` → `&` self-assignment, entities not escaped |
| 22 | **Dynamic body keys as columns** | Training records, risk assessments, etc. | Potential SQL injection vectors |
| 23 | **No file upload** | — | Documents reference external URLs only |
| 24 | **No i18n** | Entire frontend | Arabic-only, no translation framework |

### Low (4 items)

| # | Issue | Location | Impact |
|---|---|---|---|
| 25 | **No test suite** | Vitest configured, zero files | No regression protection |
| 26 | **No CI/CD** | — | No automated testing or deployment |
| 27 | **No environment separation** | `.env` only | No dev/staging/prod separation |
| 28 | **No health monitoring** | `/health` exists | No uptime monitoring or alerting |

---

## 6. Database Schema Summary

### Key Relationships (Current)

```
organizational_entities ──┬── members (1:N)
                          ├── activities (1:N)
                          ├── board_members (1:N)
                          ├── documents (1:N)
                          ├── elections (1:N)
                          ├── violations (1:N)
                          ├── commercial_establishments (1:N)
                          ├── services (1:N)
                          ├── worker_profiles (1:N)
                          ├── fee_payments (1:N)
                          ├── worker_dispatches (1:N)
                          └── worker_reduction_requests (1:N)

professions (3590 rows) ──── No FK to organizational_entities
isic4_classifications (65) ──── No FK to organizational_entities
governorates (20) ──── Referenced by text, not FK
```

### Tables Without Relationships

The following tables exist but have no foreign keys to the core entity model:
- `career_paths` — references `occupation_id` (not validated)
- `commercial_branches`, `commercial_contracts`, `commercial_equipment`, `commercial_warehouses` — reference `enterprise_id` (not validated)
- `enterprise_isic_links`, `enterprise_occupation_links`, `enterprise_evaluation_levels`, `enterprise_slots` — reference `enterprise_id`
- `compliance_alerts`, `compliance_matrices` — no FK
- `expatriate_licenses`, `hazardous_occupations`, `ilo_conventions` — no FK
- `inspection_checklists`, `inspections` — no FK
- `labor_disputes`, `law_articles`, `legal_references` — no FK
- `risk_assessments`, `maturity_assessments` — no FK
- `salary_ranges`, `smart_suggestions`, `training_records` — no FK

---

## 7. Summary Metrics

| Metric | Value |
|---|---|
| Frontend pages | 36 (31 ministry + 5 organization) |
| API endpoints | 133 |
| Database tables | 60 |
| Total rows | ~3,700+ |
| Largest table | `professions` (3,590 rows, 94 columns) |
| Server file count | 1 (`index.js`, 2,671 lines) |
| Auth middleware | 0 |
| Test files | 0 |
| Security vulnerabilities | 49 (9 critical, 16 high) |
| Known workflows | 0 (manual CRUD only) |
