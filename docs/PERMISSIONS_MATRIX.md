# Permissions Matrix — UnionSphere Enterprise v2.4.0
> مصدر واحد: `src/app/roles.ts:4` + `src/app/hooks/usePermissions.tsx:94` + `server/middleware/rbac.js:27`

## 1. Roles (15)
| Key | Label | Type |
|---|---|---|
| `super_admin` | مدير النظام والوزارة | ministry |
| `ministry_admin` | مدير الوزارة | ministry |
| `deputy_minister` | وكيل الوزارة | ministry |
| `ministry_staff` | مستخدم وزارة | ministry |
| `supervisory_director` | مدير عام الرقابة | ministry |
| `legal_counsel` | المستشار القانوني | ministry |
| `labor_inspector` | مفتش عمل | ministry |
| `compliance_officer` | مسؤول الامتثال | ministry |
| `registry_officer` | موظف السجل | ministry |
| `reports_viewer` | محلل البيانات | ministry |
| `union_president` | رئيس النقابة | organization |
| `employer_admin` | صاحب عمل | organization |
| `hr_officer` | موارد بشرية | organization |
| `financial_officer` | مسؤول مالي | organization |
| `worker` | عامل | organization |

## 2. Permissions (`action:resource` — 50+)
`dashboard:view`, `entities:*`, `members:*`, `elections:*`, `activities:*`, `documents:*`, `services:*`, `violations:*`, `inspections:*`, `compliance:*`, `risk:*`, `evaluation:*`, `licenses:*`, `training:*`, `dispatches:*`, `reduction:*`, `laborDisputes:*`, `expatriate:*`, `commercial:*`, `professions:*`, `workerProfiles:*`, `board:*`, `occupations:*`, `fees:*`, `notifications:*`, `legal:*`, `reports:*`, `audit:*`, `admin:all`

## 3. Server `PERMISSIONS` (30 keys — `read:/write:`)
`read:entities/write:entities`, `read:members/write:members`, `read:inspections/write:inspections`, `read:violations/write:violations`, `read:legal/write:legal`, `read:compliance/write:compliance`, `read:risk/write:risk`, `read:training/write:training`, `read:dispatches/write:dispatches`, `read:commercial/write:commercial`, `read:reports/write:reports`, `read:documents/write:documents`, `read:services/write:services`, `read:contracts/write:contracts`, `read:disputes/write:disputes`, `read:audit`, `admin:system` — كلها في `rbac.js:27`.

## 4. Enforcement
- **UI:** `RootLayoutNew.tsx:242` `can(perm)` لفلترة القائمة + `PermissionGate` + `ProtectedRoute.tsx:29` `returnTo` + `GUARD_DENY` audit.
- **API:** `requirePermission` → `403 { code: FORBIDDEN, required }` — `SUPER_ADMIN/MINISTRY_ADMIN` bypass فقط.
