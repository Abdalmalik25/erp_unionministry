# Migration Plan — UnionSphere Enterprise

> Step-by-step migration strategy from current state to target architecture.
> Each phase includes: scope, files to modify, risk level, rollback plan.

---

## Phase Overview

| Phase | Name | Duration | Risk | Status |
|---|---|---|---|---|
| 0 | Discovery | 1 week | None | ✅ DONE |
| 1 | Data Model & Domain Architecture | 2 weeks | Medium | ⏳ Pending |
| 2 | Security / Authorization / Audit | 2 weeks | High | ⏳ Pending |
| 3 | Entity Core | 1 week | Medium | ⏳ Pending |
| 4 | Establishments & Activities | 1 week | Low | ⏳ Pending |
| 5 | Organizations | 1 week | Low | ⏳ Pending |
| 6 | Trade Unions | 1 week | Low | ⏳ Pending |
| 7 | Workers | 1 week | Medium | ⏳ Pending |
| 8 | Occupations | 1 week | Low | ⏳ Pending |
| 9 | Documents & Licenses | 1 week | Low | ⏳ Pending |
| 10 | Inspections | 1 week | Low | ⏳ Pending |
| 11 | Violations & Compliance | 1 week | Low | ⏳ Pending |
| 12 | Risk & Legal | 1 week | Low | ⏳ Pending |
| 13 | Services & Applications | 1 week | Low | ⏳ Pending |
| 14 | Workforce & Dispatches | 1 week | Medium | ⏳ Pending |
| 15 | Training & Certification | 1 week | Low | ⏳ Pending |
| 16 | Financial & Fee Payments | 1 week | Low | ⏳ Pending |
| 17 | Notifications & Messaging | 1 week | Medium | ⏳ Pending |
| 18 | Reporting Engine | 2 weeks | Medium | ⏳ Pending |
| 19 | Workflow Engine | 2 weeks | High | ⏳ Pending |
| 20 | AI Integration | 3 weeks | High | ⏳ Pending |
| 21 | Frontend Refactor | 4 weeks | Medium | ⏳ Pending |
| 22 | Testing & QA | 2 weeks | Low | ⏳ Pending |
| 23 | Deployment & CI/CD | 1 week | Medium | ⏳ Pending |

---

## Phase 0: Discovery ✅ DONE

### Scope
- Database inventory (60 tables, 3,700+ rows)
- API inventory (133 endpoints)
- Frontend inventory (36 pages)
- Security assessment (49 vulnerabilities)
- Gap analysis (10 missing domains, 10 missing workflows, 10 missing AI features)

### Deliverables
- `docs/DATABASE_INVENTORY.md`
- `docs/API_INVENTORY.md`
- `docs/FRONTEND_INVENTORY.md`
- `docs/SECURITY_ASSESSMENT.md`
- `docs/GAP_ANALYSIS.md`
- `docs/DUPLICATION_REPORT.md`
- `docs/DATA_QUALITY_REPORT.md`
- `docs/CURRENT_ARCHITECTURE.md`
- `docs/TARGET_ARCHITECTURE.md`
- `docs/DOMAIN_GLOSSARY.md`
- `docs/MIGRATION_PLAN.md`
- `docs/TECHNICAL_DEBT.md`

---

## Phase 1: Data Model & Domain Architecture

### Scope
- Define the Entity Core schema
- Create domain separation (26 domains)
- Add `entity_type` discriminator to `entities` table
- Rename `organizational_entities` → `entities`
- Add `deleted_at` / `deleted_by` columns to all tables
- Create `users` table (separate from `profiles`)
- Create `roles` and `permissions` tables
- Set up Drizzle or Knex for migrations

### Files to Modify
| File | Change |
|---|---|
| `server/index.js` | Add entity_type enum, rename table references |
| `database/migrations/001_entity_core.sql` | **NEW** — Entity Core schema |
| `database/migrations/002_users_roles.sql` | **NEW** — Auth schema |
| `database/migrations/003_soft_deletes.sql` | **NEW** — Add deleted_at to all tables |
| `drizzle.config.ts` | **NEW** — Migration configuration |
| `server/db/` | **NEW** — Database connection module (extracted from index.js) |

### Risk Level: MEDIUM
- Table rename affects all queries
- New columns may break existing INSERT statements

### Rollback Plan
1. Keep original `organizational_entities` table as a view
2. New columns are nullable — no data loss
3. Migration files are versioned — can reverse-migrate

---

## Phase 2: Security / Authorization / Audit

### Scope
- Add JWT authentication middleware
- Add RBAC middleware with role/permission checks
- Add server-side input validation (Zod)
- Add server-side rate limiting
- Fix CORS to explicit allowlist
- Add server-side audit logging (independent of client)
- Remove `.env` from version control
- Rotate all credentials
- Fix SQL injection vulnerabilities (training-records, legal-references)
- Add CSRF protection
- Enable SSL certificate verification

### Files to Modify
| File | Change |
|---|---|
| `server/middleware/auth.js` | **NEW** — JWT verification middleware |
| `server/middleware/rbac.js` | **NEW** — Role-based access control |
| `server/middleware/validate.js` | **NEW** — Zod schema validation |
| `server/middleware/rateLimit.js` | **NEW** — express-rate-limit setup |
| `server/middleware/audit.js` | **NEW** — Server-side audit logger |
| `server/middleware/csrf.js` | **NEW** — CSRF token validation |
| `server/index.js` | Apply middleware to all routes, fix CORS |
| `server/index.js:1817-1824` | Fix training-records column injection |
| `server/index.js:2413-2449` | Fix legal-references table injection |
| `server/index.js:2451-2653` | Fix dynamic column injection in 4 endpoints |
| `server/index.js:33` | Enable SSL verify: `rejectUnauthorized: true` |
| `.env` | Remove from git, rotate all credentials |
| `.gitignore` | Add `.env` |
| `server/schemas/` | **NEW** — Zod validation schemas |

### Risk Level: HIGH
- Auth middleware will break all existing API calls until frontend adds JWT
- RBAC may block legitimate operations if roles are misconfigured
- Credential rotation requires coordinated deployment

### Rollback Plan
1. Auth middleware can be toggled via feature flag (`ENABLE_AUTH=true`)
2. RBAC starts in "audit only" mode — logs violations but doesn't block
3. Keep old `.env` backup in secure vault
4. CORS revert: keep `origin: true` as fallback during transition

---

## Phase 3: Entity Core

### Scope
- Implement Entity CRUD with full validation
- Add entity_number auto-generation
- Add entity lifecycle states (draft → pending → active → archived)
- Implement soft delete on all entity operations
- Add entity search (Arabic + English)
- Add entity filtering (governorate, status, type, risk_level)
- Add entity summary endpoint (dashboard view)

### Files to Modify
| File | Change |
|---|---|
| `server/routes/entities.js` | **NEW** — Entity domain routes |
| `server/services/entities.js` | **NEW** — Entity business logic |
| `server/schemas/entities.js` | **NEW** — Entity validation schemas |
| `server/index.js` | Remove old entity endpoints, mount new router |
| `src/app/pages/ministry/EnterpriseDashboard.tsx` | Update API calls to `/api/v1/entities` |

### Risk Level: MEDIUM
- API path change (`/api/entities` → `/api/v1/entities`) breaks existing frontend
- Auto-generated entity numbers may conflict with existing data

### Rollback Plan
1. Keep old endpoints functional during transition (dual-serve)
2. Entity number generation starts after migration of existing records
3. Frontend can toggle between old/new API via environment variable

---

## Phase 4: Establishments & Activities

### Scope
- Migrate `commercial_establishments` into `establishments` (entity specialization)
- Merge `commercial_branches`, `commercial_contracts`, `commercial_equipment`, `commercial_warehouses`
- Implement ISIC-4 linking via junction tables
- Migrate `activities` to domain-scoped endpoints
- Add activity workflow (planned → approved → in_progress → completed)

### Files to Modify
| File | Change |
|---|---|
| `server/routes/establishments.js` | **NEW** — Establishments domain |
| `server/routes/activities.js` | **NEW** — Activities domain |
| `server/services/establishments.js` | **NEW** — Business logic |
| `server/services/activities.js` | **NEW** — Business logic |
| `server/schemas/establishments.js` | **NEW** — Validation |
| `server/schemas/activities.js` | **NEW** — Validation |
| `server/index.js` | Remove old endpoints, mount new routers |
| `src/app/pages/ministry/CommercialEstablishmentsManagement.tsx` | Update API paths |
| `src/app/pages/ministry/ActivitiesManagement.tsx` | Update API paths |

### Risk Level: LOW
- Data migration is straightforward (column mapping)
- No critical dependencies

### Rollback Plan
1. Old `/api/commercial-establishments` endpoints remain functional during transition
2. Data migration script is idempotent — can re-run safely

---

## Phase 5: Organizations

### Scope
- Migrate organizations from `organizational_entities` (type='organization')
- Add organization-specific fields (org_type, license_number, founding_date)
- Implement organization-scoped data access
- Add organization member management

### Files to Modify
| File | Change |
|---|---|
| `server/routes/organizations.js` | **NEW** — Organizations domain |
| `server/services/organizations.js` | **NEW** — Business logic |
| `server/schemas/organizations.js` | **NEW** — Validation |
| `src/app/pages/ministry/EnterpriseDashboard.tsx` | Filter by org type |
| `src/app/pages/organization/Dashboard.tsx` | Org-specific dashboard |

### Risk Level: LOW

### Rollback Plan
- Data migration is additive — new columns, no deletions

---

## Phase 6: Trade Unions

### Scope
- Migrate unions from `organizational_entities` (type='union')
- Implement union-specific features (board members, elections, affiliations)
- Link elections to unions
- Add union membership management

### Files to Modify
| File | Change |
|---|---|
| `server/routes/unions.js` | **NEW** — Trade unions domain |
| `server/services/unions.js` | **NEW** — Business logic |
| `server/schemas/unions.js` | **NEW** — Validation |
| `src/app/pages/ministry/UnionsManagementNew.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- Additive migration only

---

## Phase 7: Workers

### Scope
- Merge `worker_profiles` into `workers` entity specialization
- Link workers to employers and occupations
- Add worker employment history
- Add worker skills and certifications
- Implement worker dispatch workflow

### Files to Modify
| File | Change |
|---|---|
| `server/routes/workers.js` | **NEW** — Workers domain |
| `server/services/workers.js` | **NEW** — Business logic |
| `server/schemas/workers.js` | **NEW** — Validation |
| `src/app/pages/ministry/WorkerProfilesManagement.tsx` | Update API paths |

### Risk Level: MEDIUM
- Merging two tables requires careful data migration

### Rollback Plan
- Keep `worker_profiles` table as a view during transition
- Data migration script creates backup table before merge

---

## Phase 8: Occupations

### Scope
- Rename `professions` → `occupations`
- Map existing data to new schema
- Implement ISIC-4 classification linking
- Add occupation search and filtering
- Add career paths and salary ranges

### Files to Modify
| File | Change |
|---|---|
| `server/routes/occupations.js` | **NEW** — Occupations domain |
| `server/services/occupations.js` | **NEW** — Business logic |
| `server/schemas/occupations.js` | **NEW** — Validation |
| `src/app/pages/ministry/ProfessionsManagement.tsx` | Rename to OccupationsManagement |

### Risk Level: LOW
- Table rename is straightforward

### Rollback Plan
- Create view `professions` → `occupations` for backward compatibility

---

## Phase 9: Documents & Licenses

### Scope
- Implement document upload (Supabase Storage or S3)
- Add virus scanning for uploads
- Implement license lifecycle (active → expired → renewed)
- Add license renewal reminders
- Merge `expatriate_licenses` into `licenses`
- Merge `evaluation_certificates` into domain

### Files to Modify
| File | Change |
|---|---|
| `server/routes/documents.js` | **NEW** — Documents domain |
| `server/routes/licenses.js` | **NEW** — Licenses domain |
| `server/services/documents.js` | **NEW** — Upload + storage logic |
| `server/services/licenses.js` | **NEW** — License lifecycle |
| `server/schemas/documents.js` | **NEW** — Validation |
| `server/schemas/licenses.js` | **NEW** — Validation |
| `src/app/pages/ministry/DocumentsManagement.tsx` | Add file upload UI |
| `src/app/pages/ministry/LicensesManagement.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- File upload is new functionality — no existing data to lose
- License merge is additive

---

## Phase 10: Inspections

### Scope
- Implement inspection workflow (schedule → conduct → report → findings → corrective actions)
- Add inspection checklists
- Link inspections to entities
- Add follow-up/re-inspection tracking

### Files to Modify
| File | Change |
|---|---|
| `server/routes/inspections.js` | **NEW** — Inspections domain |
| `server/services/inspections.js` | **NEW** — Business logic |
| `server/schemas/inspections.js` | **NEW** — Validation |
| `src/app/pages/ministry/InspectionsManagement.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- Additive migration

---

## Phase 11: Violations & Compliance

### Scope
- Implement violation lifecycle (reported → investigated → confirmed → penalized → resolved)
- Add compliance alert workflow
- Implement compliance matrix scoring
- Link violations to inspections and entities

### Files to Modify
| File | Change |
|---|---|
| `server/routes/violations.js` | **NEW** — Violations domain |
| `server/routes/compliance.js` | **NEW** — Compliance domain |
| `server/services/violations.js` | **NEW** — Business logic |
| `server/services/compliance.js` | **NEW** — Business logic |
| `src/app/pages/ministry/ViolationsManagement.tsx` | Update API paths |
| `src/app/pages/ministry/ComplianceAlertsManagement.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- Additive migration

---

## Phase 12: Risk & Legal

### Scope
- Implement risk assessment workflow
- Add risk scoring algorithm
- Migrate legal references to unified domain
- Add ILO conventions and international standards
- Add labor dispute tracking

### Files to Modify
| File | Change |
|---|---|
| `server/routes/risk.js` | **NEW** — Risk domain |
| `server/routes/legal.js` | **NEW** — Legal domain |
| `server/services/risk.js` | **NEW** — Business logic |
| `server/services/legal.js` | **NEW** — Business logic |
| `src/app/pages/ministry/RiskAssessmentsManagement.tsx` | Update API paths |
| `src/app/pages/ministry/LegalReferencesManagement.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- Additive migration

---

## Phase 13: Services & Applications

### Scope
- Implement service catalog
- Add application lifecycle (submitted → reviewed → approved/rejected → completed)
- Link services to entities
- Add application tracking

### Files to Modify
| File | Change |
|---|---|
| `server/routes/services.js` | **NEW** — Services domain |
| `server/routes/applications.js` | **NEW** — Applications domain |
| `server/services/services.js` | **NEW** — Business logic |
| `server/services/applications.js` | **NEW** — Business logic |
| `src/app/pages/ministry/ServicesManagement.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- Additive migration

---

## Phase 14: Workforce & Dispatches

### Scope
- Implement worker dispatch workflow
- Add reduction request workflow
- Link dispatches to workers and establishments
- Add dispatch monitoring and evaluation

### Files to Modify
| File | Change |
|---|---|
| `server/routes/workforce.js` | **NEW** — Workforce domain |
| `server/services/workforce.js` | **NEW** — Business logic |
| `src/app/pages/ministry/DispatchesManagement.tsx` | Update API paths |
| `src/app/pages/ministry/ReductionRequestsManagement.tsx` | Update API paths |

### Risk Level: MEDIUM
- Dispatch workflow has complex state transitions

### Rollback Plan
- Keep old endpoints functional during transition

---

## Phase 15: Training & Certification

### Scope
- Implement training record management
- Add certification tracking
- Add training type classification
- Link training to workers and organizations

### Files to Modify
| File | Change |
|---|---|
| `server/routes/training.js` | **NEW** — Training domain |
| `server/services/training.js` | **NEW** — Business logic |
| `src/app/pages/ministry/TrainingRecordsManagement.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- Additive migration

---

## Phase 16: Financial & Fee Payments

### Scope
- Implement fee payment processing
- Add invoice generation
- Add payment reconciliation
- Add financial reporting

### Files to Modify
| File | Change |
|---|---|
| `server/routes/financial.js` | **NEW** — Financial domain |
| `server/services/financial.js` | **NEW** — Business logic |
| `src/app/pages/ministry/FeePaymentsManagement.tsx` | Update API paths |

### Risk Level: LOW

### Rollback Plan
- Additive migration

---

## Phase 17: Notifications & Messaging

### Scope
- Implement notification delivery (in-app + email)
- Add notification templates
- Add notification preferences per user
- Add email integration (Nodemailer/Resend)

### Files to Modify
| File | Change |
|---|---|
| `server/routes/notifications.js` | **NEW** — Notifications domain |
| `server/services/notifications.js` | **NEW** — Delivery logic |
| `server/services/email.js` | **NEW** — Email integration |
| `src/app/pages/ministry/NotificationsManagement.tsx` | Update API paths |

### Risk Level: MEDIUM
- Email integration requires external service configuration

### Rollback Plan
- Email delivery is new functionality — no existing data to lose
- In-app notifications already exist (just no delivery mechanism)

---

## Phase 18: Reporting Engine

### Scope
- Implement report generation service
- Add PDF report templates
- Add Excel export for all domains
- Add scheduled report generation (cron)
- Add report distribution (email)

### Files to Modify
| File | Change |
|---|---|
| `server/services/reports.js` | **NEW** — Report generation |
| `server/services/pdf.js` | **NEW** — PDF template engine |
| `server/services/excel.js` | **NEW** — Excel export |
| `server/scheduler/reports.js` | **NEW** — Cron-based scheduling |
| `src/app/pages/ministry/ReportsManagement.tsx` | Update to new report API |

### Risk Level: MEDIUM
- PDF templates need ministry branding design

### Rollback Plan
- Report generation is new functionality
- Old manual reports remain available

---

## Phase 19: Workflow Engine

### Scope
- Implement workflow state machine
- Add workflow definitions (JSON config)
- Add workflow API (start, transition, complete)
- Add approval workflow
- Add notification triggers on state changes

### Files to Modify
| File | Change |
|---|---|
| `server/services/workflow.js` | **NEW** — State machine engine |
| `server/routes/workflows.js` | **NEW** — Workflow API |
| `server/workflows/` | **NEW** — Workflow definitions |
| `database/migrations/xxx_workflows.sql` | **NEW** — Workflow tables |

### Risk Level: HIGH
- Workflow engine is complex infrastructure
- Affects all entity lifecycle management

### Rollback Plan
- Workflow engine starts in "shadow mode" — runs alongside existing manual status changes
- Can disable via feature flag

---

## Phase 20: AI Integration

### Scope
- Set up Python AI microservice
- Implement risk prediction model
- Implement compliance scoring
- Implement anomaly detection
- Implement NLP search (Arabic)
- Add AI results caching

### Files to Modify
| File | Change |
|---|---|
| `ai-service/` | **NEW** — Python microservice |
| `ai-service/models/risk.py` | **NEW** — Risk prediction |
| `ai-service/models/compliance.py` | **NEW** — Compliance scoring |
| `ai-service/models/anomaly.py` | **NEW** — Anomaly detection |
| `ai-service/models/nlp.py` | **NEW** — Arabic NLP search |
| `server/routes/ai.js` | **NEW** — AI API proxy |
| `server/services/ai.js` | **NEW** — AI service client |

### Risk Level: HIGH
- ML models require training data
- Arabic NLP requires specialized libraries

### Rollback Plan
- AI features start in "shadow mode" — generate results but don't display
- Can disable via feature flag

---

## Phase 21: Frontend Refactor

### Scope
- Update all API calls to `/api/v1/*` paths
- Add JWT token management (storage, refresh, attachment)
- Add role-based UI rendering (hide/show features per role)
- Add file upload UI components
- Add workflow UI (status transitions, approval buttons)
- Add i18n (Arabic + English)
- Refactor page components to use new domain structure

### Files to Modify
| File | Change |
|---|---|
| `src/app/contexts/AuthContext.tsx` | Add JWT management |
| `src/app/hooks/useApi.ts` | Add JWT headers, token refresh |
| `src/app/components/layouts/RootLayoutNew.tsx` | Role-based menu rendering |
| `src/app/pages/ministry/*.tsx` | Update all API paths (31 files) |
| `src/app/pages/organization/*.tsx` | Update all API paths (5 files) |
| `src/app/lib/i18n.ts` | **NEW** — i18n configuration |
| `src/app/locales/` | **NEW** — Translation files |

### Risk Level: MEDIUM
- Large number of files to update
- JWT integration affects all API calls

### Rollback Plan
- Frontend can toggle between old/new API via feature flag
- i18n is additive — Arabic remains default

---

## Phase 22: Testing & QA

### Scope
- Write unit tests for all domain services
- Write integration tests for all API endpoints
- Write E2E tests for critical workflows
- Add test coverage reporting
- Fix all identified bugs

### Files to Modify
| File | Change |
|---|---|
| `server/__tests__/*.test.js` | **NEW** — Backend tests |
| `src/__tests__/*.test.tsx` | **NEW** — Frontend tests |
| `src/__tests__/e2e/*.test.ts` | **NEW** — E2E tests |
| `vitest.config.ts` | Update test configuration |

### Risk Level: LOW

### Rollback Plan
- Tests are additive — no production impact

---

## Phase 23: Deployment & CI/CD

### Scope
- Set up GitHub Actions CI/CD pipeline
- Add automated lint, type-check, test, build
- Add staging environment
- Add production deployment automation
- Add health monitoring and alerting
- Add structured logging (winston/pino)

### Files to Modify
| File | Change |
|---|---|
| `.github/workflows/ci.yml` | **NEW** — CI pipeline |
| `.github/workflows/deploy.yml` | **NEW** — CD pipeline |
| `server/middleware/logging.js` | **NEW** — Structured logging |
| `server/middleware/health.js` | **NEW** — Health monitoring |
| `vercel.json` | Update for new architecture |

### Risk Level: MEDIUM
- CI/CD setup affects deployment process

### Rollback Plan
- Old deployment process remains available
- CI/CD starts with non-blocking checks

---

## Risk Summary

| Risk Level | Phases | Count |
|---|---|---|
| **High** | 2, 19, 20 | 3 |
| **Medium** | 1, 3, 14, 17, 18, 21, 23 | 7 |
| **Low** | 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 22 | 12 |
| **None** | 0 | 1 |

## Critical Path

```
Phase 0 (DONE) → Phase 1 → Phase 2 → Phase 3 → Phase 21 (Frontend)
                                ↓
                          Phase 4-20 (Domain implementation)
                                ↓
                          Phase 22 (Testing) → Phase 23 (Deploy)
```

**Phase 2 (Security) is the critical gate** — all subsequent phases depend on having auth/RBAC in place.

---

## Estimated Timeline

| Phase Group | Weeks | Cumulative |
|---|---|---|
| Phase 0: Discovery | 1 | Week 1 ✅ |
| Phase 1-2: Foundation | 4 | Week 5 |
| Phase 3-8: Core Domains | 6 | Week 11 |
| Phase 9-17: Supporting Domains | 9 | Week 20 |
| Phase 18-20: Advanced Features | 7 | Week 27 |
| Phase 21-23: Frontend + Testing + Deploy | 7 | Week 34 |

**Total estimated duration: ~34 weeks (8.5 months)**
