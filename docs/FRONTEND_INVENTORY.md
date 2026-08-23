# Frontend Inventory — UnionSphere

> Auto-generated comprehensive discovery of the frontend architecture.
> Platform: UnionSphere — Yemen Ministry of Social Affairs & Labor
> Last updated: 2026-08-20

---

## Table of Contents

1. [Route Map](#1-route-map)
2. [Sidebar Structure](#2-sidebar-structure)
3. [Ministry Pages Inventory](#3-ministry-pages-inventory)
4. [Organization Pages Inventory](#4-organization-pages-inventory)
5. [Duplicate / Overlapping Pages](#5-duplicate--overlapping-pages)
6. [Shared UI Components](#6-shared-ui-components)
7. [Shared Hooks](#7-shared-hooks)
8. [Shared Utilities](#8-shared-utilities)
9. [Authentication Flow](#9-authentication-flow)
10. [State Management](#10-state-management)
11. [TypeScript Status](#11-typescript-status)
12. [Architecture Patterns](#12-architecture-patterns)

---

## 1. Route Map

File: `src/app/routes.tsx`

### Top-Level Routes

| Path | Component | Loading | Guard |
|---|---|---|---|
| `/` | `Login` | Eager | None |
| `/ministry` | `MinistryRoutes` → `RootLayout` | Lazy children | `ProtectedRoute(requireMinistry)` |
| `/organization` | `OrganizationRoutes` → `RootLayout` | Lazy children | `ProtectedRoute(requireOrganization)` |
| `/create-demo-users` | `CreateDemoUsers` | Eager | Conditional (`VITE_ENABLE_DEMO_MODE=true`) |
| `*` | `NotFound` | Lazy | None |

### Ministry Child Routes (`/ministry/*`)

| Path | Lazy Component | Import Source |
|---|---|---|
| `/ministry` (index) | `MinistryDashboard` | `pages/ministry/DashboardNewEnhanced` |
| `/ministry/enterprise` | `EnterpriseDashboard` | `pages/ministry/EnterpriseDashboard` |
| `/ministry/commercial` | `CommercialEstablishmentsManagement` | `pages/ministry/CommercialEstablishmentsManagement` |
| `/ministry/unions` | `UnionsManagement` | `pages/ministry/UnionsManagementNew` |
| `/ministry/members` | `MembersManagement` | `pages/ministry/MembersManagementNew` |
| `/ministry/elections` | `ElectionsManagement` | `pages/ministry/ElectionsManagement` |
| `/ministry/activities` | `ActivitiesManagement` | `pages/ministry/ActivitiesManagement` |
| `/ministry/documents` | `DocumentsManagement` | `pages/ministry/DocumentsManagement` |
| `/ministry/services` | `ServicesManagement` | `pages/ministry/ServicesManagement` |
| `/ministry/violations` | `ViolationsManagement` | `pages/ministry/ViolationsManagement` |
| `/ministry/reports` | `ReportsManagement` | `pages/ministry/ReportsManagement` |
| `/ministry/audit` | `AuditLog` | `pages/ministry/AuditLog` |
| `/ministry/dispatches` | `DispatchesManagement` | `pages/ministry/DispatchesManagement` |
| `/ministry/reduction-requests` | `ReductionRequestsManagement` | `pages/ministry/ReductionRequestsManagement` |
| `/ministry/isic4` | `ISIC4Management` | `pages/ministry/ISIC4Management` |
| `/ministry/compliance-alerts` | `ComplianceAlertsManagement` | `pages/ministry/ComplianceAlertsManagement` |
| `/ministry/fee-payments` | `FeePaymentsManagement` | `pages/ministry/FeePaymentsManagement` |
| `/ministry/worker-profiles` | `WorkerProfilesManagement` | `pages/ministry/WorkerProfilesManagement` |
| `/ministry/professions` | `ProfessionsManagement` | `pages/ministry/ProfessionsManagement` |
| `/ministry/inspections` | `InspectionsManagement` | `pages/ministry/InspectionsManagement` |
| `/ministry/evaluation-certificates` | `EvaluationCertificatesManagement` | `pages/ministry/EvaluationCertificatesManagement` |
| `/ministry/licenses` | `LicensesManagement` | `pages/ministry/LicensesManagement` |
| `/ministry/training-records` | `TrainingRecordsManagement` | `pages/ministry/TrainingRecordsManagement` |
| `/ministry/board-members` | `BoardMembersManagement` | `pages/ministry/BoardMembersManagement` |
| `/ministry/notifications` | `NotificationsManagement` | `pages/ministry/NotificationsManagement` |
| `/ministry/labor-disputes` | `LaborDisputesManagement` | `pages/ministry/LaborDisputesManagement` |
| `/ministry/expatriate-licenses` | `ExpatriateLicensesManagement` | `pages/ministry/ExpatriateLicensesManagement` |
| `/ministry/legal-references` | `LegalReferencesManagement` | `pages/ministry/LegalReferencesManagement` |
| `/ministry/risk-assessments` | `RiskAssessmentsManagement` | `pages/ministry/RiskAssessmentsManagement` |
| `/ministry/compliance-matrices` | `ComplianceMatricesManagement` | `pages/ministry/ComplianceMatricesManagement` |
| `/ministry/maturity-assessments` | `MaturityAssessmentsManagement` | `pages/ministry/MaturityAssessmentsManagement` |
| `/ministry/profile` | `Profile` | `pages/Profile` |

### Organization Child Routes (`/organization/*`)

| Path | Lazy Component | Import Source |
|---|---|---|
| `/organization` (index) | `OrganizationDashboard` | `pages/organization/Dashboard` |
| `/organization/members` | `OrgMembersManagement` | `pages/organization/MembersManagement` |
| `/organization/activities` | `OrgActivitiesManagement` | `pages/organization/ActivitiesManagement` |
| `/organization/documents` | `OrgDocumentsManagement` | `pages/organization/DocumentsManagement` |
| `/organization/services` | `OrgServicesManagement` | `pages/organization/ServicesManagement` |
| `/organization/profile` | `Profile` | `pages/Profile` (shared) |

---

## 2. Sidebar Structure

File: `src/app/components/layouts/RootLayoutNew.tsx`

The sidebar renders different menus based on `user.userType` (ministry vs organization).

### Ministry Sidebar (28 items)

| # | Icon | Label (AR) | Route |
|---|---|---|---|
| 1 | `LayoutDashboard` | لوحة التحكم | `/ministry` |
| 2 | `Building2` | إدارة الكيانات | `/ministry/enterprise` |
| 3 | `Users` | النقابات | `/ministry/unions` |
| 4 | `Users` | الأعضاء | `/ministry/members` |
| 5 | `Vote` | الانتخابات | `/ministry/elections` |
| 6 | `Activity` | الأنشطة | `/ministry/activities` |
| 7 | `FileText` | الوثائق | `/ministry/documents` |
| 8 | `Briefcase` | الخدمات | `/ministry/services` |
| 9 | `AlertTriangle` | المخالفات | `/ministry/violations` |
| 10 | `Send` | إرساليات العمال | `/ministry/dispatches` |
| 11 | `MinusCircle` | طلبات التخفيض | `/ministry/reduction-requests` |
| 12 | `FolderTree` | تصنيف ISIC-4 | `/ministry/isic4` |
| 13 | `Shield` | تنبيهات الامتثال | `/ministry/compliance-alerts` |
| 14 | `DollarSign` | الدفع والرسوم | `/ministry/fee-payments` |
| 15 | `Users` | ملفات العمال | `/ministry/worker-profiles` |
| 16 | `Briefcase` | المهن والتحليل | `/ministry/professions` |
| 17 | `ClipboardCheck` | التفتيش الدوري | `/ministry/inspections` |
| 18 | `Award` | شهادات التقييم | `/ministry/evaluation-certificates` |
| 19 | `BadgeCheck` | التراخيص | `/ministry/licenses` |
| 20 | `GraduationCap` | التدريب | `/ministry/training-records` |
| 21 | `Users` | أعضاء المجالس | `/ministry/board-members` |
| 22 | `Bell` | الإشعارات | `/ministry/notifications` |
| 23 | `Scale` | النزاعات العمالية | `/ministry/labor-disputes` |
| 24 | `Globe` | تراخيص الأجانب | `/ministry/expatriate-licenses` |
| 25 | `BookOpen` | المراجع القانونية | `/ministry/legal-references` |
| 26 | `AlertTriangle` | تقييم المخاطر | `/ministry/risk-assessments` |
| 27 | `ClipboardCheck` | مصفوفات الامتثال | `/ministry/compliance-matrices` |
| 28 | `TrendingUp` | تقييم النضج | `/ministry/maturity-assessments` |

Plus 2 extra footer items: **التقارير** (`/ministry/reports`) and **سجل التدقيق** (`/ministry/audit`).

### Organization Sidebar (5 items)

| # | Icon | Label (AR) | Route |
|---|---|---|---|
| 1 | `LayoutDashboard` | لوحة التحكم | `/organization` |
| 2 | `Users` | الأعضاء | `/organization/members` |
| 3 | `Activity` | الأنشطة | `/organization/activities` |
| 4 | `FileText` | الوثائق | `/organization/documents` |
| 5 | `Briefcase` | الخدمات | `/organization/services` |

### Layout Features
- **Collapsible sidebar**: 256px expanded, 80px collapsed
- **Top bar**: Title, notifications dropdown, user menu, theme toggle
- **Global overlays**: `CommandPalette`, `OfflineWarning`, `SessionTimeoutWarning`, `ConfirmDialog`
- **Footer**: Version 1.0.0, "UnionSphere" branding
- **RTL direction**: `dir="rtl"` on root div

---

## 3. Ministry Pages Inventory

31 files in `src/app/pages/ministry/`.

### 1. `DashboardNewEnhanced.tsx` — MinistryDashboard
- **Export**: `DashboardNewEnhanced` (named)
- **Features**: Stats cards, line/bar/pie charts (recharts), quick actions, entity list, time-range filtering
- **Key imports**: `recharts`, `useOffline` context, `StatusBadge`, `exportReportToExcel`
- **API calls**: Fetches dashboard stats, entities, violations, etc.
- **Lines**: 342

### 2. `EnterpriseDashboard.tsx` — EnterpriseManagementPage
- **Export**: `default` (EnterpriseManagementPage)
- **Features**: Grid/tree/kanban/map/graph view modes, entity CRUD, KPIs panel, dynamic entity form
- **Key imports**: `useApi` hook, `EnterpriseDashboard`, `EntityTreeView`, `DynamicEntityForm`, entity types
- **API calls**: Uses `useApi` for entity operations
- **Lines**: 312

### 3. `CommercialEstablishmentsManagement.tsx`
- **Export**: `CommercialEstablishmentsManagement` (named)
- **Features**: CRUD, sector/classification/status filters, search, Excel export
- **Key imports**: `StatusBadge`, `EmptyState`, `PageHeader`, `Button`, `Input`, `Modal`, `logAudit`
- **API calls**: `fetch('/api/commercial-establishments')`
- **Lines**: 240

### 4. `UnionsManagementNew.tsx`
- **Export**: `UnionsManagementNew` (named)
- **Features**: Full CRUD, detailed profile view, export to Excel, audit logging
- **Key imports**: `toast`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/unions')`
- **Lines**: 432

### 5. `MembersManagementNew.tsx`
- **Export**: `MembersManagement` (named)
- **Features**: CRUD, entity dropdown, status filtering, Excel export, inline validation
- **Key imports**: `Card`, `Button`, `Input`, `SimpleSelect`, `Modal`, `EmptyState`, `PageHeader`
- **API calls**: `fetch('/api/members')`, `fetch('/api/entities')`
- **Lines**: 357

### 6. `ElectionsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, election status workflow (planned→ongoing→completed), voter stats, pagination
- **Key imports**: `PageHeader`, `StatusBadge`, `EmptyState`, `FilterBar`, `ActionButtons`, `useConfirm`, `useFormValidation`, `useApi`
- **API calls**: Uses `useApi` hook
- **Lines**: 800

### 7. `ActivitiesManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, 11 activity types, grid/list views, status workflow, pagination
- **Key imports**: `PageHeader`, `StatusBadge`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/activities')`
- **Lines**: 1008

### 8. `DocumentsManagement.tsx`
- **Export**: `DocumentsManagement` (named)
- **Features**: Document lifecycle (draft→review→approve/reject), file metadata, tags
- **Key imports**: `StatusBadge`, `PageHeader`, `useConfirm`, `useApi`, `logAudit`
- **API calls**: Uses `useApi` hook
- **Lines**: 597

### 9. `ServicesManagement.tsx`
- **Export**: `ServicesManagement` (named)
- **Features**: Service request CRUD, status workflow, services catalog modal
- **Key imports**: `StatusBadge`, `EmptyState`, `FilterBar`, `Button`, `Modal`, `Input`, `PageHeader`
- **API calls**: `fetch('/api/service-requests')`, `fetch('/api/services')`
- **Lines**: 276

### 10. `ViolationsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, severity levels, violation type taxonomy, penalty tracking, pagination
- **Key imports**: `PageHeader`, `StatusBadge`, `EmptyState`, `FilterBar`, `ActionButtons`, `useConfirm`, `useApi`
- **API calls**: Uses `useApi` hook
- **Lines**: 1072

### 11. `ReportsManagement.tsx`
- **Export**: `ReportsManagement` (named)
- **Features**: 14 report types, bar/pie charts (recharts), date & governorate filters, Excel/PDF export
- **Key imports**: `recharts`, `PageHeader`, `logAudit`, `exportReportToExcel`, `exportReportToPDF`
- **API calls**: Fetches all data sources for report generation
- **Lines**: 539

### 12. `AuditLog.tsx`
- **Export**: `AuditLog` (named)
- **Features**: Read-only audit trail, pagination, action/resource filtering, Excel export
- **Key imports**: `PageHeader`, `EmptyState`
- **API calls**: `fetch('/api/audit-log?...')`
- **Lines**: 191

### 13. `DispatchesManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, dispatch status workflow, date tracking, entity/worker selection, pagination
- **Key imports**: `PageHeader`, `StatusBadge`, `EmptyState`, `FilterBar`, `ActionButtons`, `useConfirm`
- **API calls**: `fetch('/api/dispatches')`
- **Lines**: 1214

### 14. `ReductionRequestsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, 6-status workflow (Arabic labels), approval chain tracking
- **Key imports**: `PageHeader`, `EmptyState`, `useConfirm`, `logAudit`
- **API calls**: `fetch('/api/reduction-requests')`
- **Lines**: 351

### 15. `ISIC4Management.tsx`
- **Export**: `default`
- **Features**: Hierarchical ISIC-4 classification browser, expandable sections, sector icons
- **Key imports**: `PageHeader`
- **API calls**: `fetch('/api/isic-classifications')`
- **Lines**: 207

### 16. `ComplianceAlertsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, severity levels (info/warning/critical), acknowledge/resolve workflow
- **Key imports**: `PageHeader`, `StatusBadge`, `EmptyState`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/compliance-alerts')`
- **Lines**: 299

### 17. `FeePaymentsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, payment methods (cash/transfer/check/card/online), status tracking
- **Key imports**: `PageHeader`, `EmptyState`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/fee-payments')`
- **Lines**: 252

### 18. `WorkerProfilesManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, skills/certifications arrays, medical check dates, compliance score
- **Key imports**: `PageHeader`, `EmptyState`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/worker-profiles')`
- **Lines**: 258

### 19. `ProfessionsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, ISCO-08 classification, salary ranges, sector taxonomy, pagination
- **Key imports**: `PageHeader`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/professions')`
- **Lines**: 438

### 20. `InspectionsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, multi-score evaluation (labor/safety/training/yemenization/management/documentation), pagination
- **Key imports**: `PageHeader`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/inspections')`
- **Lines**: 456

### 21. `EvaluationCertificatesManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, compliance score breakdown, certificate lifecycle
- **Key imports**: `PageHeader`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/evaluation-certificates')`
- **Lines**: 403

### 22. `LicensesManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, 7 license types, renewal tracking, status management
- **Key imports**: `PageHeader`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/licenses')`
- **Lines**: 336

### 23. `TrainingRecordsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, 8 training types, trainer info, pass rate, certification flag
- **Key imports**: `PageHeader`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/training-records')`
- **Lines**: 362

### 24. `BoardMembersManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, 5 board positions with color coding, term tracking, pagination
- **Key imports**: `PageHeader`, `useConfirm`, `useApi`, `logAudit`, `exportReportToExcel`
- **API calls**: Uses `useApi` hook
- **Lines**: 655

### 25. `NotificationsManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, 4 notification types, priority levels, read/unread management
- **Key imports**: `PageHeader`, `useConfirm`, `useApi`, `logAudit`, `exportReportToExcel`
- **API calls**: Uses `useApi` hook
- **Lines**: 592

### 26. `LaborDisputesManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, dispute status workflow, compensation tracking, entity selection
- **Key imports**: `PageHeader`, `useConfirm`, `useApi`, `logAudit`, `exportReportToExcel`
- **API calls**: Uses `useApi` hook
- **Lines**: 714

### 27. `ExpatriateLicensesManagement.tsx`
- **Export**: `default`
- **Features**: CRUD, nationality/passport tracking, sponsor info, pagination
- **Key imports**: `PageHeader`, `useConfirm`, `useApi`, `logAudit`, `exportReportToExcel`
- **API calls**: Uses `useApi` hook
- **Lines**: 698

### 28. `LegalReferencesManagement.tsx`
- **Export**: `LegalReferencesManagement` (named)
- **Features**: 4-tab interface (Legal refs, Law articles, ILO conventions, International standards), CRUD per tab
- **Key imports**: `PageHeader`, `EmptyState`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/legal-references')`
- **Lines**: 308

### 29. `RiskAssessmentsManagement.tsx`
- **Export**: `RiskAssessmentsManagement` (named)
- **Features**: CRUD, likelihood × impact scoring, 4 risk levels, mitigation plans
- **Key imports**: `PageHeader`, `EmptyState`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/risk-assessments')`, `fetch('/api/entities')`
- **Lines**: 289

### 30. `ComplianceMatricesManagement.tsx`
- **Export**: `ComplianceMatricesManagement` (named)
- **Features**: CRUD, compliance status per article, enterprise/occupation cross-reference
- **Key imports**: `PageHeader`, `EmptyState`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/compliance-matrices')`, `fetch('/api/entities')`
- **Lines**: 255

### 31. `MaturityAssessmentsManagement.tsx`
- **Export**: `MaturityAssessmentsManagement` (named)
- **Features**: CRUD, 7-dimension scoring, A–F grading, red flags tracking
- **Key imports**: `PageHeader`, `EmptyState`, `useConfirm`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/maturity-assessments')`, `fetch('/api/entities')`
- **Lines**: 300

---

## 4. Organization Pages Inventory

5 files in `src/app/pages/organization/`.

### 1. `Dashboard.tsx` — OrganizationDashboard
- **Export**: `OrganizationDashboard` (named)
- **Features**: Stats cards, recent activities list, pending services, bar chart
- **Key imports**: `recharts`
- **API calls**: `fetch('/api/members')`, `fetch('/api/activities')`, `fetch('/api/service-requests')`
- **Lines**: 227

### 2. `MembersManagement.tsx` — OrganizationMembersManagement
- **Export**: `OrganizationMembersManagement` (named)
- **Features**: CRUD, profile view, status filtering, Excel export
- **Key imports**: `toast`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/members')`
- **Lines**: 285

### 3. `ActivitiesManagement.tsx` — OrganizationActivitiesManagement
- **Export**: `OrganizationActivitiesManagement` (named)
- **Features**: CRUD, 5 activity types, participant tracking, budget info
- **Key imports**: `toast`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/activities')`
- **Lines**: 280

### 4. `DocumentsManagement.tsx` — OrganizationDocumentsManagement
- **Export**: `OrganizationDocumentsManagement` (named)
- **Features**: CRUD, 5 document types, approval workflow
- **Key imports**: `toast`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/documents')`
- **Lines**: 254

### 5. `ServicesManagement.tsx` — OrganizationServicesManagement
- **Export**: `OrganizationServicesManagement` (named)
- **Features**: CRUD, 5 priority levels, status tracking, assignment
- **Key imports**: `toast`, `logAudit`, `exportReportToExcel`
- **API calls**: `fetch('/api/service-requests')`
- **Lines**: 263

---

## 5. Duplicate / Overlapping Pages

Pages that exist in both ministry and organization with similar functionality:

| Domain | Ministry Page | Organization Page | Differences |
|---|---|---|---|
| **Dashboard** | `DashboardNewEnhanced.tsx` (342 lines, charts, time range) | `Dashboard.tsx` (227 lines, simpler) | Ministry version is significantly richer |
| **Members** | `MembersManagementNew.tsx` (357 lines, entity dropdown) | `MembersManagement.tsx` (285 lines, simpler) | Ministry links to entities; Org uses flat entity_id |
| **Activities** | `ActivitiesManagement.tsx` (1008 lines, 11 types, grid/list) | `ActivitiesManagement.tsx` (280 lines, 5 types) | Ministry version is 3.6x larger, more features |
| **Documents** | `DocumentsManagement.tsx` (597 lines, full lifecycle) | `DocumentsManagement.tsx` (254 lines, simpler approval) | Ministry has draft→review→approve workflow |
| **Services** | `ServicesManagement.tsx` (276 lines, service catalog) | `ServicesManagement.tsx` (263 lines, priority system) | Similar size, different data models |

**Recommendation**: The organization pages are simplified duplicates. Consider extracting shared logic with role-based feature toggling to reduce code duplication.

---

## 6. Shared UI Components

69 files in `src/app/components/ui/`. Barrel exported via `index.ts`.

### Core Components
| Component | File | Purpose |
|---|---|---|
| `Button`, `IconButton` | `Button.tsx` | Primary button system with variants |
| `Input`, `Textarea`, `Select` | `Input.tsx` | Form input primitives |
| `Card`, `StatsCard`, `AdvancedCard`, `TieredCard` | `Card.tsx` | Card layouts |
| `Modal` | `Modal.tsx` | Dialog modal |
| `AdvancedModal` | `AdvancedModal.tsx` | Feature-rich modal |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Confirmation dialog with `useConfirm` hook |
| `StatusBadge` | `StatusBadge.tsx` | Status indicator badges |
| `EmptyState` | `EmptyState.tsx` | Empty state placeholder |
| `FilterBar` | `FilterBar.tsx` | Reusable filter controls |
| `ActionButtons` | `ActionButtons.tsx` | Row action buttons (view/edit/delete) |
| `PageHeader` | `PageHeader.tsx` | Page title + actions header |
| `Toast` | `Toast.tsx` | Toast notifications (wraps sonner) |
| `ThemeToggle` | `ThemeToggle.tsx` | Dark/light mode toggle |
| `SmartSearch` | `SmartSearch.tsx` | Global search component |
| `SessionTimeoutWarning` | `SessionTimeoutWarning.tsx` | Session expiry warning |
| `SplashScreen` | `SplashScreen.tsx` | Loading splash with `ProfessionalLoader` |

### Loading & Skeleton
| Component | File |
|---|---|
| `Skeleton`, `TableSkeleton`, `CardSkeleton`, `StatsCardSkeleton`, `DashboardSkeleton`, `FormSkeleton`, `ListSkeleton` | `LoadingSkeleton.tsx` |

### Shadcn/Radix-Based (Ported)
| Component | File |
|---|---|
| `accordion` | `accordion.tsx` |
| `alert-dialog` | `alert-dialog.tsx` |
| `alert` | `alert.tsx` |
| `avatar` | `avatar.tsx` |
| `badge` | `badge.tsx` |
| `breadcrumb` | `breadcrumb.tsx` |
| `calendar` | `calendar.tsx` |
| `carousel` | `carousel.tsx` |
| `chart` | `chart.tsx` |
| `checkbox` | `checkbox.tsx` |
| `collapsible` | `collapsible.tsx` |
| `command` | `command.tsx` |
| `context-menu` | `context-menu.tsx` |
| `dialog` | `dialog.tsx` |
| `drawer` | `drawer.tsx` |
| `dropdown-menu` | `dropdown-menu.tsx` |
| `form` | `form.tsx` |
| `hover-card` | `hover-card.tsx` |
| `input-otp` | `input-otp.tsx` |
| `label` | `label.tsx` |
| `menubar` | `menubar.tsx` |
| `navigation-menu` | `navigation-menu.tsx` |
| `pagination` | `pagination.tsx` |
| `popover` | `popover.tsx` |
| `Progress` | `Progress.tsx` |
| `radio-group` | `radio-group.tsx` |
| `resizable` | `resizable.tsx` |
| `scroll-area` | `scroll-area.tsx` |
| `select` | `select.tsx` |
| `separator` | `separator.tsx` |
| `sheet` | `sheet.tsx` |
| `sidebar` | `sidebar.tsx` |
| `simple-select` | `simple-select.tsx` |
| `skeleton` | `skeleton.tsx` |
| `slider` | `slider.tsx` |
| `sonner` | `sonner.tsx` |
| `switch` | `switch.tsx` |
| `table` | `table.tsx` |
| `tabs` | `tabs.tsx` |
| `textarea` | `textarea.tsx` |
| `toggle-group` | `toggle-group.tsx` |
| `toggle` | `toggle.tsx` |
| `tooltip` | `tooltip.tsx` |

### Data Display
| Component | File | Purpose |
|---|---|---|
| `DataTable` | `DataTable.tsx` | Generic data table |
| `VirtualTable` | `VirtualTable.tsx` | Virtualized table for large datasets |

### Utilities
| Export | File | Purpose |
|---|---|---|
| `cn` | `utils.ts` | className merge utility (clsx + twMerge) |
| `use-mobile` | `use-mobile.ts` | Mobile detection hook |
| `designSystem` | `designSystem.ts` | Design tokens & constants |

### Documentation
- `DESIGN_SYSTEM_GUIDE.md` — Design system documentation

---

## 7. Shared Hooks

11 files in `src/app/hooks/`.

| Hook | File | Purpose |
|---|---|---|
| `useApi` | `useApi.ts` | Generic API client with loading/error states, auth headers, retry logic |
| `useFormValidation` | `useFormValidation.ts` | Real-time form validation with Arabic error messages, field-level rules, `sanitizeObject` integration |
| `usePermissions` | `usePermissions.tsx` | RBAC system with 35+ permissions mapped to ministry/organization roles, `hasPermission()`, `can()` |
| `useSessionTimeout` | `useSessionTimeout.ts` | Session timeout monitoring, activity tracking, auto-logout, warning triggers |
| `useOnlineStatus` | `useOnlineStatus.tsx` | Network status detection, connection quality metrics, offline/online toasts |
| `useKeyboardShortcuts` | `useKeyboardShortcuts.tsx` | Configurable keyboard shortcuts, `useGlobalShortcuts` for navigation |
| `useRealtimeUpdates` | `useRealtimeUpdates.ts` | Supabase Realtime subscriptions with WebSocket fallback protection |
| `useAutoSave` | `useAutoSave.tsx` | Debounced auto-save to localStorage with restore capability |
| `useOfflineData` | `useOfflineData.ts` | Offline-first data fetching with IndexedDB cache fallback |
| `usePWA` | `usePWA.ts` | PWA install prompt, online/offline state, service worker management |
| `useTwoFactor` | `useTwoFactor.ts` | 2FA setup/verify/disable using TOTP (authenticator app) |

---

## 8. Shared Utilities

31 files in `src/app/utils/`.

### Security & Auth
| File | Purpose |
|---|---|
| `security.ts` | Rate limiting, session management, audit logging, input sanitization, `getSessionTimeRemaining`, `refreshSession`, `isSessionExpired` |
| `encryption.ts` | Data encryption utilities |
| `totp.ts` | TOTP (Time-based One-Time Password) for 2FA |
| `deviceFingerprint.ts` | Device identification for security |

### Data & API
| File | Purpose |
|---|---|
| `smartApi.ts` | Smart API client with caching/retry |
| `supabaseSync.ts` | Supabase synchronization logic |
| `sync.ts` | General sync utilities |
| `dataSource.tsx` | Data source abstraction |
| `indexedDB.ts` | IndexedDB wrapper for offline storage |
| `operations.ts` | CRUD operation helpers |

### Export & Import
| File | Purpose |
|---|---|
| `exportImport.ts` | Import/export utilities |
| `exportTemplates.ts` | Export template definitions |
| `backup.ts` | Backup/restore functionality |

### Validation
| File | Purpose |
|---|---|
| `validation.ts` | Schema validation rules |
| `validation.test.ts` | Validation tests |

### UI & Theming
| File | Purpose |
|---|---|
| `colors.ts` | Color palette definitions |
| `governmentTheme.ts` | Yemen government theme configuration |
| `designSystem.ts` | Design system tokens (re-exported from ui/) |
| `performance.ts` | `useDebounce` and performance utilities |

### Domain-Specific
| File | Purpose |
|---|---|
| `professionsAnalysis.ts` | ISCO-08 professions analysis |
| `inspectionAutomation.ts` | Inspection automation logic |
| `demoData.ts` | Demo data initialization |

### Database
| File | Purpose |
|---|---|
| `schema.sql` | Base schema |
| `schema_enhanced.sql` | Enhanced schema |
| `schema_comprehensive.sql` | Comprehensive schema |
| `schema_manual.sql` | Manual schema |
| `schema_production.sql` | Production schema |
| `seed-data.sql` | Seed data |

### Other
| File | Purpose |
|---|---|
| `pwa.ts` | PWA configuration |
| `error-handler.ts` | Global error handling |
| `test.setup.ts` | Test setup |

---

## 9. Authentication Flow

File: `src/app/contexts/AuthContext.tsx`

### Architecture
- **Dual-mode auth**: Demo mode (localStorage) + Supabase (production)
- **User model**: `{ id, email, name, role, organizationId, userType: 'ministry' | 'organization', sessionId }`
- **Session management**: Custom session system in `security.ts` with `createSession`, `getSession`, `destroySession`, `refreshSession`

### Login Flow
1. Sanitize input email
2. Check rate limit (`checkRateLimit`) — 5 attempts, 30-min lockout
3. **Demo mode first**: Match against hardcoded `DEMO_CREDENTIALS` (2 accounts)
   - `ministry@yemen.gov.ye` / `Ministry@2026` → ministry_admin
   - `engineers@union.ye` / `Engineers@2026` → union_president (org)
   - On match: `initDemoData()`, create session, store in localStorage
4. **Supabase fallback**: `supabase.auth.signInWithPassword()`
   - On success: extract `user_metadata`, create session
   - On failure: `recordFailedAttempt()`, audit log, lock if exceeded
5. All attempts logged via `logAudit()`

### Session Management
- **Timeout**: 30-minute inactivity timeout monitored by `useSessionTimeout`
- **Refresh**: Session refreshed on user activity (mouse, keyboard, click, scroll, touch)
- **Warning**: `SessionTimeoutWarning` component shown before expiry
- **Auto-logout**: On expiry, `destroySession()` + redirect to `/`

### Role-Based Routing
- `ProtectedRoute` component checks `user.userType`
- `requireMinistry` → redirects to `/organization` if non-ministry
- `requireOrganization` → redirects to `/ministry` if non-organization
- `useAuth()` provides `isMinistry` and `isOrganization` booleans

### Security Features
- Rate limiting with progressive lockout
- Device fingerprinting for audit trail
- Input sanitization on all auth inputs
- Audit logging for all auth events (LOGIN_SUCCESS, LOGIN_FAILED, RATE_LIMITED, ACCOUNT_LOCKED, SESSION_EXPIRED, LOGOUT)
- Two-factor auth support via `useTwoFactor` hook (TOTP)

---

## 10. State Management

### Approach: Context + Local State (No Global Store)

The application does **not** use Redux, Zustand, or any global state library. State management is distributed:

#### Context Providers (2)
| Context | File | Scope |
|---|---|---|
| `AuthContext` | `contexts/AuthContext.tsx` | User session, auth state |
| `OfflineContext` | `contexts/OfflineContext.tsx` | Online status, IndexedDB cache, sync state, pending actions |

#### Local Component State
- All page components manage their own state via `useState`/`useReducer`
- Each page independently fetches its data on mount (`useEffect` + `fetch`)
- Form state managed locally with `useFormValidation` hook

#### Data Fetching Pattern
```
useEffect(() => {
  fetch('/api/...')
    .then(res => res.json())
    .then(data => setData(data))
    .catch(err => toast.error(...))
    .finally(() => setLoading(false));
}, []);
```
- **No shared data cache** between pages
- **No React Query / SWR** — manual fetch with local state
- `useApi` hook provides a reusable wrapper but no caching layer
- `useOfflineData` adds IndexedDB fallback for offline scenarios

#### Shared State via Props
- Parent-child prop drilling for filter states
- `useCallback` + `useMemo` for performance optimization in most pages

---

## 11. TypeScript Status

### Compilation: **CLEAN** (0 errors)

`tsc --noEmit` passes with zero errors.

### Patterns Observed
- **Interfaces defined per-file**: Each page defines its own interfaces locally (no shared types directory)
- **Type assertions**: Minimal — mostly proper typing
- **`any` usage**: Present in `ReportsManagement.tsx` (all data states typed as `any[]`), `LegalReferencesManagement.tsx` (`any[]` for all data)
- **`Record<string, string>` maps**: Used extensively for status/type labels and colors
- **Named vs Default exports**: Mixed — some use named, some default, some both (organization pages always named)

### Missing Type Sharing
- Entity interfaces are duplicated across pages (`Entity` appears in 10+ files with slight variations)
- Status/type constants duplicated per page (no shared constants file)
- No shared `types/` directory at app level

---

## 12. Architecture Patterns

### Common Page Pattern (27 of 31 ministry pages)
```
1. Local state: data[], loading, filters, selected item, form modal
2. useEffect → fetch data on mount
3. useMemo → filtered/sorted data
4. Render: PageHeader → Filters → Table → Pagination → Modal
5. CRUD: POST/PUT/DELETE → refetch → toast → logAudit
```

### Shared Dependencies Per Page
| Dependency | Usage | Pages Using |
|---|---|---|
| `logAudit` from `security.ts` | Audit trail | All 31 ministry + 5 org pages |
| `exportReportToExcel` | Excel export | All ministry pages except AuditLog |
| `PageHeader` | Page title bar | All pages |
| `StatusBadge` | Status display | ~20 pages |
| `EmptyState` | No-data state | ~15 pages |
| `useConfirm` | Delete confirmation | ~18 pages |
| `toast` (sonner) | Notifications | All pages |
| `recharts` | Charts | Dashboard, Reports |
| `useApi` | API client | ~8 pages |

### Export Patterns
- **Named exports**: Ministry pages (UnionsManagementNew, DocumentsManagement, etc.)
- **Default exports**: Many ministry pages (ElectionsManagement, ActivitiesManagement, etc.)
- **Named + default**: Some have both (LegalReferencesManagement)

### Offline Support
- `OfflineContext` manages IndexedDB cache
- `useOfflineData` hook provides offline-first data fetching
- `useOnlineStatus` shows network status warnings
- Sync mechanism for pending actions when back online

### PWA Features
- `usePWA` hook handles install prompts
- Service worker support
- Offline data caching via IndexedDB

---

*End of inventory. Generated by frontend discovery process.*
