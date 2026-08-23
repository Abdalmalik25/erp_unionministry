# Target Architecture — UnionSphere Enterprise

> The "TO-BE" architecture per the Nuclear Prompt requirements.
> 26 Domains, Entity Core model, Workflow Engine, AI Integration, Full Reporting.

---

## 1. Architectural Principles

| Principle | Description |
|---|---|
| **Entity Core Model** | Every domain entity inherits from a unified `Entity` base. Organizations, establishments, trade unions, and workers are specializations of this core. |
| **Domain Isolation** | Each of the 26 domains has its own API prefix, DB schema, and service module. No cross-domain SQL. |
| **Workflow as Infrastructure** | Every entity with a lifecycle uses the central Workflow Engine — no ad-hoc status fields. |
| **Server-Side Auth + RBAC** | Every request authenticated via JWT. Every endpoint authorized via role + permission matrix. |
| **Audit Trail by Default** | Every write operation automatically logged by the server — independent of client input. |
| **Soft Deletes Everywhere** | No hard deletes. All deletions set `deleted_at` + `deleted_by`. |
| **Input Validation via Schema** | Zod schemas validate every request body. No dynamic column injection. |

---

## 2. The 26 Domains

| # | Domain | Arabic Name | Description | API Prefix |
|---|---|---|---|---|
| 1 | **Entity Core** | الكيان الأساسي | Base entity model — all entities inherit from this | `/api/v1/entities` |
| 2 | **Establishments** | المنشآت | Commercial establishments, branches, facilities | `/api/v1/establishments` |
| 3 | **Organizations** | المنظمات | NGOs, associations, civil society organizations | `/api/v1/organizations` |
| 4 | **Trade Unions** | النقابات العمالية | Trade unions, syndicates, labor federations | `/api/v1/unions` |
| 5 | **Workers** | العمال | Individual worker profiles, employment records | `/api/v1/workers` |
| 6 | **Employers** | أصحاب العمل | Employer entities, company registrations | `/api/v1/employers` |
| 7 | **Members** | الأعضاء | Organization/union members, membership records | `/api/v1/members` |
| 8 | **Occupations** | المهن | Professions, occupation codes, ISIC-4 mapping | `/api/v1/occupations` |
| 9 | **Activities** | الأنشطة | Organization activities, events, programs | `/api/v1/activities` |
| 10 | **Inspections** | التفتيش | Inspection scheduling, execution, findings | `/api/v1/inspections` |
| 11 | **Violations** | المخالفات | Violation tracking, citations, penalties | `/api/v1/violations` |
| 12 | **Compliance** | الامتثال | Compliance tracking, alerts, matrices | `/api/v1/compliance` |
| 13 | **Risk** | المخاطر | Risk assessment, mitigation, monitoring | `/api/v1/risk` |
| 14 | **Documents** | الوثائق | Document management, upload, classification | `/api/v1/documents` |
| 15 | **Applications** | الطلبات | Service requests, applications, petitions | `/api/v1/applications` |
| 16 | **Licenses** | التراخيص | License management, renewal, revocation | `/api/v1/licenses` |
| 17 | **Elections** | الانتخابات | Election management, voting, results | `/api/v1/elections` |
| 18 | **Services** | الخدمات | Ministry services, service catalog | `/api/v1/services` |
| 19 | **Workforce** | قوة العمل | Worker dispatches, reductions, deployment | `/api/v1/workforce` |
| 20 | **Legal** | القانوني | Legal references, law articles, regulations | `/api/v1/legal` |
| 21 | **Financial** | المالي | Fee payments, invoices, financial reports | `/api/v1/financial` |
| 22 | **Training** | التدريب | Training records, certifications, programs | `/api/v1/training` |
| 23 | **Notifications** | الإشعارات | Notification delivery, channels, templates | `/api/v1/notifications` |
| 24 | **Reporting** | التقارير | Report generation, scheduling, distribution | `/api/v1/reports` |
| 25 | **Governance** | الحوكمة | Board members, maturity assessments, governance | `/api/v1/governance` |
| 26 | **Administration** | الإدارة | Users, roles, permissions, system settings | `/api/v1/admin` |

---

## 3. Entity Core Model

### Base Entity (All 26 domains inherit)

```
┌─────────────────────────────────────────────────────────────┐
│                    ENTITY (Base Table)                        │
│                                                              │
│  id: UUID (PK)                                              │
│  entity_type: ENUM (organization, establishment, union,     │
│                      employer, worker, ...)                  │
│  entity_number: TEXT (auto-generated, unique)                │
│  name_ar: TEXT (NOT NULL)                                    │
│  name_en: TEXT                                               │
│  status: ENUM (draft, pending, active, suspended, archived)  │
│  risk_level: ENUM (low, medium, high, critical)              │
│  governorate_id: UUID (FK → governorates)                    │
│  governorate: TEXT (denormalized)                            │
│  city: TEXT                                                  │
│  address: TEXT                                               │
│  phone: TEXT                                                 │
│  email: TEXT                                                 │
│  website: TEXT                                               │
│  registration_number: TEXT                                   │
│  registration_date: DATE                                     │
│  metadata: JSONB                                             │
│  created_at: TIMESTAMPTZ                                    │
│  created_by: UUID (FK → users)                               │
│  updated_at: TIMESTAMPTZ                                    │
│  updated_by: UUID (FK → users)                               │
│  deleted_at: TIMESTAMPTZ (nullable — soft delete)            │
│  deleted_by: UUID (FK → users, nullable)                     │
└─────────────────────────────────────────────────────────────┘
```

### Entity Specializations

```
Entity (Base)
├── Organization
│   ├── org_type: ENUM (ngo, association, federation, cooperative)
│   ├── license_number: TEXT
│   ├── founding_date: DATE
│   ├── member_count: INTEGER
│   └── ... (org-specific fields)
│
├── Establishment
│   ├── establishment_id: TEXT (commercial register number)
│   ├── unified_code: TEXT
│   ├── entity_type: ENUM (company, branch, factory, workshop)
│   ├── sector: ENUM (industrial, commercial, service, agricultural)
│   ├── classification: ENUM (micro, small, medium, large)
│   ├── employee_count: INTEGER
│   ├── isic_code: TEXT (FK → isic4_classifications)
│   └── ... (establishment-specific fields)
│
├── TradeUnion
│   ├── union_type: ENUM (primary, federation, confederation)
│   ├── registration_number: TEXT
│   ├── founding_date: DATE
│   ├── member_count: INTEGER
│   ├── parent_union_id: UUID (FK → self)
│   └── ... (union-specific fields)
│
├── Employer
│   ├── commercial_register: TEXT
│   ├── tax_number: TEXT
│   ├── employee_count: INTEGER
│   └── ... (employer-specific fields)
│
└── Worker
    ├── national_id: TEXT
    ├── date_of_birth: DATE
    ├── gender: ENUM (male, female)
    ├── marital_status: ENUM
    ├── occupation_id: UUID (FK → occupations)
    ├── employer_id: UUID (FK → entities)
    ├── employment_status: ENUM (active, terminated, suspended, retired)
    ├── hire_date: DATE
    └── ... (worker-specific fields)
```

### Entity Relationship Diagram

```
                    ┌──────────────┐
                    │   entities   │
                    │   (base)     │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │organizations│  │establishments│  │trade_unions  │
   └─────────────┘  └─────────────┘  └─────────────┘
          │                │                │
          │                │                │
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │   members   │  │   workers   │  │board_members│
   └─────────────┘  └─────────────┘  └─────────────┘
          │                │
          │                │
          ▼                ▼
   ┌─────────────┐  ┌─────────────┐
   │ activities  │  │ occupations │
   └─────────────┘  └─────────────┘
```

---

## 4. Domain Extensions

Each domain extends the Entity Core with domain-specific tables:

### Domain 2: Establishments

```
establishments (entity_id FK)
├── establishment_details (1:1 — ISIC, sector, classification, employee counts)
├── commercial_branches (1:N — branch locations)
├── commercial_contracts (1:N — contracts with parties)
├── commercial_equipment (1:N — machinery, assets)
└── commercial_warehouses (1:N — storage facilities)
```

### Domain 4: Trade Unions

```
trade_unions (entity_id FK)
├── union_details (1:1 — union type, founding, constitution)
├── board_members (1:N — elected officials)
├── elections (1:N — election events)
├── election_results (1:N — vote tallies)
└── union_affiliations (N:N — federation memberships)
```

### Domain 7: Members

```
members (entity_id FK, person_id FK)
├── member_details (1:1 — membership type, join date, card number)
├── member_history (1:N — status changes, transfers)
└── member_payments (1:N — dues, fees)
```

### Domain 10: Inspections

```
inspections (entity_id FK)
├── inspection_details (1:1 — type, scope, inspector)
├── inspection_checklists (1:N — checklist items)
├── inspection_findings (1:N — issues found)
├── inspection_corrective_actions (1:N — required fixes)
└── inspection_reinspections (1:N — follow-ups)
```

---

## 5. Workflow Engine Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW ENGINE                            │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Workflow   │  │    State     │  │   Transition     │   │
│  │  Registry   │  │   Machine    │  │   Validator      │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Approval   │  │  Notification│  │   Audit          │   │
│  │  Engine     │  │  Dispatcher  │  │   Recorder       │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Workflow Definitions (JSON)

```json
{
  "workflow_id": "entity_registration",
  "entity_type": "organization",
  "states": [
    { "state": "draft", "label": "مسودة", "terminal": false },
    { "state": "submitted", "label": "مقدم", "terminal": false },
    { "state": "under_review", "label": "قيد المراجعة", "terminal": false },
    { "state": "approved", "label": "موافق عليه", "terminal": true },
    { "state": "rejected", "label": "مرفوض", "terminal": true },
    { "state": "suspended", "label": "معلق", "terminal": false }
  ],
  "transitions": [
    { "from": "draft", "to": "submitted", "action": "submit", "role": "organization" },
    { "from": "submitted", "to": "under_review", "action": "start_review", "role": "ministry_reviewer" },
    { "from": "under_review", "to": "approved", "action": "approve", "role": "ministry_admin" },
    { "from": "under_review", "to": "rejected", "action": "reject", "role": "ministry_admin", "requires_comment": true }
  ]
}
```

### Workflow Table

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type TEXT NOT NULL,          -- 'entity_registration', 'inspection', etc.
  entity_type TEXT NOT NULL,            -- 'organization', 'establishment', etc.
  entity_id UUID NOT NULL,             -- FK to entities
  current_state TEXT NOT NULL,
  assigned_to UUID,                     -- FK to users
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workflow_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL,
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. AI Integration Points

### Planned AI Features

| Feature | Domain | Input | Output | Priority |
|---|---|---|---|---|
| **Risk Prediction** | Risk | Violation history, inspection results, entity metadata | Risk score (0-100), risk level | High |
| **Compliance Scoring** | Compliance | License status, inspection findings, violation count | Compliance score (0-100), status | High |
| **Anomaly Detection** | All | Time-series data (members, payments, violations) | Anomaly alerts with confidence | Medium |
| **NLP Search** | Legal | Arabic search queries | Ranked results from legal references | Medium |
| **Document Classification** | Documents | Uploaded document text | Category, confidence score | Low |
| **Predictive Analytics** | Reporting | Historical data | Forecasts, trends, seasonality | Medium |
| **Smart Notifications** | Notifications | Entity context, urgency signals | Prioritized notification queue | Low |
| **Data Quality Scoring** | Admin | Entity completeness, accuracy | Quality score per entity | Low |

### AI Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI SERVICE LAYER                        │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Risk Predictor │  │  Compliance     │                   │
│  │  (ML Model)     │  │  Scorer         │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│  ┌────────┴────────────────────┴────────┐                   │
│  │        Feature Store                  │                   │
│  │  (materialized views from DB)         │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Anomaly        │  │  NLP Search     │                   │
│  │  Detector       │  │  (Arabic)       │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │  AI Results Cache (Redis / DB)            │               │
│  │  - Risk scores recalculated nightly       │               │
│  │  - Compliance scores recalculated weekly  │               │
│  │  - Anomalies detected in real-time        │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### AI Integration in Workflow

```
Entity Created → AI Risk Predictor → Initial Risk Score
    ↓
Inspection Completed → AI Compliance Scorer → Updated Score
    ↓
Violation Detected → AI Anomaly Detector → Alert if Spike
    ↓
License Expiring → AI Predictive Analytics → Renewal Reminder
```

---

## 7. Reporting Architecture

### Report Types

| Report | Domain | Frequency | Format | Distribution |
|---|---|---|---|---|
| Entity Summary | Entity Core | On-demand | PDF, Excel | Download |
| Compliance Status | Compliance | Weekly | PDF | Email |
| Risk Dashboard | Risk | Real-time | HTML | Dashboard |
| Inspection Summary | Inspections | Monthly | PDF, Excel | Email, Download |
| Violation Report | Violations | On-demand | PDF | Download |
| Financial Summary | Financial | Monthly | Excel | Email |
| Audit Trail | Admin | On-demand | CSV, JSON | Download |
| KPI Dashboard | All | Real-time | HTML | Dashboard |
| Annual Report | All | Annual | PDF | Print, Download |
| Geographic Heatmap | All | Monthly | HTML | Dashboard |

### Report Engine Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REPORTING ENGINE                           │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Report         │  │  Template       │                   │
│  │  Scheduler      │  │  Engine         │                   │
│  │  (node-cron)    │  │  (PDFKit/EJS)   │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│  ┌────────┴────────────────────┴────────┐                   │
│  │        Data Aggregation Layer         │                   │
│  │  (SQL views + materialized views)     │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Export Service  │  │  Distribution   │                   │
│  │  (PDF/Excel/CSV) │  │  (Email/SMS)    │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │  Report Store (reports table)              │               │
│  │  - Generated reports stored as BLOBs       │               │
│  │  - Download links with expiry              │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Security Model

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTH SERVICE                               │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  JWT Issuer     │  │  Refresh Token  │                   │
│  │  (Access: 15m)  │  │  (7 days)       │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Password       │  │  Session        │                   │
│  │  Hasher (bcrypt)│  │  Store (Redis)  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │  Rate Limiter (per-user + per-IP)         │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### RBAC Permission Matrix

```
┌──────────────────┬────────────┬──────────────┬───────────────┬──────────────┐
│ Resource         │ super_admin│ ministry_admin│ ministry_staff│ org_manager  │
├──────────────────┼────────────┼──────────────┼───────────────┼──────────────┤
│ entities         │ CRUD       │ CRUD         │ R             │ R (scoped)   │
│ members          │ CRUD       │ CRUD         │ CRUD          │ CRUD (scoped)│
│ violations       │ CRUD       │ CRUD         │ R             │ R (scoped)   │
│ inspections      │ CRUD       │ CRUD         │ CRUD          │ R (scoped)   │
│ audit_log        │ R          │ R            │ —             │ —            │
│ users            │ CRUD       │ R            │ —             │ —            │
│ reports          │ CRUD       │ CRUD         │ R             │ R (scoped)   │
│ workflow         │ CRUD       │ CRUD         │ R             │ CRUD (scoped)│
│ settings         │ CRUD       │ R            │ —             │ —            │
└──────────────────┴────────────┴──────────────┴───────────────┴──────────────┘
```

### Middleware Stack (Target)

```
Request → CORS → Rate Limiter → JWT Auth → RBAC Check → Input Validation → Handler → Audit Log
```

---

## 9. Target Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 19 + Vite 6 | Already in use, proven |
| **UI** | shadcn/ui + Radix | Already in use, accessible |
| **Backend** | Express.js (modular) | Split monolith into domain modules |
| **Database** | PostgreSQL (Neon) | Already in use |
| **ORM** | Drizzle or Knex | Type-safe queries, migrations |
| **Auth** | JWT + bcrypt | Simple, self-contained |
| **Validation** | Zod | TypeScript-native, composable |
| **Workflow** | Custom engine | Domain-specific state machines |
| **AI** | Python microservice | Separate service for ML models |
| **Reporting** | PDFKit + ExcelJS | Server-side generation |
| **Email** | Nodemailer | SMTP-based delivery |
| **Cache** | Redis (optional) | Session store, report cache |
| **Testing** | Vitest + Supertest | Already configured |
| **CI/CD** | GitHub Actions | Automated pipeline |

---

## 10. Migration Phases Overview

| Phase | Domain(s) | Effort | Risk |
|---|---|---|---|
| **Phase 0** | Discovery | ✅ DONE | None |
| **Phase 1** | Data Model + Domain Architecture | 2 weeks | Medium |
| **Phase 2** | Security / Auth / Audit | 2 weeks | High |
| **Phase 3** | Entity Core | 1 week | Medium |
| **Phase 4** | Establishments & Activities | 1 week | Low |
| **Phase 5** | Organizations | 1 week | Low |
| **Phase 6** | Trade Unions | 1 week | Low |
| **Phase 7** | Workers | 1 week | Medium |
| **Phase 8** | Occupations | 1 week | Low |
| **Phase 9-20** | Remaining domains | 8 weeks | Medium |

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for detailed phase breakdown.
