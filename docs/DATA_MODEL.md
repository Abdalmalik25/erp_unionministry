# Data Model — UnionSphere Enterprise v2.4.0
> مصدر الحقيقة: `supabase/migrations/*` (34 file) + `docs/DATABASE_INVENTORY.md` (61 tables)

## 1. Core Tables
| Table | Columns | Rows | Purpose |
|---|---|---|---|
| `organizational_entities` | 106 | 30 | سجل المنشآت/النقابات المرجعي |
| `members` | 36 | 45 | أعضاء النقابات |
| `professions` | 96 | 3607 | دليل المهن الوطني ISCO-08 |
| `commercial_establishments` | 26 | 12 | المنشآت التجارية |
| `activities` | 31 | 28 | الأنشطة والفعاليات |
| `violations` | 26 | 41 | المخالفات |
| `inspections` | 33 | 30 | التفتيش الميداني |
| `audit_log` | 16 | 75 | سجل التدقيق |

## 2. Invariants (verified)
- **Migrations:** `20260826_01_missing_schema_tables.sql` idempotent — `dynamic_fields`, `sync_log`, `connection_status` enum.
- **Validation:** `src/app/utils/validation.test.ts:10` + `src/app/utils/security.ts` (XSS, email, nationalId, Yemeni phone).
- **Pagination:** `PAGE_SIZE` ثابت (6–15) + `limit/sort/order` server-side (`CommercialEstablishments:92,131`), `useDebounce 300ms`.
- **Audit:** `audit_log` + `logAudit({action,resource,resourceId})` على كل `create/update/delete/export`.

## 3. Large-Data Readiness
- `SELECT *` ممنوع (فقط `security.test.ts` سلسلة اختبار).
- `C T E` للوحة `server/index.js:stats`، `recharts` معزول `vendor-charts-defer 18k`.
