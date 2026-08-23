# Domain Glossary — UnionSphere

> Canonical vocabulary for the UnionSphere enterprise system.
> Every term defined with: Arabic name, English name, definition, DB table, API prefix.

---

## Core Entity Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 1 | **Entity** | كيان | Base model for all organizational units in the system. Every organization, establishment, trade union, employer, or worker inherits from this. | `entities` | `/api/v1/entities` |
| 2 | **Organization** | منظمة | A civil society entity (NGO, association, federation, cooperative) registered with the Ministry. | `organizations` | `/api/v1/organizations` |
| 3 | **Establishment** | منشأة | A commercial or industrial facility registered under a commercial license. Includes branches, factories, workshops. | `establishments` | `/api/v1/establishments` |
| 4 | **Trade Union** | نقابة عمالية | An association of workers formed to protect and advance their interests. Registered under labor law. | `trade_unions` | `/api/v1/unions` |
| 5 | **Employer** | صاحب عمل | A natural or legal person who employs workers under a contract of employment. | `employers` | `/api/v1/employers` |
| 6 | **Worker** | عامل | An individual who performs work for an employer under a contract of employment. | `workers` | `/api/v1/workers` |
| 7 | **Member** | عضو | An individual registered as a member of an organization or trade union. | `members` | `/api/v1/members` |

## Identity & Registration Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 8 | **Entity Number** | رقم الكيان | Auto-generated unique identifier for an entity within the system. Format: `ORG-YYYY-NNNN`. | `entities.entity_number` | — |
| 9 | **Registration Number** | رقم القيد | Official registration number assigned by the Ministry upon approval. | `entities.registration_number` | — |
| 10 | **Commercial Register Number** | رقم السجل التجاري | Official commercial registration number issued by the commercial registry. | `establishments.commercial_register_number` | — |
| 11 | **Unified Code** | الكود الموحد | A unique code assigned to an establishment combining multiple registration systems. | `establishments.unified_code` | — |
| 12 | **National ID** | رقم الهوية | National identity number of a person (worker, member, board member). | `workers.national_id` | — |
| 13 | **Tax Number** | الرقم الضريبي | Tax identification number for employers and establishments. | `employers.tax_number` | — |

## Status & Lifecycle Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 14 | **Status** | الحالة | Current lifecycle state of an entity or record. Values: `draft`, `pending`, `active`, `suspended`, `archived`. | `entities.status` | — |
| 15 | **Draft** | مسودة | Initial state. Entity is being prepared but not yet submitted. | — | — |
| 16 | **Pending** | معلق | Entity has been submitted but awaiting review/approval. | — | — |
| 17 | **Active** | نشط | Entity is fully approved and operational. | — | — |
| 18 | **Suspended** | معلق | Entity has been temporarily suspended (e.g., pending compliance). | — | — |
| 19 | **Archived** | مؤرشف | Entity has been archived and is no longer active. | — | — |
| 20 | **Soft Delete** | حذف ناعم | Deletion by setting `deleted_at` timestamp. Record remains in database but is excluded from normal queries. | `entities.deleted_at` | — |
| 21 | **Hard Delete** | حذف جذري | Permanent deletion of a record from the database. **To be eliminated** — all deletes must be soft. | — | — |

## Governance Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 22 | **Board Member** | عضو مجلس | An elected or appointed official serving on the governing board of an organization or union. | `board_members` | `/api/v1/board-members` |
| 23 | **Position** | المنصب | The role or title of a board member (e.g., President, Secretary, Treasurer). | `board_members.position` | — |
| 24 | **Election** | انتخابات | A formal voting process to select board members or leadership. | `elections` | `/api/v1/elections` |
| 25 | **Election Result** | نتيجة الانتخابات | The outcome of an election, including vote counts per candidate. | `election_results` | — |
| 26 | **Term** | الفترة | The duration for which a board member serves (e.g., 2 years). | `board_members.term` | — |

## Worker & Employment Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 27 | **Worker Profile** | ملف العامل | A comprehensive record of a worker's employment history, skills, and status. | `worker_profiles` | `/api/v1/workers` |
| 28 | **Worker Dispatch** | إرسالية عامل | The deployment of a worker to a specific location or employer for a defined period. | `worker_dispatches` | `/api/v1/workforce` |
| 29 | **Worker Reduction** | تخفيض عمال | A formal request to reduce the number of workers at an establishment (layoffs). | `worker_reduction_requests` | `/api/v1/workforce` |
| 30 | **Employment Status** | حالة التوظيف | Current employment state: `active`, `terminated`, `suspended`, `retired`. | `workers.employment_status` | — |
| 31 | **Dispatch Status** | حالة الإرسالية | Lifecycle state of a worker dispatch: `pending`, `approved`, `dispatched`, `returned`, `evaluated`. | `worker_dispatches.status` | — |
| 32 | **Safety Briefing** | إرشادات السلامة | Mandatory safety orientation before dispatch. Required completion flag. | `worker_dispatches.safety_briefing_done` | — |
| 33 | **Medical Clearance** | إجازة طبية | Medical fitness confirmation before dispatch. Required completion flag. | `worker_dispatches.medical_clearance_done` | — |

## Occupation & Classification Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 34 | **Occupation** | مهنة | A defined category of work (e.g., accountant, welder, driver). Includes ISIC-4 classification mapping. | `occupations` | `/api/v1/occupations` |
| 35 | **ISIC-4 Code** | تصنيف ISIC-4 | International Standard Industrial Classification code for categorizing economic activities. | `isic4_classifications` | `/api/v1/occupations` |
| 36 | **Sector** | قطاع | Economic sector classification: `industrial`, `commercial`, `service`, `agricultural`. | `establishments.sector` | — |
| 37 | **Classification** | تصنيف | Establishment size classification: `micro`, `small`, `medium`, `large`. | `establishments.classification` | — |
| 38 | **Hazardous Occupation** | مهنة خطرة | An occupation classified as dangerous under labor law, requiring special protections. | `hazardous_occupations` | `/api/v1/occupations` |
| 39 | **Career Path** | مسار مهني | A defined progression of roles and training for an occupation. | `career_paths` | `/api/v1/occupations` |
| 40 | **Salary Range** | نطاق الراتب | The defined minimum and maximum salary for an occupation or position. | `salary_ranges` | `/api/v1/occupations` |

## Activity & Program Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 41 | **Activity** | نشاط | A planned event, program, or initiative conducted by an organization or establishment. | `activities` | `/api/v1/activities` |
| 42 | **Activity Type** | نوع النشاط | Classification of activity: `training`, `awareness`, `workshop`, `conference`, `inspection`, `campaign`, `social`, `cultural`, `sport`, `charity`, `other`. | `activities.activity_type` | — |
| 43 | **Activity Status** | حالة النشاط | Lifecycle state: `planned`, `approved`, `in_progress`, `completed`, `cancelled`. | `activities.status` | — |
| 44 | **Beneficiaries** | المستفيدون | The individuals or groups who benefit from an activity. Count tracked per activity. | `activities.beneficiaries_count` | — |
| 45 | **Budget** | الميزانية | Allocated financial resources for an activity. | `activities.budget` | — |

## Inspection & Compliance Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 46 | **Inspection** | تفتيش | An official examination of an establishment or organization to verify compliance with labor law. | `inspections` | `/api/v1/inspections` |
| 47 | **Inspection Type** | نوع التفتيش | Classification: `routine`, `follow_up`, `complaint`, `surprise`, `annual`. | `inspections.inspection_type` | — |
| 48 | **Inspection Checklist** | قائمة التفتيش | A predefined set of items to verify during an inspection. | `inspection_checklists` | `/api/v1/inspections` |
| 49 | **Findings** | نتائج التفتيش | Issues or deficiencies identified during an inspection. | `inspections.findings` | — |
| 50 | **Corrective Action** | إجراء تصحيحي | A required fix or improvement identified through inspection or violation. | `inspection_corrective_actions` | — |
| 51 | **Next Inspection Date** | تاريخ التفتيش التالي | Scheduled date for the next follow-up inspection. | `inspections.next_inspection_date` | — |

## Violation & Penalty Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 52 | **Violation** | مخالفة | A breach of labor law, regulations, or compliance requirements. | `violations` | `/api/v1/violations` |
| 53 | **Violation Type** | نوع المخالفة | Classification: `safety`, `labor`, `environmental`, `administrative`, `financial`. | `violations.violation_type` | — |
| 54 | **Violation Status** | حالة المخالفة | Lifecycle: `reported`, `under_investigation`, `confirmed`, `penalized`, `resolved`, `dismissed`. | `violations.status` | — |
| 55 | **Penalty** | غرامة | Financial or administrative penalty imposed for a violation. | `violations.penalty_amount` | — |
| 56 | **Resolution** | تسوية | The final disposition of a violation — corrective action completed, penalty paid, or case dismissed. | `violations.resolution` | — |

## Compliance & Risk Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 57 | **Compliance** | الامتثال | The state of conforming to labor law, regulations, and standards. | `compliance_alerts` | `/api/v1/compliance` |
| 58 | **Compliance Alert** | تنبيه امتثال | An automated or manual alert indicating a potential compliance issue. | `compliance_alerts` | `/api/v1/compliance` |
| 59 | **Compliance Matrix** | مصفوفة الامتثال | A structured checklist of all compliance requirements for an entity type. | `compliance_matrices` | `/api/v1/compliance` |
| 60 | **Risk Assessment** | تقييم المخاطر | An evaluation of potential risks associated with an entity, activity, or occupation. | `risk_assessments` | `/api/v1/risk` |
| 61 | **Risk Level** | مستوى المخاطر | Risk classification: `low`, `medium`, `high`, `critical`. | `entities.risk_level` | — |
| 62 | **Maturity Assessment** | تقييم النضج | An evaluation of an organization's operational maturity across defined dimensions. | `maturity_assessments` | `/api/v1/governance` |

## Document & License Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 63 | **Document** | وثيقة | A file or record attached to an entity, activity, or process. | `documents` | `/api/v1/documents` |
| 64 | **Document Type** | نوع الوثيقة | Classification: `certificate`, `license`, `report`, `contract`, `correspondence`, `other`. | `documents.document_type` | — |
| 65 | **License** | رخصة | An official authorization to conduct a specific activity or operate an establishment. | `licenses` | `/api/v1/licenses` |
| 66 | **License Type** | نوع الرخصة | Classification: `commercial`, `industrial`, `labor`, `environmental`, `safety`. | `licenses.license_type` | — |
| 67 | **License Status** | حالة الرخصة | Lifecycle: `active`, `expired`, `suspended`, `revoked`, `pending_renewal`. | `licenses.status` | — |
| 68 | **Renewal Status** | حالة التجديد | State of the license renewal process: `not_started`, `in_progress`, `renewed`, `expired`. | `licenses.renewal_status` | — |
| 69 | **Evaluation Certificate** | شهادة تقييم | A certificate of evaluation or assessment issued to an entity. | `evaluation_certificates` | `/api/v1/evaluation-certificates` |
| 70 | **Expatriate License** | رخصة أجنبي | A license required to employ foreign workers in Yemen. | `expatriate_licenses` | `/api/v1/licenses` |

## Financial Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 71 | **Fee Payment** | دفع رسوم | A record of fees paid by an entity to the Ministry (registration, license, annual fees). | `fee_payments` | `/api/v1/financial` |
| 72 | **Fee Type** | نوع الرسوم | Classification: `registration`, `license`, `annual`, `inspection`, `penalty`, `other`. | `fee_payments.fee_type` | — |
| 73 | **Payment Status** | حالة الدفع | Lifecycle: `pending`, `paid`, `overdue`, `refunded`, `cancelled`. | `fee_payments.status` | — |
| 74 | **Currency** | العملة | Monetary unit for financial transactions. Default: YER (Yemeni Rial). | `currencies` | `/api/v1/financial` |

## Service & Application Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 75 | **Service** | خدمة | A ministry service available to entities (e.g., registration, renewal, certification). | `services` | `/api/v1/services` |
| 76 | **Service Request** | طلب خدمة | A formal request submitted by an entity to avail a ministry service. | `service_requests` | `/api/v1/applications` |
| 77 | **Request Status** | حالة الطلب | Lifecycle: `submitted`, `under_review`, `approved`, `rejected`, `completed`. | `service_requests.status` | — |
| 78 | **Service Category** | فئة الخدمة | Classification: `registration`, `renewal`, `certification`, `complaint`, `inquiry`. | `services.category` | — |

## Legal Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 79 | **Legal Reference** | مرجع قانوني | A law, regulation, or legal provision that governs labor relations. | `legal_references` | `/api/v1/legal` |
| 80 | **Law Article** | مادة قانونية | A specific article within a law or regulation. | `law_articles` | `/api/v1/legal` |
| 81 | **ILO Convention** | اتفاقية ILO | An International Labour Organization convention ratified by Yemen. | `ilo_conventions` | `/api/v1/legal` |
| 82 | **International Standard** | معيار دولي | An international standard (ISO, ILO) applicable to labor practices. | `international_standards` | `/api/v1/legal` |
| 83 | **Labor Dispute** | نزاع عماري | A conflict between employer and workers regarding rights, wages, or working conditions. | `labor_disputes` | `/api/v1/legal` |
| 84 | **Expert Opinion** | رأي خبير | A formal expert opinion or advisory note on a legal or technical matter. | `expert_opinions` | `/api/v1/legal` |

## Training Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 85 | **Training Record** | سجل تدريب | A record of training completed by a worker or member. | `training_records` | `/api/v1/training` |
| 86 | **Training Type** | نوع التدريب | Classification: `safety`, `skills`, `compliance`, `orientation`, `leadership`. | `training_records.training_type` | — |
| 87 | **Certification** | شهادة | A formal certificate issued upon successful completion of training. | `training_records.certificate_number` | — |

## Notification Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 88 | **Notification** | إشعار | An in-app message sent to a user about events, deadlines, or actions required. | `notifications` | `/api/v1/notifications` |
| 89 | **Notification Type** | نوع الإشعار | Classification: `info`, `warning`, `alert`, `deadline`, `approval_required`. | `notifications.notification_type` | — |
| 90 | **Notification Channel** | قناة الإشعار | Delivery method: `in_app`, `email`, `sms`, `push`. | `notifications.channel` | — |

## Audit & Governance Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 91 | **Audit Log** | سجل التدقيق | A server-generated record of all data modifications, including who, when, and what changed. | `audit_log` | `/api/v1/admin/audit` |
| 92 | **Actor** | الفاعل | The user who performed an action recorded in the audit log. | `audit_log.actor_id` | — |
| 93 | **Old Values** | القيم القديمة | The state of a record before modification (JSON snapshot). | `audit_log.old_values` | — |
| 94 | **New Values** | القيم الجديدة | The state of a record after modification (JSON snapshot). | `audit_log.new_values` | — |
| 95 | **Governance** | الحوكمة | The system of rules, practices, and processes by which an organization is directed and controlled. | `governance` | `/api/v1/governance` |

## User & System Terms

| # | English Name | Arabic Name | Definition | DB Table | API Prefix |
|---|---|---|---|---|---|
| 96 | **User** | مستخدم | A system user with authentication credentials and assigned role. | `users` | `/api/v1/admin/users` |
| 97 | **Role** | دور | A predefined set of permissions assigned to a user (e.g., `super_admin`, `ministry_admin`, `ministry_staff`, `org_manager`, `org_member`). | `roles` | `/api/v1/admin/roles` |
| 98 | **Permission** | صلاحية | A specific action allowed on a resource (e.g., `entities:create`, `violations:read`). | `permissions` | `/api/v1/admin/permissions` |
| 99 | **Profile** | ملف شخصي | User profile information (display name, avatar, preferences). | `profiles` | `/api/v1/admin/profiles` |
| 100 | **Workflow** | سير عمل | A defined sequence of states and transitions for an entity lifecycle. | `workflows` | `/api/v1/workflows` |
| 101 | **Workflow Transition** | انتقال سير عمل | A change from one state to another within a workflow, performed by an authorized actor. | `workflow_transitions` | — |
| 102 | **Backup Log** | سجل النسخ الاحتياطي | A record of database backup operations, including status, size, and duration. | `backup_log` | `/api/v1/admin/backup` |
| 103 | **Data Retention** | الاحتفاظ بالبيانات | Policies and records governing how long data is retained before deletion. | `data_retention_log` | `/api/v1/admin/retention` |
| 104 | **Error Log** | سجل الأخطاء | Server-side error recording with timestamps, stack traces, and context. | `error_log` | `/api/v1/admin/errors` |
| 105 | **Smart Suggestion** | اقتراح ذكي | AI-generated suggestion for actions, improvements, or risk mitigation. | `smart_suggestions` | `/api/v1/ai/suggestions` |

---

## Cross-Reference: Current DB Tables → Target Domains

| Current Table | Target Domain | Notes |
|---|---|---|
| `organizational_entities` | Entity Core | Will be renamed to `entities` |
| `members` | Members | Will add `person_id` FK |
| `activities` | Activities | Already domain-ready |
| `elections` | Trade Unions | Union-specific |
| `election_results` | Trade Unions | Union-specific |
| `documents` | Documents | Already domain-ready |
| `violations` | Violations | Already domain-ready |
| `professions` | Occupations | Will be renamed to `occupations` |
| `isic4_classifications` | Occupations | Reference data |
| `services` | Services | Already domain-ready |
| `service_requests` | Applications | Will be renamed to `applications` |
| `worker_profiles` | Workers | Will be merged into `workers` |
| `worker_dispatches` | Workforce | Already domain-ready |
| `worker_reduction_requests` | Workforce | Already domain-ready |
| `compliance_alerts` | Compliance | Already domain-ready |
| `compliance_matrices` | Compliance | Already domain-ready |
| `risk_assessments` | Risk | Already domain-ready |
| `maturity_assessments` | Governance | Already domain-ready |
| `board_members` | Governance | Already domain-ready |
| `licenses` | Licenses | Already domain-ready |
| `expatriate_licenses` | Licenses | Will be merged |
| `inspections` | Inspections | Already domain-ready |
| `inspection_checklists` | Inspections | Already domain-ready |
| `evaluation_certificates` | Licenses | Will be merged |
| `training_records` | Training | Already domain-ready |
| `fee_payments` | Financial | Already domain-ready |
| `labor_disputes` | Legal | Already domain-ready |
| `legal_references` | Legal | Already domain-ready |
| `law_articles` | Legal | Already domain-ready |
| `ilo_conventions` | Legal | Already domain-ready |
| `international_standards` | Legal | Already domain-ready |
| `expert_opinions` | Legal | Already domain-ready |
| `notifications` | Notifications | Already domain-ready |
| `audit_log` | Administration | Already domain-ready |
| `profiles` | Administration | Will be merged into `users` |
| `governorates` | Reference | Already domain-ready |
| `currencies` | Reference | Already domain-ready |
| `contract_types` | Reference | Already domain-ready |
| `governance` | Governance | New domain |
| `backup_log` | Administration | Already domain-ready |
| `data_retention_log` | Administration | Already domain-ready |
| `error_log` | Administration | Already domain-ready |
| `smart_suggestions` | AI | New domain |
| `dynamic_fields` | Entity Core | Extension mechanism |
| `institutional_templates` | Reference | Already domain-ready |
| `schema_migrations` | Administration | Already domain-ready |
| `commercial_establishments` | Establishments | Will be merged into `establishments` |
| `commercial_branches` | Establishments | Already domain-ready |
| `commercial_contracts` | Establishments | Already domain-ready |
| `commercial_equipment` | Establishments | Already domain-ready |
| `commercial_warehouses` | Establishments | Already domain-ready |
| `enterprise_evaluation_levels` | Establishments | Already domain-ready |
| `enterprise_isic_links` | Establishments | Junction table |
| `enterprise_occupation_links` | Establishments | Junction table |
| `enterprise_slots` | Establishments | Already domain-ready |
| `entity_relationships` | Entity Core | Cross-entity links |
| `hazardous_occupations` | Occupations | Already domain-ready |
| `career_paths` | Occupations | Already domain-ready |
| `salary_ranges` | Occupations | Already domain-ready |
| `worker_procedures` | Workers | Already domain-ready |
