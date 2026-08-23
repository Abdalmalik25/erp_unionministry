# Data Quality Report

Generated: 2026-08-21 17:59:10

**Total entities:** 30 | **Total members:** 45

## 1. Completeness Check

Percentage of non-null, non-empty values for critical columns.

### organizational_entities (30 rows)

| Column | Filled | % Complete |
| --- | --- | --- |
| name_ar | 30 | 100.0% |
| email | 13 | 43.3% |
| phone | 13 | 43.3% |
| governorate | 30 | 100.0% |
| entity_type | 30 | 100.0% |
| status | 30 | 100.0% |
| member_count | 30 | 100.0% |

### members (45 rows)

| Column | Filled | % Complete |
| --- | --- | --- |
| full_name | 45 | 100.0% |
| national_id | 45 | 100.0% |
| gender | 45 | 100.0% |
| profession | 45 | 100.0% |
| governorate | 5 | 11.1% |
| phone | 45 | 100.0% |

### professions (3607 rows)

| Column | Filled | % Complete |
| --- | --- | --- |
| name_ar | 3607 | 100.0% |
| isco_code | 3607 | 100.0% |
| sector | 3607 | 100.0% |

## 2. Referential Integrity

Orphaned records where the foreign key points to a non-existent parent.

| Relationship | Orphaned Records |
| --- | --- |
| members → organizational_entities | 0 |
| violations → organizational_entities | 0 |
| inspections → organizational_entities | table missing: column i.entity_id does not exist |
| activities → organizational_entities | 0 |
| board_members → organizational_entities | 0 |

## 3. Data Distribution

### Entities by entity_type

| Value | Count |
| --- | --- |
| union | 20 |
| organization | 8 |
| federation | 2 |

### Entities by status

| Value | Count |
| --- | --- |
| active | 29 |
| inactive | 1 |

### Entities by governorate

| Value | Count |
| --- | --- |
| صنعاء | 17 |
| عدن | 7 |
| تعز | 3 |
| حضرموت | 1 |
| مأرب | 1 |
| الحديدة | 1 |

### Members by gender

| Value | Count |
| --- | --- |
| male | 28 |
| female | 17 |

### Members by membership_type

| Value | Count |
| --- | --- |
| regular | 26 |
| honorary | 14 |
| عضو دائم | 4 |
| عضو مؤقت | 1 |

## 4. Enum Validation

| Table | Column | Invalid Values | Valid Enums |
| --- | --- | --- | --- |
| organizational_entities | entity_type | None found | union, organization, federation, branch, committee, department, unit, office |
| organizational_entities | status | None found | active, suspended, inactive, dissolved, under_review |
| violations | severity | None found | minor, moderate, major, critical |
| organizational_entities | compliance_status | None found | compliant, non_compliant, under_review, warned, sanctioned |

## 5. Date Analysis

| Check | Count |
| --- | --- |
| Entities with expired licenses (status=valid) | 15 |
| Members with future join_date | 0 |
| Entities with overdue inspections | 0 |

---
*End of Data Quality Report*