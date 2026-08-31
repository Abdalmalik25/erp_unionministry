# BI Integration Data Models

This document provides comprehensive documentation of the data models exposed through the OData v4 API for Power BI and Tableau integration.

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CORE ENTITIES                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │   Entity    │────<│   Member    │     │   Worker    │                    │
│  │ (Union/Org) │     │             │     │             │                    │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                    │
│        │                                         │                            │
│        │                                         │                            │
│        ▼                                         ▼                            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │ Inspection  │────<│  Violation  │     │  Employer   │                    │
│  │             │     │             │     │             │                    │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                    │
│                                                 │                            │
│        ┌───────────────────────────────────────┼───────────────────────┐    │
│        │                                       │                       │    │
│        ▼                                       ▼                       ▼    │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐│
│  │  Contract   │────<│   Payment   │     │   License   │     │  Training   ││
│  │             │     │             │     │             │     │             ││
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘│
│                                                                            │
│                              ┌─────────────┐                               │
│                              │  Dispute    │                               │
│                              │             │                               │
│                              └─────────────┘                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Entity Definitions

### Worker

Individual workers registered in the platform.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 12345 |
| full_name_ar | string | Full name in Arabic | أحمد محمد علي |
| full_name_en | string | Full name in English | Ahmed Mohammed Ali |
| national_id | string | National ID number | 1234567890 |
| passport_number | string | Passport number (if applicable) | AB123456 |
| date_of_birth | date | Date of birth | 1990-05-15 |
| place_of_birth | string | Place of birth | Sana'a |
| gender | string | Gender (male/female) | male |
| marital_status | string | Marital status | married |
| nationality | string | Nationality | Yemeni |
| profession | string | Current profession | Software Engineer |
| specialization | string | Area of specialization | Web Development |
| qualification | string | Highest qualification | Bachelor's Degree |
| years_experience | int | Years of professional experience | 5 |
| employer_id | int64 | FK to employer | 5678 |
| contract_type | string | Type of contract | permanent |
| contract_start_date | date | Contract start date | 2023-01-01 |
| contract_end_date | date | Contract end date (if applicable) | null |
| monthly_salary | decimal | Monthly salary amount | 150000 |
| currency | string | Salary currency | YER |
| bank_name | string | Bank name | Central Bank of Yemen |
| bank_account | string | Bank account number | 1234567890 |
| phone | string | Contact phone | +967771234567 |
| email | string | Contact email | ahmed@example.com |
| governorate | string | Governorate of residence | Sana'a |
| district | string | District | Old City |
| address | string | Detailed address | Street 123, Building 4 |
| status | string | Registration status | active |
| work_permit_number | string | Work permit number | WP2023001 |
| work_permit_expiry | date | Work permit expiry | 2025-01-01 |
| insurance_number | string | Social insurance number | SI123456 |
| registration_date | date | Platform registration date | 2023-01-15 |
| created_at | datetime | Record creation timestamp | 2023-01-15T10:30:00Z |
| updated_at | datetime | Record update timestamp | 2024-06-20T14:45:00Z |

### Employer

Business establishments and organizations.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 5678 |
| name_ar | string | Name in Arabic | شركة التقنية المتقدمة |
| name_en | string | Name in English | Advanced Technology Co. |
| registration_number | string | Registration number | RC2023001 |
| commercial_record | string | Commercial record number | CR123456 |
| tax_number | string | Tax identification number | TAX123456 |
| economic_activity | string | Type of economic activity | Information Technology |
| sector | string | Industry sector | Private |
| employee_count | int | Total number of employees | 150 |
| yemeni_count | int | Number of Yemeni employees | 120 |
| expatriate_count | int | Number of expatriate employees | 30 |
| governorate | string | Governorate location | Sana'a |
| district | string | District location | Haddah |
| address | string | Detailed address | Haddah Street, Building 5 |
| phone | string | Contact phone | +9671234567 |
| email | string | Contact email | info@advtech.ye |
| website | string | Company website | www.advtech.ye |
| license_number | string | Business license number | BL2023001 |
| license_expiry | date | License expiry date | 2025-12-31 |
| status | string | Registration status | active |
| entity_type | string | Type of entity | company |
| established_date | date | Date of establishment | 2010-05-20 |
| created_at | datetime | Record creation timestamp | 2023-01-10T09:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-06-15T11:30:00Z |

### Inspection

Workplace inspection records.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 1001 |
| inspection_number | string | Inspection reference number | INS-2024-001 |
| inspection_type | string | Type of inspection | routine |
| status | string | Current status | completed |
| scheduled_date | datetime | Scheduled inspection date | 2024-06-15T09:00:00Z |
| completed_date | datetime | Actual completion date | 2024-06-15T14:30:00Z |
| inspector_id | int64 | FK to inspector user | 100 |
| employer_id | int64 | FK to employer | 5678 |
| governorate | string | Governorate | Sana'a |
| district | string | District | Haddah |
| findings_count | int | Number of findings | 3 |
| violations_count | int | Number of violations | 2 |
| result | string | Inspection result | compliant |
| notes | string | Inspector notes | All safety measures in place |
| recommendations | string | Recommendations | Continue monitoring |
| next_inspection_date | date | Scheduled next inspection | 2024-12-15 |
| created_at | datetime | Record creation timestamp | 2024-06-15T08:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-06-15T15:00:00Z |

### Violation

Labor law violation records.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 2001 |
| violation_code | string | Standard violation code | LAB-2024-001 |
| violation_type | string | Category of violation | safety |
| description | string | Detailed description | Missing fire extinguishers |
| severity | string | Severity level | medium |
| status | string | Resolution status | resolved |
| detected_date | date | Date violation detected | 2024-06-15 |
| resolved_date | date | Date violation resolved | 2024-06-20 |
| fine_amount | decimal | Fine amount (if applicable) | 50000 |
| currency | string | Currency | YER |
| inspection_id | int64 | FK to inspection | 1001 |
| employer_id | int64 | FK to employer | 5678 |
| article_reference | string | Legal article reference | Article 45 |
| corrective_action | string | Required corrective action | Install fire extinguishers |
| deadline | date | Correction deadline | 2024-06-25 |
| created_at | datetime | Record creation timestamp | 2024-06-15T14:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-06-20T10:00:00Z |

### License

Business and work permits.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 3001 |
| license_number | string | License number | LIC-2024-001 |
| type | string | Type of license | business |
| subtype | string | License subtype | commercial |
| status | string | License status | active |
| issue_date | date | Issue date | 2024-01-01 |
| expiry_date | date | Expiry date | 2025-12-31 |
| renewal_date | date | Recommended renewal date | 2025-10-01 |
| holder_type | string | Holder entity type | employer |
| holder_name | string | Name of holder | Advanced Technology Co. |
| holder_id | int64 | FK to holder entity | 5678 |
| issuer | string | Issuing authority | Ministry of Labor |
| issuer_branch | string | Issuing branch | Sana'a |
| fee_amount | decimal | License fee | 100000 |
| fee_paid | boolean | Fee payment status | true |
| conditions | string | License conditions | Subject to labor law |
| restrictions | string | License restrictions | None |
| attachments | string[] | Attachment URLs | [] |
| created_at | datetime | Record creation timestamp | 2024-01-01T09:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-01-15T14:00:00Z |

### Contract

Employment contracts.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 4001 |
| contract_number | string | Contract reference number | CON-2024-001 |
| contract_type | string | Type of contract | permanent |
| status | string | Contract status | active |
| start_date | date | Contract start date | 2024-01-01 |
| end_date | date | Contract end date (if applicable) | null |
| duration_months | int | Contract duration | 24 |
| trial_period_days | int | Trial period days | 90 |
| job_title | string | Job title | Software Engineer |
| job_description | string | Job description | Develop web applications |
| working_hours_per_week | int | Weekly working hours | 40 |
| working_days_per_week | int | Weekly working days | 5 |
| work_location | string | Work location | Office |
| salary_type | string | Salary calculation type | fixed |
| monthly_salary | decimal | Monthly salary | 200000 |
| currency | string | Salary currency | YER |
| payment_frequency | string | Payment frequency | monthly |
| benefits | string | Additional benefits | Health insurance |
| leave_days | int | Annual leave days | 21 |
| overtime_rate | decimal | Overtime rate multiplier | 1.5 |
| notice_period_days | int | Notice period required | 30 |
| worker_id | int64 | FK to worker | 12345 |
| employer_id | int64 | FK to employer | 5678 |
| created_at | datetime | Record creation timestamp | 2024-01-01T10:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-06-15T11:00:00Z |

### Payment

Fee payments and transactions.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 5001 |
| payment_number | string | Payment reference | PAY-2024-001 |
| payment_type | string | Type of payment | subscription |
| status | string | Payment status | paid |
| amount | decimal | Payment amount | 50000 |
| currency | string | Currency | YER |
| due_date | date | Payment due date | 2024-01-31 |
| paid_date | date | Actual payment date | 2024-01-25 |
| payment_method | string | Payment method | bank_transfer |
| reference_number | string | External reference | TRX123456 |
| employer_id | int64 | FK to employer | 5678 |
| worker_id | int64 | FK to worker (if applicable) | null |
| invoice_number | string | Invoice reference | INV-2024-001 |
| period_start | date | Coverage period start | 2024-01-01 |
| period_end | date | Coverage period end | 2024-12-31 |
| notes | string | Payment notes | Annual subscription |
| created_at | datetime | Record creation timestamp | 2024-01-25T10:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-01-25T10:00:00Z |

### Dispute

Labor dispute cases.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 6001 |
| dispute_number | string | Case reference number | DSP-2024-001 |
| dispute_type | string | Type of dispute | termination |
| category | string | Dispute category | wrongful_termination |
| status | string | Case status | resolved |
| filed_date | date | Filing date | 2024-03-01 |
| hearing_date | date | Hearing date | 2024-04-15 |
| resolution_date | date | Resolution date | 2024-05-01 |
| resolution_type | string | How resolved | settlement |
| amount_claimed | decimal | Amount claimed by worker | 500000 |
| amount_awarded | decimal | Amount awarded | 350000 |
| currency | string | Currency | YER |
| description | string | Dispute description | Wrongful termination |
| worker_statement | string | Worker's statement | I was terminated without cause |
| employer_statement | string | Employer's statement | Performance issues |
| witnesses | string | Witness information | 2 witnesses |
| evidence | string[] | Evidence documents | ["contract.pdf"] |
| arbitrator_id | int64 | Assigned arbitrator | 101 |
| outcome | string | Final outcome | Worker awarded compensation |
| appeal_status | string | Appeal status | not_applicable |
| notes | string | Additional notes | Settlement reached |
| worker_id | int64 | FK to worker | 12345 |
| employer_id | int64 | FK to employer | 5678 |
| created_at | datetime | Record creation timestamp | 2024-03-01T09:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-05-01T15:00:00Z |

### Training

Training program records.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 7001 |
| program_code | string | Program code | TRN-2024-001 |
| program_name | string | Training program name | Occupational Safety |
| program_type | string | Training type | certification |
| category | string | Training category | safety |
| status | string | Program status | completed |
| start_date | date | Program start date | 2024-01-15 |
| end_date | date | Program end date | 2024-02-15 |
| duration_hours | int | Total training hours | 40 |
| schedule | string | Training schedule | Weekdays 9AM-3PM |
| location | string | Training location | Ministry Training Center |
| governorate | string | Governorate | Sana'a |
| provider | string | Training provider | Ministry of Labor |
| instructor | string | Lead instructor | Dr. Mohammed Ali |
| cost_per_participant | decimal | Cost per participant | 25000 |
| funding_source | string | Funding source | Government |
| min_participants | int | Minimum participants | 10 |
| max_participants | int | Maximum participants | 30 |
| enrolled_count | int | Number enrolled | 25 |
| completed_count | int | Number completed | 23 |
| certificate_issued | boolean | Certificate issued | true |
| certification_validity_years | int | Certificate validity | 2 |
| prerequisites | string | Entry requirements | Basic literacy |
| objectives | string | Training objectives | Workplace safety awareness |
| curriculum | string | Curriculum summary | Fire safety, first aid, evacuation |
| created_at | datetime | Record creation timestamp | 2023-12-01T10:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-02-15T16:00:00Z |

### TrainingRecord

Individual training participation records.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 8001 |
| training_id | int64 | FK to training program | 7001 |
| worker_id | int64 | FK to worker | 12345 |
| enrollment_date | date | Enrollment date | 2024-01-10 |
| attendance_rate | decimal | Attendance percentage | 95 |
| assessment_score | decimal | Final assessment score | 85 |
| status | string | Completion status | completed |
| certificate_number | string | Certificate number | CERT-2024-001 |
| certificate_issued_date | date | Certificate issue date | 2024-02-20 |
| certificate_expiry_date | date | Certificate expiry date | 2026-02-20 |
| feedback | string | Participant feedback | Very informative |
| employer_feedback | string | Employer feedback | Excellent training |
| created_at | datetime | Record creation timestamp | 2024-01-10T08:00:00Z |
| updated_at | datetime | Record update timestamp | 2024-02-20T12:00:00Z |

### AuditLog

System audit trail.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | int64 | Unique identifier | 9001 |
| timestamp | datetime | Action timestamp | 2024-06-20T14:30:00Z |
| action | string | Action performed | update |
| entity_type | string | Entity affected | Worker |
| entity_id | int64 | ID of affected entity | 12345 |
| user_id | int64 | User who performed action | 100 |
| user_name | string | User display name | John Inspector |
| ip_address | string | Client IP address | 192.168.1.1 |
| user_agent | string | Browser/client info | Mozilla/5.0... |
| old_values | JSON | Previous values | {"status": "pending"} |
| new_values | JSON | New values | {"status": "active"} |
| reason | string | Reason for change | Manual verification |
| metadata | JSON | Additional metadata | {"source": "mobile"} |

## Enumerations

### Status Values

| Value | Description |
|-------|-------------|
| active | Currently active |
| inactive | Currently inactive |
| pending | Awaiting action |
| suspended | Temporarily suspended |
| terminated | Permanently ended |
| deleted | Soft-deleted |

### Gender

| Value | Description |
|-------|-------------|
| male | Male |
| female | Female |

### Contract Type

| Value | Description |
|-------|-------------|
| permanent | Permanent employment |
| temporary | Temporary employment |
| contractor | Contractor |
| probation | Probationary period |
| part_time | Part-time employment |
| seasonal | Seasonal employment |

### Violation Severity

| Value | Description |
|-------|-------------|
| critical | Critical violation |
| high | High severity |
| medium | Medium severity |
| low | Low severity |
| advisory | Advisory notice |

### Inspection Type

| Value | Description |
|-------|-------------|
| routine | Routine inspection |
| complaint | Complaint-based |
| follow_up | Follow-up inspection |
| proactive | Proactive check |
| compliance | Compliance audit |
| emergency | Emergency response |

### Dispute Type

| Value | Description |
|-------|-------------|
| termination | Termination dispute |
| wages | Wage dispute |
| benefits | Benefits dispute |
| harassment | Harassment complaint |
| discrimination | Discrimination case |
| safety | Safety violation |
| contract | Contract dispute |
| other | Other dispute |

## Geographic Hierarchy

### Governorates

1. Sana'a
2. Aden
3. Taiz
4. Ibb
5. Hodeidah
6. Dhamar
7. Al-Mukalla
8. Seyoun
9. Ma'rib
10. Sa'dah
11. Amran
12. Al-Bayda
13. Al-Jawf
14. Hajjah
15. Al-Mahwit
16. Raymah
17. Shabwah
18. Hadramaut
19. Lahij
20. Abyan
