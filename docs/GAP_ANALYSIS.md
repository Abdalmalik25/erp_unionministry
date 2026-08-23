# Gap Analysis — UnionSphere Enterprise

**Assessment Date:** 2026-08-20
**Purpose:** Identify missing domains, workflows, AI features, and reporting capabilities vs. a full ministry-grade labor/union management platform.

---

## 1. Missing Domains (Completely Absent)

| Domain | Expected Capability | Current State |
|---|---|---|
| **User Management & RBAC** | User registration, role assignment, permission matrix, password reset, account lockout | Only a `profiles` table with a `role` field. No user registration flow, no password management, no permission enforcement. |
| **Authentication Server** | JWT issuance, refresh tokens, session server-side storage, OAuth2/OIDC | Auth is client-side only via Supabase (placeholder) and demo credentials. No server-side auth. |
| **File Upload & Storage** | Document upload (PDF, images), virus scanning, storage (S3/Supabase Storage), access control | `file_url` fields accept arbitrary URLs. No upload endpoints, no storage integration. |
| **Notifications / Messaging** | Email notifications, SMS, push notifications, in-app message queue | `notifications` table exists but no sending mechanism. No email/SMS provider integration. |
| **Workflow / Approval Engine** | Multi-step approval workflows (e.g., inspection → approval → certificate), status machine | Every entity has a `status` field but no workflow engine. State transitions are manual API calls. |
| **Calendar / Scheduling** | Inspection scheduling, training calendar, license expiry reminders | Date fields exist (`inspection_date`, `next_inspection_date`, `expiry_date`) but no scheduling engine or reminders. |
| **Audit Trail (Server-side)** | Server-recorded audit logs with IP, user, timestamp, before/after values | Client-side audit via `security.ts` → `POST /api/audit-log`. Server stores what the client sends — no independent server-side audit. |
| **Internationalization (i18n)** | Full RTL/LTR switching, translation files, locale detection | Arabic-only UI. No i18n framework, no translation files. |
| **Backup / Disaster Recovery** | Automated backups, point-in-time recovery, restore procedures | No backup mechanism in application code. Database backups depend on Neon infrastructure only. |
| **Multi-tenancy** | Data isolation between organizations, cross-tenant query prevention | `organizationId` exists on User type but is never enforced in API queries. All data is globally visible. |

---

## 2. Missing Workflows

| Workflow | Expected | Current |
|---|---|---|
| **Entity Registration** | Multi-step: application → document review → approval → registration number assignment → license issuance | Single `POST /api/entities` — direct insert, no workflow. |
| **Inspection Lifecycle** | Schedule → prepare → conduct → report → findings → corrective actions → re-inspection | Manual CRUD. No lifecycle state machine, no linked corrective action tracking. |
| **Violation Processing** | Detection → classification → notification → corrective action → resolution → follow-up | `violations` table has `status` field but no automated state transitions or notifications. |
| **License Renewal** | Expiry reminder → renewal application → review → renewal/rejection → updated certificate | `licenses` has `renewal_status` but no automated reminders or renewal workflow. |
| **Member Onboarding** | Application → verification → approval → fee collection → card issuance → training | Single INSERT. No onboarding steps, no verification workflow. |
| **Worker Dispatch** | Request → approval → safety briefing → dispatch → monitoring → return → evaluation | `worker_dispatches` has `safety_briefing_done` and `medical_clearance_done` but no enforcement or workflow. |
| **Training Certification** | Training delivery → assessment → certification → renewal tracking → compliance check | `training_records` exists but no automated certification tracking or renewal reminders. |
| **Compliance Alert Resolution** | Alert generation → assignment → investigation → resolution → verification → closure | `compliance_alerts` has `is_resolved` but no assignment workflow or escalation. |
| **Fee Payment Processing** | Invoice generation → payment → receipt → reconciliation → reporting | `fee_payments` table but no invoice generation, no reconciliation workflow. |
| **Report Generation** | Scheduled reports, automated data collection, multi-format export, distribution | `ReportsManagement.tsx` fetches data and renders charts. No scheduled reports, no automated distribution. |

---

## 3. Missing AI Features

Despite `VITE_ENABLE_AI_FEATURES=true` in `.env`:

| AI Feature | Expected | Current |
|---|---|---|
| **Risk Prediction** | ML model to predict entity risk levels based on historical data (violations, inspections, member count) | `risk_level` is a manually set field on entities. No prediction model. |
| **Compliance Scoring** | Automated compliance score calculation from inspection data, violation history, license status | `compliance_status` is a manually set enum. No automated scoring algorithm. |
| **Anomaly Detection** | Detect unusual patterns: sudden member drops, payment anomalies, violation spikes | No anomaly detection. All data is manually entered and manually reviewed. |
| **Natural Language Search** | Arabic NLP-powered search across entities, laws, regulations | Basic `ILIKE` text search only. No NLP, no Arabic language processing. |
| **Document Classification** | Auto-classify uploaded documents using OCR/ML | No document upload, no OCR, no classification. |
| **Predictive Analytics** | Forecast inspection needs, predict license expirations, trend analysis | `ReportsManagement.tsx` shows static charts. No forecasting, no trend prediction. |
| **Chatbot / Assistant** | AI-powered assistant for legal references, compliance guidance | No chatbot, no AI assistant. |
| **Automated Report Generation** | AI-generated summary reports with insights and recommendations | Reports are manually configured in the UI. No AI generation. |
| **Smart Notifications** | AI-prioritized notifications based on urgency and relevance | `notifications` table exists but no priority logic, no AI ranking. |
| **Data Quality Scoring** | AI-assessed data completeness and accuracy scores per entity | No data quality metrics. |

---

## 4. Missing Reporting Capabilities

| Capability | Expected | Current |
|---|---|---|
| **Scheduled Reports** | Auto-generate daily/weekly/monthly reports, email distribution | Only on-demand manual generation in `ReportsManagement.tsx`. |
| **PDF Report Templates** | Ministry-branded PDF templates with logos, headers, footers | `exportReportToPDF` exists but uses basic `jspdf`. No branded templates. |
| **Comparative Analysis** | Year-over-year, entity-vs-entity, governorate-vs-governorate comparisons | No comparative reporting. Static data display only. |
| **KPI Dashboards** | Real-time KPIs with targets, thresholds, trend indicators | `DashboardNewEnhanced.tsx` shows counts. No KPI targets, no trend indicators. |
| **Geographic Reporting** | Governorate-level maps, regional heatmaps | `governorate` field exists on entities but no geographic visualization. |
| **Drill-down Reports** | Interactive reports: click entity → see members → see violations → see inspections | No drill-down. Flat data tables only. |
| **Export Formats** | Excel, PDF, CSV, JSON export for all data domains | `exportReportToExcel` and `exportReportToPDF` exist in `PrintExportManager` but only for the reports page. |
| **Audit Report** | Server-generated audit trail report with user actions, timestamps | Audit log stored in `localStorage` + `audit_log` table. No audit report generation. |
| **Compliance Report** | Automated compliance status report per entity with checklist | `ComplianceMatricesManagement.tsx` shows matrices but no automated compliance report. |
| **Financial Report** | Revenue reports, outstanding fees, payment reconciliation | `FeePaymentsManagement.tsx` shows payments. No financial summaries or reconciliation reports. |
| **What-If Analysis** | Scenario modeling: impact of adding/removing members, changing classifications | No scenario modeling capability. |

---

## 5. Infrastructure Gaps

| Gap | Detail |
|---|---|
| **No CI/CD pipeline** | No GitHub Actions, no automated testing, no deployment automation. |
| **No environment separation** | Single `.env` file. No dev/staging/production separation. |
| **No health monitoring** | `/health` endpoint exists but no uptime monitoring, alerting, or APM. |
| **No logging framework** | `console.log`/`console.error` only. No structured logging (winston, pino). |
| **No API versioning** | All endpoints at `/api/*`. No version prefix (`/api/v1/`). |
| **No OpenAPI/Swagger** | No API documentation generation. |
| **No database migrations** | `scripts/migrate-sql.js` exists but no versioned migration system (knex, prisma, drizzle). |
| **No test suite** | `vitest` is configured but no test files exist in the project. |

---

## 6. Priority Recommendations

### Immediate (Week 1-2)
1. **Add server-side auth middleware** — Critical for any deployment.
2. **Rotate all credentials** — `.env` is compromised.
3. **Fix CORS** — Replace `origin: true` with explicit allowlist.
4. **Add input validation** — Install `zod` or `joi`, validate all POST/PUT bodies.

### Short-term (Month 1)
5. **Implement RBAC middleware** — Role + resource ownership checks.
6. **Add server-side rate limiting** — `express-rate-limit` on all endpoints.
7. **Set up CI/CD** — GitHub Actions with lint, type-check, test, build.
8. **Add database migrations** — Version-controlled schema changes.

### Medium-term (Month 2-3)
9. **Build workflow engine** — State machine for entity lifecycle, inspections, violations.
10. **Implement file upload** — Supabase Storage or S3 with virus scanning.
11. **Add i18n** — Arabic/English switching with translation files.
12. **Build notification system** — Email (Nodemailer/Resend) + in-app notifications.

### Long-term (Month 3-6)
13. **Integrate AI features** — Risk prediction, compliance scoring, NLP search.
14. **Build scheduled reporting** — Cron-based report generation and email distribution.
15. **Add multi-tenancy** — Row-level security, tenant isolation.
16. **Implement audit trail** — Server-side audit logging independent of client input.

---

## Summary Matrix

| Category | Current Coverage | Gap Severity |
|---|---|---|
| Authentication | Client-side only, placeholder Supabase | **CRITICAL** |
| Authorization | None | **CRITICAL** |
| Input Validation | Whitelist columns only, no schema validation | **HIGH** |
| Secret Management | Credentials in `.env` committed to git | **CRITICAL** |
| Rate Limiting | Client-side only (localStorage) | **HIGH** |
| Workflows | Manual CRUD, no state machines | **HIGH** |
| AI Features | Feature flag enabled, zero implementation | **HIGH** |
| Reporting | Basic on-demand charts, no scheduling | **MEDIUM** |
| File Upload | None | **MEDIUM** |
| i18n | Arabic-only | **MEDIUM** |
| Testing | Framework installed, zero tests | **HIGH** |
| CI/CD | None | **HIGH** |
| Monitoring | Basic `/health` only | **MEDIUM** |
