# API Endpoint Inventory

> **Source:** `server/index.js` (2671 lines)
> **Generated:** 2026-08-20
> **Total Endpoints:** 133 (excluding catch-all 404)

---

## Table of Contents

1. [Endpoint Summary](#1-endpoint-summary)
2. [Health & Dashboard](#2-health--dashboard)
3. [Organizational Entities](#3-organizational-entities)
4. [Members](#4-members)
5. [Activities](#5-activities)
6. [Elections](#6-elections)
7. [Documents](#7-documents)
8. [Violations](#8-violations)
9. [Professions](#9-professions)
10. [Services](#10-services)
11. [Service Requests](#11-service-requests)
12. [Worker Profiles](#12-worker-profiles)
13. [Compliance Alerts](#13-compliance-alerts)
14. [Fee Payments](#14-fee-payments)
15. [Worker Dispatches](#15-worker-dispatches)
16. [Worker Reduction Requests](#16-worker-reduction-requests)
17. [Licenses](#17-licenses)
18. [Inspections](#18-inspections)
19. [Evaluation Certificates](#19-evaluation-certificates)
20. [Training Records](#20-training-records)
21. [Profiles](#21-profiles)
22. [Notifications](#22-notifications)
23. [Board Members](#23-board-members)
24. [Commercial Establishments](#24-commercial-establishments)
25. [ISIC-4](#25-isic-4)
26. [Audit Log](#26-audit-log)
27. [Labor Disputes](#27-labor-disputes)
28. [Expatriate Licenses](#28-expatriate-licenses)
29. [Legal References](#29-legal-references)
30. [Risk Assessments](#30-risk-assessments)
31. [Compliance Matrices](#31-compliance-matrices)
32. [Maturity Assessments](#32-maturity-assessments)
33. [Cross-Cutting Analysis](#33-cross-cutting-analysis)
34. [Missing Endpoints](#34-missing-endpoints)
35. [Duplicate Logic](#35-duplicate-logic)
36. [SQL Injection Risks](#36-sql-injection-risks)

---

## 1. Endpoint Summary

| # | Method | Path | Line | Description |
|---|--------|------|------|-------------|
| 1 | GET | `/health` | 64 | Database health check |
| 2 | GET | `/api/dashboard/stats` | 74 | Aggregate dashboard statistics |
| 3 | GET | `/api/dashboard/enhanced-stats` | 95 | Extended dashboard statistics |
| 4 | GET | `/api/entities` | 123 | List organizational entities |
| 5 | GET | `/api/entities/:id` | 146 | Get entity by ID |
| 6 | GET | `/api/entities/:id/members` | 156 | Get members of an entity |
| 7 | GET | `/api/entities/:id/activities` | 167 | Get activities of an entity |
| 8 | POST | `/api/entities` | 178 | Create entity |
| 9 | PUT | `/api/entities/:id` | 205 | Update entity |
| 10 | DELETE | `/api/entities/:id` | 242 | Soft-delete entity |
| 11 | GET | `/api/members` | 256 | List members |
| 12 | POST | `/api/members` | 279 | Create member |
| 13 | PUT | `/api/members/:id` | 306 | Update member |
| 14 | DELETE | `/api/members/:id` | 340 | Hard-delete member |
| 15 | GET | `/api/activities` | 351 | List activities |
| 16 | POST | `/api/activities` | 375 | Create activity |
| 17 | PUT | `/api/activities/:id` | 403 | Update activity |
| 18 | DELETE | `/api/activities/:id` | 438 | Hard-delete activity |
| 19 | GET | `/api/elections` | 449 | List elections |
| 20 | POST | `/api/elections` | 471 | Create election |
| 21 | PUT | `/api/elections/:id` | 495 | Update election |
| 22 | DELETE | `/api/elections/:id` | 527 | Hard-delete election |
| 23 | GET | `/api/documents` | 538 | List documents |
| 24 | POST | `/api/documents` | 561 | Create document |
| 25 | PUT | `/api/documents/:id` | 585 | Update document |
| 26 | DELETE | `/api/documents/:id` | 616 | Hard-delete document |
| 27 | GET | `/api/violations` | 627 | List violations |
| 28 | POST | `/api/violations` | 650 | Create violation |
| 29 | PUT | `/api/violations/:id` | 675 | Update violation |
| 30 | DELETE | `/api/violations/:id` | 707 | Hard-delete violation |
| 31 | GET | `/api/professions` | 718 | List professions |
| 32 | POST | `/api/professions` | 740 | Create profession |
| 33 | PUT | `/api/professions/:id` | 765 | Update profession |
| 34 | DELETE | `/api/professions/:id` | 799 | Hard-delete profession |
| 35 | GET | `/api/services` | 810 | List services |
| 36 | POST | `/api/services` | 821 | Create service |
| 37 | PUT | `/api/services/:id` | 844 | Update service |
| 38 | DELETE | `/api/services/:id` | 873 | Hard-delete service |
| 39 | GET | `/api/service-requests` | 884 | List service requests |
| 40 | POST | `/api/service-requests` | 908 | Create service request |
| 41 | PUT | `/api/service-requests/:id` | 930 | Update service request |
| 42 | DELETE | `/api/service-requests/:id` | 960 | Hard-delete service request |
| 43 | GET | `/api/worker-profiles` | 971 | List worker profiles |
| 44 | GET | `/api/worker-profiles/:id` | 991 | Get worker profile by ID |
| 45 | POST | `/api/worker-profiles` | 1001 | Create worker profile |
| 46 | PUT | `/api/worker-profiles/:id` | 1027 | Update worker profile |
| 47 | DELETE | `/api/worker-profiles/:id` | 1061 | Hard-delete worker profile |
| 48 | GET | `/api/compliance-alerts` | 1072 | List compliance alerts |
| 49 | GET | `/api/compliance-alerts/:id` | 1094 | Get compliance alert by ID |
| 50 | POST | `/api/compliance-alerts` | 1104 | Create compliance alert |
| 51 | PUT | `/api/compliance-alerts/:id` | 1126 | Update compliance alert |
| 52 | PUT | `/api/compliance-alerts/:id/acknowledge` | 1155 | Acknowledge alert |
| 53 | PUT | `/api/compliance-alerts/:id/resolve` | 1169 | Resolve alert |
| 54 | DELETE | `/api/compliance-alerts/:id` | 1183 | Hard-delete compliance alert |
| 55 | GET | `/api/fee-payments` | 1194 | List fee payments |
| 56 | GET | `/api/fee-payments/:id` | 1216 | Get fee payment by ID |
| 57 | POST | `/api/fee-payments` | 1226 | Create fee payment |
| 58 | PUT | `/api/fee-payments/:id` | 1248 | Update fee payment |
| 59 | DELETE | `/api/fee-payments/:id` | 1278 | Hard-delete fee payment |
| 60 | GET | `/api/dispatches` | 1289 | List worker dispatches |
| 61 | POST | `/api/dispatches` | 1309 | Create dispatch |
| 62 | PUT | `/api/dispatches/:id` | 1334 | Update dispatch |
| 63 | PUT | `/api/dispatches/:id/status` | 1369 | Update dispatch status |
| 64 | DELETE | `/api/dispatches/:id` | 1385 | Hard-delete dispatch |
| 65 | GET | `/api/reduction-requests` | 1396 | List reduction requests |
| 66 | POST | `/api/reduction-requests` | 1416 | Create reduction request |
| 67 | PUT | `/api/reduction-requests/:id` | 1439 | Update reduction request |
| 68 | PUT | `/api/reduction-requests/:id/status` | 1472 | Update reduction status |
| 69 | DELETE | `/api/reduction-requests/:id` | 1489 | Hard-delete reduction request |
| 70 | GET | `/api/licenses` | 1500 | List licenses |
| 71 | POST | `/api/licenses` | 1522 | Create license |
| 72 | PUT | `/api/licenses/:id` | 1546 | Update license |
| 73 | DELETE | `/api/licenses/:id` | 1577 | Hard-delete license |
| 74 | GET | `/api/inspections` | 1588 | List inspections |
| 75 | POST | `/api/inspections` | 1610 | Create inspection |
| 76 | PUT | `/api/inspections/:id` | 1635 | Update inspection |
| 77 | DELETE | `/api/inspections/:id` | 1673 | Hard-delete inspection |
| 78 | GET | `/api/evaluation-certificates` | 1684 | List evaluation certificates |
| 79 | POST | `/api/evaluation-certificates` | 1706 | Create evaluation certificate |
| 80 | PUT | `/api/evaluation-certificates/:id` | 1729 | Update evaluation certificate |
| 81 | DELETE | `/api/evaluation-certificates/:id` | 1761 | Hard-delete evaluation certificate |
| 82 | GET | `/api/training-records` | 1772 | List training records |
| 83 | POST | `/api/training-records` | 1794 | Create training record |
| 84 | PUT | `/api/training-records/:id` | 1817 | Update training record |
| 85 | DELETE | `/api/training-records/:id` | 1832 | Hard-delete training record |
| 86 | GET | `/api/profiles` | 1843 | List user profiles |
| 87 | GET | `/api/profiles/:id` | 1863 | Get profile by ID |
| 88 | POST | `/api/profiles` | 1873 | Create profile |
| 89 | PUT | `/api/profiles/:id` | 1896 | Update profile |
| 90 | DELETE | `/api/profiles/:id` | 1926 | Hard-delete profile |
| 91 | GET | `/api/notifications` | 1937 | List notifications |
| 92 | POST | `/api/notifications` | 1957 | Create notification |
| 93 | PUT | `/api/notifications/:id` | 1979 | Update notification |
| 94 | DELETE | `/api/notifications/:id` | 2007 | Hard-delete notification |
| 95 | GET | `/api/board-members` | 2018 | List board members |
| 96 | POST | `/api/board-members` | 2038 | Create board member |
| 97 | PUT | `/api/board-members/:id` | 2063 | Update board member |
| 98 | DELETE | `/api/board-members/:id` | 2095 | Hard-delete board member |
| 99 | GET | `/api/commercial` | 2106 | List commercial establishments (v1) |
| 100 | POST | `/api/commercial` | 2126 | Create commercial establishment (v1) |
| 101 | PUT | `/api/commercial/:id` | 2150 | Update commercial establishment (v1) |
| 102 | DELETE | `/api/commercial/:id` | 2181 | Hard-delete commercial establishment (v1) |
| 103 | GET | `/api/isic4` | 2192 | List ISIC-4 classifications (read-only) |
| 104 | GET | `/api/audit-log` | 2214 | List audit log entries |
| 105 | POST | `/api/audit-log` | 2236 | Create audit log entry |
| 106 | GET | `/api/labor-disputes` | 2256 | List labor disputes |
| 107 | POST | `/api/labor-disputes` | 2277 | Create labor dispute |
| 108 | PUT | `/api/labor-disputes/:id` | 2292 | Update labor dispute |
| 109 | DELETE | `/api/labor-disputes/:id` | 2306 | Hard-delete labor dispute |
| 110 | GET | `/api/expatriate-licenses` | 2315 | List expatriate licenses |
| 111 | POST | `/api/expatriate-licenses` | 2336 | Create expatriate license |
| 112 | PUT | `/api/expatriate-licenses/:id` | 2352 | Update expatriate license |
| 113 | DELETE | `/api/expatriate-licenses/:id` | 2366 | Hard-delete expatriate license |
| 114 | GET | `/api/legal-references` | 2375 | List legal references (multi-table) |
| 115 | POST | `/api/legal-references` | 2413 | Create legal reference |
| 116 | PUT | `/api/legal-references/:id` | 2428 | Update legal reference |
| 117 | DELETE | `/api/legal-references/:id` | 2442 | Delete legal reference |
| 118 | GET | `/api/risk-assessments` | 2452 | List risk assessments |
| 119 | POST | `/api/risk-assessments` | 2468 | Create risk assessment |
| 120 | PUT | `/api/risk-assessments/:id` | 2482 | Update risk assessment |
| 121 | DELETE | `/api/risk-assessments/:id` | 2495 | Hard-delete risk assessment |
| 122 | GET | `/api/compliance-matrices` | 2504 | List compliance matrices |
| 123 | POST | `/api/compliance-matrices` | 2522 | Create compliance matrix |
| 124 | PUT | `/api/compliance-matrices/:id` | 2536 | Update compliance matrix |
| 125 | DELETE | `/api/compliance-matrices/:id` | 2549 | Hard-delete compliance matrix |
| 126 | GET | `/api/maturity-assessments` | 2558 | List maturity assessments |
| 127 | POST | `/api/maturity-assessments` | 2573 | Create maturity assessment |
| 128 | PUT | `/api/maturity-assessments/:id` | 2587 | Update maturity assessment |
| 129 | DELETE | `/api/maturity-assessments/:id` | 2600 | Hard-delete maturity assessment |
| 130 | GET | `/api/commercial-establishments` | 2609 | List commercial establishments (v2) |
| 131 | POST | `/api/commercial-establishments` | 2627 | Create commercial establishment (v2) |
| 132 | PUT | `/api/commercial-establishments/:id` | 2642 | Update commercial establishment (v2) |
| 133 | DELETE | `/api/commercial-establishments/:id` | 2655 | Hard-delete commercial establishment (v2) |

---

## 2. Health & Dashboard

### GET `/health`
- **Line:** 64
- **Params:** None
- **Response:** `{ status: 'ok', time: string, db: string }`
- **Error:** `{ status: 'error', error: string }` (500)
- **Auth:** None
- **Pagination:** No
- **Search/Filter:** No

### GET `/api/dashboard/stats`
- **Line:** 74
- **Params:** None
- **Response:** `{ total_entities, active_entities, compliant_entities, high_risk_entities, total_members, total_activities, open_violations, valid_licenses, unresolved_alerts }`
- **Error:** `{ error: string }` (500)
- **Auth:** None
- **Pagination:** No
- **Search/Filter:** No

### GET `/api/dashboard/enhanced-stats`
- **Line:** 95
- **Params:** None
- **Response:** `{ entities, members, professions, alerts, dispatches, reductions, evaluations, services }` (each with `total`/`active` counts)
- **Error:** `{ error: string }` (500)
- **Auth:** None
- **Pagination:** No
- **Search/Filter:** No

---

## 3. Organizational Entities

### GET `/api/entities`
- **Line:** 123
- **Query:** `page`, `limit`, `entity_type`, `status`, `governorate`, `search`
- **Response:** `{ data: Entity[], total: number, page: number, limit: number }`
- **Error:** 500
- **Pagination:** Yes
- **Search/Filter:** Yes (ILIKE on name_ar, name_en, unified_code)
- **Soft-delete aware:** Yes (`deleted_at IS NULL`)

### GET `/api/entities/:id`
- **Line:** 146
- **Params:** `id` (entity_id)
- **Response:** `Entity` object
- **Error:** 404 if not found, 500 on error

### GET `/api/entities/:id/members`
- **Line:** 156
- **Params:** `id` (entity_id)
- **Query:** `page`, `limit`
- **Response:** `{ data: Member[], total, page, limit }`

### GET `/api/entities/:id/activities`
- **Line:** 167
- **Params:** `id` (entity_id)
- **Query:** `page`, `limit`
- **Response:** `{ data: Activity[], total, page, limit }`

### POST `/api/entities`
- **Line:** 178
- **Body:** `name_ar`, `name_en`, `entity_type`, `classification`, `sector`, `legal_form`, `unified_code`, `registration_number`, `entity_code`, `governorate`, `city`, `address`, `phone`, `fax`, `email`, `website`, `president_name`, `president_phone`, `vice_president_name`, `secretary_name`, `treasurer_name`, `member_count`, `branch_count`, `establishment_date`, `compliance_status`, `risk_level`, `status`, `description`, `notes`
- **Validation:** At least 1 field required. `created_at`/`updated_at` auto-set to `NOW()`
- **Response:** 201 `{ success: true, entity: Entity }`

### PUT `/api/entities/:id`
- **Line:** 205
- **Params:** `id` (entity_id)
- **Body:** Any subset of entity fields
- **Validation:** At least 1 field required. `updated_at` auto-set
- **Response:** `{ success: true, entity: Entity }`

### DELETE `/api/entities/:id`
- **Line:** 242
- **Params:** `id` (entity_id)
- **Type:** Soft-delete (`deleted_at = NOW()`)
- **Response:** `{ success: true }`

---

## 4. Members

### GET `/api/members`
- **Line:** 256
- **Query:** `page`, `limit`, `entity_id`, `status`, `search`
- **Response:** `{ data: Member[], total, page, limit }`
- **Search:** ILIKE on `full_name`, `national_id`
- **Joins:** `organizational_entities` for `entity_name`

### POST `/api/members`
- **Line:** 279
- **Required:** `entity_id`
- **Body:** `entity_id`, `national_id`, `full_name`, `gender`, `status`, `birth_date`, `nationality`, `specialization`, `qualification`, `experience_years`, `workplace`, `mobile`, `email`, `governorate`, `city`, `address`, `join_date`, `membership_type`, `membership_expiry`, `subscription_amount`, `payment_status`, `last_payment_date`, `notes`
- **Response:** 201 `{ success: true, member: Member }`

### PUT `/api/members/:id`
- **Line:** 306
- **Body:** Any subset of member fields
- **Response:** `{ success: true, member: Member }`

### DELETE `/api/members/:id`
- **Line:** 340
- **Type:** Hard DELETE (permanent)

---

## 5. Activities

### GET `/api/activities`
- **Line:** 351
- **Query:** `page`, `limit`, `entity_id`, `status`, `activity_type`, `search`
- **Response:** `{ data: Activity[], total, page, limit }`
- **Search:** ILIKE on `activity_name`, `activity_number`

### POST `/api/activities`
- **Line:** 375
- **Required:** `entity_id`
- **Body:** 24 fields including `budget`, `actual_cost`, `funding_source`, `metadata`
- **Response:** 201 `{ success: true, activity: Activity }`

### PUT `/api/activities/:id`
- **Line:** 403
- **Body:** Any subset of activity fields
- **Response:** `{ success: true, activity: Activity }`

### DELETE `/api/activities/:id`
- **Line:** 438
- **Type:** Hard DELETE

---

## 6. Elections

### GET `/api/elections`
- **Line:** 449
- **Query:** `page`, `limit`, `entity_id`, `status`
- **Response:** `{ data: Election[], total, page, limit }`
- **No search filter**

### POST `/api/elections`
- **Line:** 471
- **Required:** `entity_id`
- **Body:** `entity_id`, `election_number`, `title`, `election_type`, `status`, `planned_date`, `actual_date`, `eligible_voters`, `actual_voters`, `candidates_count`, `positions_count`, `supervised_by`, `venue`, `results_summary`, `notes`, `metadata`
- **Response:** 201 `{ success: true, election: Election }`

### PUT `/api/elections/:id`
- **Line:** 495
- **Response:** `{ success: true, election: Election }`

### DELETE `/api/elections/:id`
- **Line:** 527
- **Type:** Hard DELETE

---

## 7. Documents

### GET `/api/documents`
- **Line:** 538
- **Query:** `page`, `limit`, `entity_id`, `status`, `document_type`
- **No search filter**

### POST `/api/documents`
- **Line:** 561
- **Required:** `entity_id`
- **Body:** `entity_id`, `document_number`, `document_name`, `document_type`, `status`, `issue_date`, `expiry_date`, `issuing_authority`, `description`, `file_url`, `rejection_reason`, `notes`, `metadata`
- **Response:** 201 `{ success: true, document: Document }`

### PUT `/api/documents/:id`
- **Line:** 585
- **Response:** `{ success: true, document: Document }`

### DELETE `/api/documents/:id`
- **Line:** 616
- **Type:** Hard DELETE

---

## 8. Violations

### GET `/api/violations`
- **Line:** 627
- **Query:** `page`, `limit`, `entity_id`, `status`, `severity`
- **No search filter**

### POST `/api/violations`
- **Line:** 650
- **Required:** `entity_id`
- **Body:** `entity_id`, `violation_number`, `violation_type`, `violation_name`, `severity`, `status`, `detected_date`, `detected_by`, `description`, `legal_basis`, `penalty_amount`, `decision`, `resolved_date`, `resolved_by`, `resolution_notes`, `evidence_urls`
- **Response:** 201 `{ success: true, violation: Violation }`

### PUT `/api/violations/:id`
- **Line:** 675
- **Response:** `{ success: true, violation: Violation }`

### DELETE `/api/violations/:id`
- **Line:** 707
- **Type:** Hard DELETE

---

## 9. Professions

### GET `/api/professions`
- **Line:** 718
- **Query:** `page`, `limit`, `search`, `sector`, `level`, `status`
- **Search:** ILIKE on `name_ar`, `isco_code`

### POST `/api/professions`
- **Line:** 740
- **Body:** 21 fields including `isco_code`, `sector`, `family`, `hazard_level`, `salary_min`, `salary_max`, `keywords`
- **Response:** 201 `{ success: true, profession: Profession }`

### PUT `/api/professions/:id`
- **Line:** 765
- **Response:** `{ success: true, profession: Profession }`

### DELETE `/api/professions/:id`
- **Line:** 799
- **Type:** Hard DELETE

---

## 10. Services

### GET `/api/services`
- **Line:** 810
- **Query:** `page`, `limit`
- **No filters, no search**

### POST `/api/services`
- **Line:** 821
- **Body:** `service_code`, `service_name`, `description`, `category`, `processing_days`, `fee_amount`, `is_active`, `requirements`, `metadata`
- **Response:** 201 `{ success: true, service: Service }`

### PUT `/api/services/:id`
- **Line:** 844
- **Response:** `{ success: true, service: Service }`

### DELETE `/api/services/:id`
- **Line:** 873
- **Type:** Hard DELETE

---

## 11. Service Requests

### GET `/api/service-requests`
- **Line:** 884
- **Query:** `page`, `limit`, `entity_id`, `status`
- **Joins:** `services`, `organizational_entities`

### POST `/api/service-requests`
- **Line:** 908
- **Required:** `entity_id`, `service_id`
- **Body:** `entity_id`, `service_id`, `request_number`, `status`, `submission_date`, `expected_date`, `completion_date`, `notes`, `rejection_reason`, `metadata`
- **Response:** 201 `{ success: true, request: ServiceRequest }`

### PUT `/api/service-requests/:id`
- **Line:** 930
- **Response:** `{ success: true, request: ServiceRequest }`

### DELETE `/api/service-requests/:id`
- **Line:** 960
- **Type:** Hard DELETE

---

## 12. Worker Profiles

### GET `/api/worker-profiles`
- **Line:** 971
- **Query:** `page`, `limit`, `enterprise_id`, `status` (employment_status)
- **No search filter**

### GET `/api/worker-profiles/:id`
- **Line:** 991
- **Response:** `WorkerProfile` object

### POST `/api/worker-profiles`
- **Line:** 1001
- **Required:** `member_id`
- **Body:** 18 fields including `contract_type`, `skills`, `certifications`, `compliance_score`
- **Response:** 201 `{ success: true, profile: WorkerProfile }`

### PUT `/api/worker-profiles/:id`
- **Line:** 1027
- **Response:** `{ success: true, profile: WorkerProfile }`

### DELETE `/api/worker-profiles/:id`
- **Line:** 1061
- **Type:** Hard DELETE

---

## 13. Compliance Alerts

### GET `/api/compliance-alerts`
- **Line:** 1072
- **Query:** `page`, `limit`, `enterprise_id`, `severity`, `is_resolved` (string→boolean), `alert_type`
- **No search filter**

### GET `/api/compliance-alerts/:id`
- **Line:** 1094
- **Response:** `ComplianceAlert` object

### POST `/api/compliance-alerts`
- **Line:** 1104
- **Required:** `enterprise_id`
- **Body:** `enterprise_id`, `enterprise_name`, `alert_type`, `severity`, `title`, `description`, `source_table`, `source_id`, `due_date`, `metadata`
- **Response:** 201 `{ success: true, alert: ComplianceAlert }`

### PUT `/api/compliance-alerts/:id`
- **Line:** 1126
- **Response:** `{ success: true, alert: ComplianceAlert }`

### PUT `/api/compliance-alerts/:id/acknowledge`
- **Line:** 1155
- **Body:** `{ acknowledged_by }`
- **Logic:** Sets `is_acknowledged = true`, records who and when. Only if not already acknowledged.
- **Response:** `{ success: true, alert }` or 404

### PUT `/api/compliance-alerts/:id/resolve`
- **Line:** 1169
- **Body:** `{ resolved_by, resolution_notes }`
- **Logic:** Sets `is_resolved = true`, records who, when, and notes. Only if not already resolved.
- **Response:** `{ success: true, alert }` or 404

### DELETE `/api/compliance-alerts/:id`
- **Line:** 1183
- **Type:** Hard DELETE

---

## 14. Fee Payments

### GET `/api/fee-payments`
- **Line:** 1194
- **Query:** `page`, `limit`, `entity_id`, `member_id`, `status`, `payment_method`

### GET `/api/fee-payments/:id`
- **Line:** 1216
- **Response:** `FeePayment` object

### POST `/api/fee-payments`
- **Line:** 1226
- **Required:** `amount` (non-null)
- **Body:** `entity_id`, `member_id`, `service_id`, `amount`, `currency`, `payment_method`, `receipt_number`, `payment_date`, `status`, `description`, `processed_by`, `notes`, `metadata`
- **Response:** 201 `{ success: true, payment: FeePayment }`

### PUT `/api/fee-payments/:id`
- **Line:** 1248
- **Response:** `{ success: true, payment: FeePayment }`

### DELETE `/api/fee-payments/:id`
- **Line:** 1278
- **Type:** Hard DELETE

---

## 15. Worker Dispatches

### GET `/api/dispatches`
- **Line:** 1289
- **Query:** `page`, `limit`, `status`, `sending_enterprise_id`
- **No search filter**

### POST `/api/dispatches`
- **Line:** 1309
- **Body:** `dispatch_number`, `sending_enterprise_id`, `sending_enterprise_name`, `receiving_enterprise_id`, `receiving_enterprise_name`, `worker_name`, `worker_national_id`, `dispatch_date`, `expected_return_date`, `purpose`, `legal_basis`, `status`, `notes`, `safety_briefing_done`, `medical_clearance_done`, `rejection_reason`, `metadata`
- **Response:** 201 `{ success: true, dispatch: Dispatch }`

### PUT `/api/dispatches/:id`
- **Line:** 1334
- **Response:** `{ success: true, dispatch: Dispatch }`

### PUT `/api/dispatches/:id/status`
- **Line:** 1369
- **Required body:** `status`
- **Optional body:** `rejection_reason`
- **Response:** `{ success: true, dispatch }`

### DELETE `/api/dispatches/:id`
- **Line:** 1385
- **Type:** Hard DELETE

---

## 16. Worker Reduction Requests

### GET `/api/reduction-requests`
- **Line:** 1396
- **Query:** `page`, `limit`, `status`, `enterprise_id`

### POST `/api/reduction-requests`
- **Line:** 1416
- **Body:** `request_number`, `enterprise_id`, `enterprise_name`, `requested_reduction_count`, `current_employee_count`, `reduction_reason`, `reduction_category`, `legal_basis`, `detailed_description`, `status`, `notes`, `metadata`
- **Response:** 201 `{ success: true, request: ReductionRequest }`

### PUT `/api/reduction-requests/:id`
- **Line:** 1439
- **Response:** `{ success: true, request }`

### PUT `/api/reduction-requests/:id/status`
- **Line:** 1472
- **Required body:** `status`
- **Optional body:** `rejection_reason`, `final_approver_notes`
- **Response:** `{ success: true, request }`

### DELETE `/api/reduction-requests/:id`
- **Line:** 1489
- **Type:** Hard DELETE

---

## 17. Licenses

### GET `/api/licenses`
- **Line:** 1500
- **Query:** `page`, `limit`, `entity_id`, `status`

### POST `/api/licenses`
- **Line:** 1522
- **Required:** `entity_id`
- **Body:** `license_number`, `entity_id`, `license_type`, `license_name`, `issue_date`, `expiry_date`, `issuing_authority`, `status`, `renewal_status`, `renewal_date`, `issuing_decision`, `file_url`, `notes`, `metadata`
- **Response:** 201 `{ success: true, license: License }`

### PUT `/api/licenses/:id`
- **Line:** 1546
- **Response:** `{ success: true, license: License }`

### DELETE `/api/licenses/:id`
- **Line:** 1577
- **Type:** Hard DELETE

---

## 18. Inspections

### GET `/api/inspections`
- **Line:** 1588
- **Query:** `page`, `limit`, `enterprise_id`, `status` (compliance_status)

### POST `/api/inspections`
- **Line:** 1610
- **Required:** `enterprise_id`
- **Body:** 25+ fields including scores for `labor_law_score`, `safety_score`, `training_score`, `yemenization_score`, `quality_score`, plus `labor_law_articles`, `yemeni_decrees`, `international_standards`, `recommendations`, `strengths`, `weaknesses`, `report_url`, `attachments`, `created_by`
- **Note:** Does NOT auto-set `created_at`/`updated_at`
- **Response:** 201 `{ success: true, data: Inspection }`

### PUT `/api/inspections/:id`
- **Line:** 1635
- **Body:** 28 fields including `compliance_rates`, `notes`, `metadata`
- **Response:** `{ success: true, inspection: Inspection }`

### DELETE `/api/inspections/:id`
- **Line:** 1673
- **Type:** Hard DELETE

---

## 19. Evaluation Certificates

### GET `/api/evaluation-certificates`
- **Line:** 1684
- **Query:** `page`, `limit`, `enterprise_id`, `status`

### POST `/api/evaluation-certificates`
- **Line:** 1706
- **Required:** `enterprise_id`
- **Body:** 16 fields including `certificate_number`, `overall_score`, `labor_law_compliance`, `safety_compliance`, `training_compliance`, `yemenization_compliance`, `qr_code_data`, `certified_occupations`, `inspection_id`, `attachments`
- **Note:** Does NOT auto-set `created_at`/`updated_at`
- **Response:** 201 `{ success: true, data: EvalCertificate }`

### PUT `/api/evaluation-certificates/:id`
- **Line:** 1729
- **Response:** `{ success: true, certificate }`

### DELETE `/api/evaluation-certificates/:id`
- **Line:** 1761
- **Type:** Hard DELETE

---

## 20. Training Records

### GET `/api/training-records`
- **Line:** 1772
- **Query:** `page`, `limit`, `enterprise_id`, `status`

### POST `/api/training-records`
- **Line:** 1794
- **Required:** `enterprise_id`
- **Body:** `enterprise_id`, `training_name`, `training_code`, `training_type` (duplicate key!), `training_provider`, `start_date`, `end_date`, `duration_hours`, `status`, `employee_id`, `employee_name`, `assessment_score`, `certification_issued`, `certification_number`, `regulatory_basis`, `occupation_id`, `member_id`, `competence_ids`
- **Note:** `training_type` appears twice in cols array (line 1799-1800) — potential bug
- **Response:** 201 `{ success: true, data: TrainingRecord }`

### PUT `/api/training-records/:id` — **SQL INJECTION RISK**
- **Line:** 1817
- **Body:** Any key-value pairs (no whitelist — takes `Object.entries(d)` directly as column names)
- **Response:** `{ success: true, data }`

### DELETE `/api/training-records/:id`
- **Line:** 1832
- **Type:** Hard DELETE

---

## 21. Profiles

### GET `/api/profiles`
- **Line:** 1843
- **Query:** `page`, `limit`, `search`, `role`
- **Search:** ILIKE on `full_name`, `email`

### GET `/api/profiles/:id`
- **Line:** 1863
- **Response:** `Profile` object

### POST `/api/profiles`
- **Line:** 1873
- **Body:** `full_name`, `email`, `phone`, `role`, `avatar_url`, `department`, `position`, `governorate`, `city`, `address`, `is_active`, `metadata`
- **Response:** 201 `{ success: true, profile: Profile }`

### PUT `/api/profiles/:id`
- **Line:** 1896
- **Response:** `{ success: true, profile: Profile }`

### DELETE `/api/profiles/:id`
- **Line:** 1926
- **Type:** Hard DELETE

---

## 22. Notifications

### GET `/api/notifications`
- **Line:** 1937
- **Query:** `page`, `limit`, `recipient_id`, `is_read` (string→boolean)

### POST `/api/notifications`
- **Line:** 1957
- **Required:** `recipient_id`
- **Body:** `recipient_id`, `title`, `message`, `notification_type`, `related_resource`, `related_id`, `is_read`, `metadata`
- **Note:** Only auto-sets `created_at` (not `updated_at`)

### PUT `/api/notifications/:id`
- **Line:** 1979
- **Response:** `{ success: true, notification }`

### DELETE `/api/notifications/:id`
- **Line:** 2007
- **Type:** Hard DELETE

---

## 23. Board Members

### GET `/api/board-members`
- **Line:** 2018
- **Query:** `entity_id`, `status`
- **Pagination:** **NO** — returns all matching rows without LIMIT/OFFSET
- **No search filter**

### POST `/api/board-members`
- **Line:** 2038
- **Required:** `entity_id`
- **Body:** 18 fields including `is_chairman`, `is_active`, `appointment_date`, `term_end_date`

### PUT `/api/board-members/:id`
- **Line:** 2063

### DELETE `/api/board-members/:id`
- **Line:** 2095
- **Type:** Hard DELETE

---

## 24. Commercial Establishments

### Duplicate API: `/api/commercial` and `/api/commercial-establishments`

**V1 — `/api/commercial` (lines 2106-2189)**

| Method | Path | Line |
|--------|------|------|
| GET | `/api/commercial` | 2106 |
| POST | `/api/commercial` | 2126 |
| PUT | `/api/commercial/:id` | 2150 |
| DELETE | `/api/commercial/:id` | 2181 |

- **Search:** ILIKE on `name`, `commercial_number`
- **Filters:** `status`

**V2 — `/api/commercial-establishments` (lines 2609-2661)**

| Method | Path | Line |
|--------|------|------|
| GET | `/api/commercial-establishments` | 2609 |
| POST | `/api/commercial-establishments` | 2627 |
| PUT | `/api/commercial-establishments/:id` | 2642 |
| DELETE | `/api/commercial-establishments/:id` | 2655 |

- **Search:** ILIKE on `name_ar`, `name_en`, `unified_code`
- **Filters:** `status`
- **V2 POST has more fields:** 20 vs V1's 15
- **V2 PUT uses dynamic column names (no whitelist)** — SQL injection risk

---

## 25. ISIC-4

### GET `/api/isic4`
- **Line:** 2192
- **Query:** `page`, `limit`, `search`, `level`, `sector`
- **Search:** ILIKE on `isic_code`, `description_ar`
- **Read-only** — no POST/PUT/DELETE

---

## 26. Audit Log

### GET `/api/audit-log`
- **Line:** 2214
- **Query:** `page`, `limit`, `action`, `resource`, `start_date`, `end_date`
- **Date filter:** `created_at >= start_date AND created_at <= end_date`

### POST `/api/audit-log`
- **Line:** 2236
- **Body:** `user_id`, `action`, `resource`, `resource_id`, `details`, `ip_address`
- **Note:** No endpoint calls `logAudit()` internally — audit logging is client-driven only

---

## 27. Labor Disputes

### GET `/api/labor-disputes`
- **Line:** 2256
- **Query:** `page`, `limit`, `enterprise_id`, `status`, `search`
- **Search:** ILIKE on `worker_name`, `enterprise_name`, `dispute_type`

### POST `/api/labor-disputes`
- **Line:** 2277
- **Body:** `enterprise_id`, `enterprise_name`, `worker_name`, `dispute_type`, `dispute_description`, `dispute_date`, `status`, `resolution_date`, `resolution_notes`, `settlement_proposal`
- **Note:** Does NOT auto-set `created_at`/`updated_at`

### PUT `/api/labor-disputes/:id`
- **Line:** 2292

### DELETE `/api/labor-disputes/:id`
- **Line:** 2306

---

## 28. Expatriate Licenses

### GET `/api/expatriate-licenses`
- **Line:** 2315
- **Query:** `page`, `limit`, `enterprise_id`, `status`, `search`
- **Search:** ILIKE on `license_number`, `expatriate_name`, `expatriate_nationality`

### POST `/api/expatriate-licenses`
- **Line:** 2336
- **Required:** `enterprise_id`
- **Body:** 9 fields

### PUT `/api/expatriate-licenses/:id`
- **Line:** 2352

### DELETE `/api/expatriate-licenses/:id`
- **Line:** 2366

---

## 29. Legal References

### GET `/api/legal-references`
- **Line:** 2375
- **Query:** `limit`, `page`, `table` (target table selector)
- **Multi-table:** When `table=all`, queries 4 tables in parallel: `legal_references`, `law_articles`, `ilo_conventions`, `international_standards`
- **When specific:** Returns paginated results for chosen table

### POST `/api/legal-references` — **SQL INJECTION RISK**
- **Line:** 2413
- **Body:** `_table` (determines target table), plus any key-value pairs as columns
- **Table name from request body** is interpolated directly into SQL: `INSERT INTO ${table}`
- **Response:** 201 `{ success: true, data }`

### PUT `/api/legal-references/:id` — **SQL INJECTION RISK**
- **Line:** 2428
- **Body:** `_table` (determines target table), plus dynamic columns
- **Table name interpolated directly:** `UPDATE ${table} SET ...`

### DELETE `/api/legal-references/:id` — **SQL INJECTION RISK**
- **Line:** 2442
- **Query:** `table` (determines target table)
- **Table name from query param** interpolated directly: `DELETE FROM ${table}`

---

## 30. Risk Assessments

### GET `/api/risk-assessments`
- **Line:** 2452
- **Query:** `limit` (default 50), `page` (default 1), `entity_id`, `status`

### POST `/api/risk-assessments`
- **Line:** 2468
- **Body:** `entity_id`, `risk_type`, `risk_description`, `likelihood`, `impact`, `risk_score`, `risk_level`, `mitigation_plan`, `responsible_person`, `review_date`, `status`
- **Note:** Does NOT auto-set `created_at`/`updated_at`
- **Response:** 201

### PUT `/api/risk-assessments/:id` — **SQL INJECTION RISK**
- **Line:** 2482
- **Body:** Any key-value pairs (no whitelist)
- **Response:** `{ success: true, data }`

### DELETE `/api/risk-assessments/:id`
- **Line:** 2495

---

## 31. Compliance Matrices

### GET `/api/compliance-matrices`
- **Line:** 2504
- **Query:** `limit` (default 50), `page` (default 1), `enterprise_id`, `occupation_id`

### POST `/api/compliance-matrices`
- **Line:** 2522
- **Body:** `enterprise_id`, `occupation_id`, `occupation_type`, `article_number`, `article_title`, `compliance_status`, `notes`, `checked_at`, `checked_by`

### PUT `/api/compliance-matrices/:id` — **SQL INJECTION RISK**
- **Line:** 2536
- **Body:** Any key-value pairs (no whitelist)

### DELETE `/api/compliance-matrices/:id`
- **Line:** 2549

---

## 32. Maturity Assessments

### GET `/api/maturity-assessments`
- **Line:** 2558
- **Query:** `limit` (default 50), `page` (default 1), `entity_id`

### POST `/api/maturity-assessments`
- **Line:** 2573
- **Body:** 15 fields including `overall_score`, `grade`, `red_flags`, `recommendations`

### PUT `/api/maturity-assessments/:id` — **SQL INJECTION RISK**
- **Line:** 2587
- **Body:** Any key-value pairs (no whitelist)

### DELETE `/api/maturity-assessments/:id`
- **Line:** 2600

---

## 33. Cross-Cutting Analysis

### Authentication

| Status | Details |
|--------|---------|
| **NONE** | Zero authentication or authorization on any endpoint. No middleware for auth. No JWT/session checking. Every endpoint is fully public. |

### Audit Logging (logAudit)

| Status | Details |
|--------|---------|
| **NONE** | No `logAudit` function exists. No endpoint writes to `audit_log` table internally. The `audit_log` table is only accessible via direct API calls (`GET/POST /api/audit-log`). This means all mutations are unaudited. |

### Pagination Support

| Endpoint | Pagination | Notes |
|----------|-----------|-------|
| `GET /api/board-members` | **NO** | Returns ALL rows — performance risk |
| `GET /api/audit-log` | Yes | Uses `paginate()` helper |
| `GET /api/legal-references` (`table=all`) | No | Returns up to 50 rows from 4 tables without proper count |
| All other GET list endpoints | Yes | Uses `paginate()` helper |
| `/api/risk-assessments`, `/api/compliance-matrices`, `/api/maturity-assessments` | Manual | Custom `limit=50&page=1` defaults instead of `paginate()` |

### Search/Filter Support

| Endpoint | Search | Filters |
|----------|--------|---------|
| `GET /api/entities` | `search` (name_ar, name_en, unified_code) | entity_type, status, governorate |
| `GET /api/members` | `search` (full_name, national_id) | entity_id, status |
| `GET /api/activities` | `search` (activity_name, activity_number) | entity_id, status, activity_type |
| `GET /api/professions` | `search` (name_ar, isco_code) | sector, level, status |
| `GET /api/labor-disputes` | `search` (worker_name, enterprise_name, dispute_type) | enterprise_id, status |
| `GET /api/expatriate-licenses` | `search` (license_number, expatriate_name, nationality) | enterprise_id, status |
| `GET /api/commercial` (v1) | `search` (name, commercial_number) | status |
| `GET /api/commercial-establishments` (v2) | `search` (name_ar, name_en, unified_code) | status |
| `GET /api/isic4` | `search` (isic_code, description_ar) | level, sector |
| `GET /api/audit-log` | — | action, resource, start_date, end_date |
| `GET /api/profiles` | `search` (full_name, email) | role |
| All others | **NO search** | Various filters only |

### Error Handling

| Pattern | Endpoints |
|---------|-----------|
| **Good** — `try/catch` with specific console.error + Arabic error message | Entities, members, activities, professions, violations, commercial v1, board_members |
| **Adequate** — `try/catch` with Arabic error message | Most others |
| **Raw error.message leaked** — `res.status(500).json({ error: err.message })` | `/api/inspections` (GET, POST), `/api/evaluation-certificates` (GET, POST), `/api/training-records` (all), labor_disputes, expatriate_licenses, legal_references, risk_assessments, compliance_matrices, maturity_assessments, commercial-establishments v2 |
| **Missing validation** | Some POST endpoints don't validate required fields |

### Deletion Strategy

| Strategy | Tables |
|----------|--------|
| **Soft delete** (`deleted_at`) | `organizational_entities` only |
| **Hard delete** | All other 27+ tables — **data loss risk** |

---

## 34. Missing Endpoints (Tables with no API)

Database tables from `schema_comprehensive.sql` that have **NO corresponding API endpoints**:

| Table | Lines in Schema | Priority |
|-------|----------------|----------|
| `election_results` | 507-519 | High — linked to elections |
| `entity_relationships` | 739-759 | High — entity connections |
| `dynamic_fields` | 760-774 | Medium |
| `reports` | 832+ | High — reporting feature |
| `enterprise_occupation_links` | 141-199 | High — profession-enterprise links |
| `hazardous_occupations` | 362-402 | Medium |
| `institutional_standards` | 437-452 | Medium |
| `career_paths` | 453-471 | Medium |
| `salary_ranges` | 472-491 | Medium |
| `contract_types` | 492-506 | Medium |
| `worker_procedures` | 507-525 | Medium |
| `expert_opinions` | 526-551 | Medium |
| `inspection_checklists` | 653+ | High — inspection sub-items |
| `enterprise_evaluation_levels` | 885-898 | Low |
| `institutional_templates` | 899-913 | Low |
| `smart_suggestions` | 914-930 | Low |
| `currencies` | 931-946 | Medium — reference data |
| `governorates` | 947-961 | Medium — reference data |
| `commercial_branches` | 990-1007 | High — commercial sub-entities |
| `commercial_equipment` | 1008-1023 | Medium |
| `commercial_warehouses` | 1024-1039 | Medium |
| `commercial_contracts` | 1040-1057 | High |
| `enterprise_slots` | 1058-1078 | Low |
| `isic4_classifications` | Read-only via `/api/isic4` | Covered |
| `enterprise_isic_links` | No API | Medium |
| `error_log` | schema_production.sql | Medium |
| `backup_log` | schema_production.sql | Low |
| `sync_log` | schema_production.sql | Low |
| `data_retention_log` | schema_production.sql | Low |
| `schema_migrations` | schema_production.sql | N/A (internal) |

---

## 35. Duplicate Logic

### Pattern 1: CRUD Boilerplate (~30 instances)
Every resource repeats the same ~100-line CRUD pattern:
- **GET list** with `paginate()` + dynamic WHERE + count
- **POST** with whitelist filter → placeholder generation → INSERT RETURNING
- **PUT** with colMap iteration → dynamic SET → UPDATE RETURNING
- **DELETE** with DELETE RETURNING id → rowCount check

**Affected resources:** entities, members, activities, elections, documents, violations, professions, services, service-requests, worker-profiles, compliance-alerts, fee-payments, dispatches, reduction-requests, licenses, inspections, evaluation-certificates, training-records, profiles, notifications, board-members, commercial (both v1 and v2), labor-disputes, expatriate-licenses, risk-assessments, compliance-matrices, maturity-assessments.

**Recommendation:** Extract generic CRUD factory: `createCrudRoutes(app, table, config)`

### Pattern 2: Two commercial establishment APIs
`/api/commercial` (lines 2106-2189) and `/api/commercial-establishments` (lines 2609-2661) both operate on the `commercial_establishments` table with different field sets.

### Pattern 3: Inconsistent pagination helpers
- Most endpoints use `paginate(req)` (lines 51-56)
- `risk-assessments`, `compliance-matrices`, `maturity-assessments` manually compute `limit = 50, page = 1` defaults
- `legal-references` uses a different pagination approach

### Pattern 4: Duplicate `training_type` key
Line 1799-1800 in training-records POST has `'training_type'` twice in the `cols` array — likely a bug causing silent data loss.

---

## 36. SQL Injection Risks

### CRITICAL: Direct Table Name Interpolation from User Input

| Location | Risk | Code |
|----------|------|------|
| **Line 2421** | POST `/api/legal-references` | `` INSERT INTO ${table} `` — `table` from `req.body._table` |
| **Line 2436** | PUT `/api/legal-references/:id` | `` UPDATE ${table} SET `` — `table` from `req.body._table` |
| **Line 2445** | DELETE `/api/legal-references/:id` | `` DELETE FROM ${table} `` — `table` from `req.query.table` |

**Attack:** `POST /api/legal-references` with `{ "_table": "profiles; DROP TABLE organizational_entities; --" }` would execute destructive SQL.

### HIGH: Unvalidated Column Names from Request Body

| Location | Endpoint | Code Pattern |
|----------|----------|-------------|
| **Line 1821** | PUT `/api/training-records/:id` | `for (const [k, v] of Object.entries(d)) { cols.push(\`${k} = ...\`) }` |
| **Line 2486** | PUT `/api/risk-assessments/:id` | Same pattern |
| **Line 2540** | PUT `/api/compliance-matrices/:id` | Same pattern |
| **Line 2591** | PUT `/api/maturity-assessments/:id` | Same pattern |
| **Line 2646** | PUT `/api/commercial-establishments/:id` (v2) | Same pattern |

**Attack:** Sending `{ "id = 1; DROP TABLE profiles; --": "x" }` would inject SQL via column name interpolation.

### SAFE: Parameterized Queries
All value parameters use `$1, $2, ...` placeholders — actual data values are safe from SQL injection.

### SAFE: Whitelisted Column Maps
The majority of PUT endpoints (entities, members, activities, elections, documents, violations, professions, services, etc.) use a hardcoded `colMap` object to whitelist allowed columns. This is safe.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total endpoints | 133 |
| GET endpoints | 42 |
| POST endpoints | 30 |
| PUT endpoints | 35 |
| DELETE endpoints | 28 |
| Status-change PUTs | 3 (dispatches, reduction-requests, alerts) |
| Special action PUTs | 2 (acknowledge, resolve) |
| Paginated GET endpoints | 39 |
| Non-paginated list GETs | 3 (board-members, isic4 v1 composite, audit composite) |
| Searchable endpoints | 10 |
| Auth-protected endpoints | **0** |
| Audit-logged endpoints | **0** |
| Soft-delete endpoints | 1 (entities) |
| Hard-delete endpoints | 27 |
| SQL injection risks | 8 (3 critical, 5 high) |
| Database tables in schema | 57 |
| Tables with API endpoints | ~28 |
| Tables without API endpoints | ~29 |
| Duplicate API groups | 2 (commercial v1/v2, board-members unpaginated) |
