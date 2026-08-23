# Database Inventory: unionministrydb

> Generated: 2026-08-21T17:57:46.745Z
> Engine: PostgreSQL 17.11 (df1f1a3) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 12.2.0-14+deb12u1) 12.2.0, 64-bit

## 1. Tables with Row Counts

| tablename | column_count | row_count |
| --- | --- | --- |
| activities | 31 | 28 |
| audit_log | 16 | 75 |
| backup_log | 13 | 0 |
| board_members | 15 | 15 |
| career_paths | 9 | 0 |
| commercial_branches | 13 | 0 |
| commercial_contracts | 11 | 0 |
| commercial_equipment | 9 | 0 |
| commercial_establishments | 26 | 12 |
| commercial_warehouses | 9 | 0 |
| compliance_alerts | 23 | 15 |
| compliance_matrices | 14 | 0 |
| contract_types | 7 | 4 |
| currencies | 9 | 5 |
| data_retention_log | 8 | 0 |
| documents | 27 | 38 |
| dynamic_fields | 7 | 0 |
| election_results | 9 | 0 |
| elections | 26 | 1 |
| enterprise_evaluation_levels | 7 | 6 |
| enterprise_isic_links | 8 | 0 |
| enterprise_occupation_links | 26 | 0 |
| enterprise_slots | 14 | 0 |
| entity_relationships | 12 | 10 |
| error_log | 14 | 0 |
| evaluation_certificates | 23 | 0 |
| expatriate_licenses | 15 | 14 |
| expert_opinions | 12 | 0 |
| fee_payments | 18 | 20 |
| governorates | 8 | 20 |
| hazardous_occupations | 19 | 0 |
| ilo_conventions | 9 | 8 |
| inspection_checklists | 9 | 0 |
| inspections | 33 | 30 |
| institutional_templates | 8 | 3 |
| international_standards | 11 | 7 |
| isic4_classifications | 25 | 65 |
| labor_disputes | 16 | 12 |
| law_articles | 10 | 8 |
| legal_references | 9 | 13 |
| licenses | 17 | 20 |
| maturity_assessments | 19 | 0 |
| members | 36 | 45 |
| notifications | 11 | 0 |
| organizational_entities | 106 | 30 |
| professions | 96 | 3607 |
| profiles | 16 | 1 |
| reports | 12 | 0 |
| risk_assessments | 16 | 2 |
| salary_ranges | 10 | 0 |
| schema_migrations | 4 | 1 |
| sector_users | 13 | 8 |
| service_requests | 16 | 3 |
| services | 14 | 12 |
| smart_suggestions | 10 | 0 |
| training_records | 23 | 15 |
| violations | 26 | 41 |
| worker_dispatches | 36 | 12 |
| worker_procedures | 11 | 5 |
| worker_profiles | 23 | 18 |
| worker_reduction_requests | 41 | 10 |


> **Total tables: 61**


## 2. All Columns

| table_name | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| activities | id | uuid | NO | uuid_generate_v4() |
| activities | entity_id | uuid | NO |  |
| activities | activity_number | text | NO |  |
| activities | activity_name | text | NO |  |
| activities | activity_type | USER-DEFINED | NO |  |
| activities | status | USER-DEFINED | NO | 'planned'::activity_status |
| activities | start_date | date | NO |  |
| activities | end_date | date | YES |  |
| activities | actual_start_date | date | YES |  |
| activities | actual_end_date | date | YES |  |
| activities | location | text | YES |  |
| activities | description | text | YES |  |
| activities | objectives | text | YES |  |
| activities | outcomes | text | YES |  |
| activities | responsible | text | YES |  |
| activities | notes | text | YES |  |
| activities | planned_participants | integer | YES | 0 |
| activities | actual_participants | integer | YES | 0 |
| activities | beneficiaries_count | integer | YES | 0 |
| activities | male_participants | integer | YES | 0 |
| activities | female_participants | integer | YES | 0 |
| activities | budget | numeric | YES |  |
| activities | actual_cost | numeric | YES |  |
| activities | funding_source | text | YES |  |
| activities | created_at | timestamp with time zone | NO | now() |
| activities | created_by | uuid | YES |  |
| activities | updated_at | timestamp with time zone | NO | now() |
| activities | updated_by | uuid | YES |  |
| activities | metadata | jsonb | YES | '{}'::jsonb |
| activities | deleted_at | timestamp with time zone | YES |  |
| activities | deleted_by | uuid | YES |  |
| audit_log | id | uuid | NO | uuid_generate_v4() |
| audit_log | table_name | text | NO |  |
| audit_log | record_id | uuid | NO |  |
| audit_log | action | text | NO |  |
| audit_log | actor_id | uuid | YES |  |
| audit_log | actor_email | text | YES |  |
| audit_log | actor_role | text | YES |  |
| audit_log | old_values | jsonb | YES |  |
| audit_log | new_values | jsonb | YES |  |
| audit_log | changed_fields | ARRAY | YES |  |
| audit_log | ip_address | inet | YES |  |
| audit_log | user_agent | text | YES |  |
| audit_log | session_id | text | YES |  |
| audit_log | entity_id | uuid | YES |  |
| audit_log | notes | text | YES |  |
| audit_log | created_at | timestamp with time zone | NO | now() |
| backup_log | id | uuid | NO | uuid_generate_v4() |
| backup_log | backup_type | USER-DEFINED | NO | 'full'::backup_type |
| backup_log | status | text | NO | 'pending'::text |
| backup_log | file_path | text | YES |  |
| backup_log | file_size | bigint | YES |  |
| backup_log | duration_ms | integer | YES |  |
| backup_log | tables_included | ARRAY | YES |  |
| backup_log | records_count | integer | YES |  |
| backup_log | compressed | boolean | YES | true |
| backup_log | encrypted | boolean | YES | true |
| backup_log | error_message | text | YES |  |
| backup_log | created_at | timestamp with time zone | NO | now() |
| backup_log | completed_at | timestamp with time zone | YES |  |
| board_members | id | uuid | NO | uuid_generate_v4() |
| board_members | entity_id | uuid | NO |  |
| board_members | full_name | text | NO |  |
| board_members | national_id | text | YES |  |
| board_members | position | text | NO |  |
| board_members | appointment_date | date | NO |  |
| board_members | end_date | date | YES |  |
| board_members | term | text | YES |  |
| board_members | phone | text | YES |  |
| board_members | email | text | YES |  |
| board_members | is_active | boolean | NO | true |
| board_members | created_at | timestamp with time zone | NO | now() |
| board_members | updated_at | timestamp with time zone | NO | now() |
| board_members | deleted_at | timestamp with time zone | YES |  |
| board_members | deleted_by | uuid | YES |  |
| career_paths | id | uuid | NO | uuid_generate_v4() |
| career_paths | occupation_id | uuid | NO |  |
| career_paths | entry_level | text | NO |  |
| career_paths | progression_levels | ARRAY | YES |  |
| career_paths | promotion_criteria | text | YES |  |
| career_paths | training_path | ARRAY | YES |  |
| career_paths | certification_requirements | ARRAY | YES |  |
| career_paths | lateral_moves | ARRAY | YES |  |
| career_paths | created_at | timestamp with time zone | NO | now() |
| commercial_branches | id | uuid | NO | uuid_generate_v4() |
| commercial_branches | enterprise_id | uuid | NO |  |
| commercial_branches | branch_name | text | NO |  |
| commercial_branches | branch_type | text | YES | 'subsidiary'::text |
| commercial_branches | governorate | text | YES |  |
| commercial_branches | city | text | YES |  |
| commercial_branches | address | text | YES |  |
| commercial_branches | phone | text | YES |  |
| commercial_branches | manager_name | text | YES |  |
| commercial_branches | employees_count | integer | YES | 0 |
| commercial_branches | is_active | boolean | YES | true |
| commercial_branches | created_at | timestamp with time zone | NO | now() |
| commercial_branches | updated_at | timestamp with time zone | NO | now() |
| commercial_contracts | id | uuid | NO | uuid_generate_v4() |
| commercial_contracts | enterprise_id | uuid | NO |  |
| commercial_contracts | contract_number | text | NO |  |
| commercial_contracts | contract_type | text | NO |  |
| commercial_contracts | party_name | text | NO |  |
| commercial_contracts | start_date | date | NO |  |
| commercial_contracts | end_date | date | YES |  |
| commercial_contracts | value | numeric | YES |  |
| commercial_contracts | status | USER-DEFINED | NO | 'active'::contract_status |
| commercial_contracts | created_at | timestamp with time zone | NO | now() |
| commercial_contracts | updated_at | timestamp with time zone | NO | now() |
| commercial_equipment | id | uuid | NO | uuid_generate_v4() |
| commercial_equipment | enterprise_id | uuid | NO |  |
| commercial_equipment | name | text | NO |  |
| commercial_equipment | serial_number | text | YES |  |
| commercial_equipment | equipment_type | text | YES |  |
| commercial_equipment | purchase_date | date | YES |  |
| commercial_equipment | value | numeric | YES |  |
| commercial_equipment | is_active | boolean | YES | true |
| commercial_equipment | created_at | timestamp with time zone | NO | now() |
| commercial_establishments | id | uuid | NO | uuid_generate_v4() |
| commercial_establishments | establishment_id | text | NO |  |
| commercial_establishments | unified_code | text | NO |  |
| commercial_establishments | commercial_register_number | text | NO |  |
| commercial_establishments | name_ar | text | NO |  |
| commercial_establishments | name_en | text | YES |  |
| commercial_establishments | entity_type | USER-DEFINED | YES | 'company'::commercial_entity_type |
| commercial_establishments | sector | USER-DEFINED | YES |  |
| commercial_establishments | classification | USER-DEFINED | YES |  |
| commercial_establishments | status | USER-DEFINED | NO | 'active'::entity_status |
| commercial_establishments | governorate | text | YES |  |
| commercial_establishments | city | text | YES |  |
| commercial_establishments | address | text | YES |  |
| commercial_establishments | phone | text | YES |  |
| commercial_establishments | email | text | YES |  |
| commercial_establishments | owner_name | text | YES |  |
| commercial_establishments | capital_amount | numeric | YES |  |
| commercial_establishments | employees_count | integer | YES | 0 |
| commercial_establishments | license_number | text | YES |  |
| commercial_establishments | license_date | date | YES |  |
| commercial_establishments | expiry_date | date | YES |  |
| commercial_establishments | metadata | jsonb | YES | '{}'::jsonb |
| commercial_establishments | created_at | timestamp with time zone | NO | now() |
| commercial_establishments | updated_at | timestamp with time zone | NO | now() |
| commercial_establishments | deleted_at | timestamp with time zone | YES |  |
| commercial_establishments | deleted_by | uuid | YES |  |
| commercial_warehouses | id | uuid | NO | uuid_generate_v4() |
| commercial_warehouses | enterprise_id | uuid | NO |  |
| commercial_warehouses | name | text | NO |  |
| commercial_warehouses | location | text | YES |  |
| commercial_warehouses | area | numeric | YES |  |
| commercial_warehouses | capacity | text | YES |  |
| commercial_warehouses | manager_name | text | YES |  |
| commercial_warehouses | is_active | boolean | YES | true |
| commercial_warehouses | created_at | timestamp with time zone | NO | now() |
| compliance_alerts | id | uuid | NO | uuid_generate_v4() |
| compliance_alerts | enterprise_id | uuid | NO |  |
| compliance_alerts | enterprise_name | text | YES |  |
| compliance_alerts | alert_type | text | NO |  |
| compliance_alerts | severity | text | NO | 'warning'::text |
| compliance_alerts | title | text | NO |  |
| compliance_alerts | description | text | YES |  |
| compliance_alerts | source_table | text | YES |  |
| compliance_alerts | source_id | uuid | YES |  |
| compliance_alerts | due_date | date | YES |  |
| compliance_alerts | is_acknowledged | boolean | YES | false |
| compliance_alerts | acknowledged_by | uuid | YES |  |
| compliance_alerts | acknowledged_at | timestamp with time zone | YES |  |
| compliance_alerts | resolution_notes | text | YES |  |
| compliance_alerts | resolved_at | timestamp with time zone | YES |  |
| compliance_alerts | resolved_by | uuid | YES |  |
| compliance_alerts | is_resolved | boolean | YES | false |
| compliance_alerts | notification_sent | boolean | YES | false |
| compliance_alerts | metadata | jsonb | YES | '{}'::jsonb |
| compliance_alerts | created_at | timestamp with time zone | NO | now() |
| compliance_alerts | updated_at | timestamp with time zone | NO | now() |
| compliance_alerts | deleted_at | timestamp with time zone | YES |  |
| compliance_alerts | deleted_by | uuid | YES |  |
| compliance_matrices | id | uuid | NO | uuid_generate_v4() |
| compliance_matrices | enterprise_id | uuid | NO |  |
| compliance_matrices | occupation_id | uuid | YES |  |
| compliance_matrices | occupation_type | text | YES | 'جميع المهن'::text |
| compliance_matrices | article_number | text | NO |  |
| compliance_matrices | article_title | text | NO |  |
| compliance_matrices | compliance_status | text | NO | 'يحتاج مراجعة'::text |
| compliance_matrices | notes | text | YES |  |
| compliance_matrices | checked_at | timestamp with time zone | YES | now() |
| compliance_matrices | checked_by | uuid | YES |  |
| compliance_matrices | created_at | timestamp with time zone | NO | now() |
| compliance_matrices | updated_at | timestamp with time zone | NO | now() |
| compliance_matrices | deleted_at | timestamp with time zone | YES |  |
| compliance_matrices | deleted_by | uuid | YES |  |
| contract_types | id | uuid | NO | uuid_generate_v4() |
| contract_types | type_name | text | NO |  |
| contract_types | duration | text | YES |  |
| contract_types | renewal_policy | text | YES |  |
| contract_types | termination_notice | text | YES |  |
| contract_types | legal_basis | text | YES |  |
| contract_types | created_at | timestamp with time zone | NO | now() |
| currencies | id | uuid | NO | uuid_generate_v4() |
| currencies | code | text | NO |  |
| currencies | symbol | text | NO |  |
| currencies | name_ar | text | NO |  |
| currencies | name_en | text | YES |  |
| currencies | decimals | integer | YES | 2 |
| currencies | locale | text | YES | 'ar'::text |
| currencies | is_active | boolean | YES | true |
| currencies | created_at | timestamp with time zone | NO | now() |
| data_retention_log | id | uuid | NO | uuid_generate_v4() |
| data_retention_log | table_name | text | NO |  |
| data_retention_log | records_affected | integer | NO |  |
| data_retention_log | action | text | NO |  |
| data_retention_log | criteria | text | YES |  |
| data_retention_log | executed_by | uuid | YES |  |
| data_retention_log | executed_at | timestamp with time zone | NO | now() |
| data_retention_log | notes | text | YES |  |
| documents | id | uuid | NO | uuid_generate_v4() |
| documents | entity_id | uuid | NO |  |
| documents | document_number | text | YES |  |
| documents | document_name | text | NO |  |
| documents | document_type | text | NO |  |
| documents | status | USER-DEFINED | NO | 'draft'::document_status |
| documents | issue_date | date | YES |  |
| documents | expiry_date | date | YES |  |
| documents | submission_date | date | YES |  |
| documents | approval_date | date | YES |  |
| documents | issuing_authority | text | YES |  |
| documents | issuing_officer | text | YES |  |
| documents | approving_officer | text | YES |  |
| documents | description | text | YES |  |
| documents | notes | text | YES |  |
| documents | rejection_reason | text | YES |  |
| documents | tags | ARRAY | YES |  |
| documents | file_url | text | YES |  |
| documents | file_name | text | YES |  |
| documents | file_size | bigint | YES |  |
| documents | file_type | text | YES |  |
| documents | created_at | timestamp with time zone | NO | now() |
| documents | created_by | uuid | YES |  |
| documents | updated_at | timestamp with time zone | NO | now() |
| documents | updated_by | uuid | YES |  |
| documents | deleted_at | timestamp with time zone | YES |  |
| documents | deleted_by | uuid | YES |  |
| dynamic_fields | id | uuid | NO | uuid_generate_v4() |
| dynamic_fields | entity_id | uuid | NO |  |
| dynamic_fields | field_name | text | NO |  |
| dynamic_fields | field_value | text | YES |  |
| dynamic_fields | field_type | text | NO |  |
| dynamic_fields | created_at | timestamp with time zone | NO | now() |
| dynamic_fields | updated_at | timestamp with time zone | NO | now() |
| election_results | id | uuid | NO | uuid_generate_v4() |
| election_results | election_id | uuid | NO |  |
| election_results | member_id | uuid | YES |  |
| election_results | candidate_name | text | NO |  |
| election_results | position | text | NO |  |
| election_results | votes_received | integer | NO | 0 |
| election_results | rank | integer | YES |  |
| election_results | is_winner | boolean | NO | false |
| election_results | created_at | timestamp with time zone | NO | now() |
| elections | id | uuid | NO | uuid_generate_v4() |
| elections | entity_id | uuid | NO |  |
| elections | election_number | text | NO |  |
| elections | title | text | NO |  |
| elections | election_type | text | NO | 'general'::text |
| elections | status | USER-DEFINED | NO | 'planned'::election_status |
| elections | planned_date | date | NO |  |
| elections | start_date | date | YES |  |
| elections | end_date | date | YES |  |
| elections | result_date | date | YES |  |
| elections | next_election_date | date | YES |  |
| elections | eligible_voters | integer | YES | 0 |
| elections | actual_voters | integer | YES | 0 |
| elections | voter_turnout | numeric | YES |  |
| elections | candidates_count | integer | YES | 0 |
| elections | positions_count | integer | YES | 0 |
| elections | supervised_by | text | YES |  |
| elections | supervision_entity | text | YES |  |
| elections | venue | text | YES |  |
| elections | notes | text | YES |  |
| elections | created_at | timestamp with time zone | NO | now() |
| elections | created_by | uuid | YES |  |
| elections | updated_at | timestamp with time zone | NO | now() |
| elections | updated_by | uuid | YES |  |
| elections | deleted_at | timestamp with time zone | YES |  |
| elections | deleted_by | uuid | YES |  |
| enterprise_compliance_summary | entity_id | uuid | YES |  |
| enterprise_compliance_summary | name_ar | text | YES |  |
| enterprise_compliance_summary | governorate | text | YES |  |
| enterprise_compliance_summary | total_inspections | bigint | YES |  |
| enterprise_compliance_summary | last_inspection | date | YES |  |
| enterprise_compliance_summary | avg_inspection_score | numeric | YES |  |
| enterprise_compliance_summary | valid_certificates | bigint | YES |  |
| enterprise_compliance_summary | linked_occupations | bigint | YES |  |
| enterprise_compliance_summary | avg_compliance_score | numeric | YES |  |
| enterprise_evaluation_levels | id | uuid | NO | uuid_generate_v4() |
| enterprise_evaluation_levels | level_name | text | NO |  |
| enterprise_evaluation_levels | level_key | USER-DEFINED | NO |  |
| enterprise_evaluation_levels | min_score | numeric | NO |  |
| enterprise_evaluation_levels | requirements | ARRAY | YES |  |
| enterprise_evaluation_levels | benefits | ARRAY | YES |  |
| enterprise_evaluation_levels | created_at | timestamp with time zone | NO | now() |
| enterprise_isic_links | id | uuid | NO | uuid_generate_v4() |
| enterprise_isic_links | enterprise_id | uuid | NO |  |
| enterprise_isic_links | isic_code | text | NO |  |
| enterprise_isic_links | is_primary | boolean | YES | false |
| enterprise_isic_links | assigned_date | date | NO | CURRENT_DATE |
| enterprise_isic_links | assigned_by | uuid | YES |  |
| enterprise_isic_links | notes | text | YES |  |
| enterprise_isic_links | created_at | timestamp with time zone | NO | now() |
| enterprise_occupation_links | id | uuid | NO | uuid_generate_v4() |
| enterprise_occupation_links | enterprise_id | uuid | NO |  |
| enterprise_occupation_links | occupation_id | uuid | NO |  |
| enterprise_occupation_links | enterprise_name | text | NO |  |
| enterprise_occupation_links | cr_number | text | YES |  |
| enterprise_occupation_links | occupation_code | text | NO |  |
| enterprise_occupation_links | occupation_name_ar | text | NO |  |
| enterprise_occupation_links | isco_code | text | YES |  |
| enterprise_occupation_links | department | text | YES |  |
| enterprise_occupation_links | allocated_headcount | integer | NO | 0 |
| enterprise_occupation_links | yemeni_headcount | integer | NO | 0 |
| enterprise_occupation_links | expatriate_headcount | integer | NO | 0 |
| enterprise_occupation_links | salary_scale | text | YES |  |
| enterprise_occupation_links | contract_types | ARRAY | YES |  |
| enterprise_occupation_links | yemenization_policy | text | YES |  |
| enterprise_occupation_links | link_status | text | NO | 'نشط'::text |
| enterprise_occupation_links | compliance_score | numeric | YES | 0 |
| enterprise_occupation_links | labor_law_compliant | boolean | YES | false |
| enterprise_occupation_links | salary_compliant | boolean | YES | false |
| enterprise_occupation_links | osh_compliant | boolean | YES | false |
| enterprise_occupation_links | medical_checks_done | boolean | YES | false |
| enterprise_occupation_links | yemenization_compliant | boolean | YES | false |
| enterprise_occupation_links | created_at | timestamp with time zone | NO | now() |
| enterprise_occupation_links | updated_at | timestamp with time zone | NO | now() |
| enterprise_occupation_links | deleted_at | timestamp with time zone | YES |  |
| enterprise_occupation_links | deleted_by | uuid | YES |  |
| enterprise_slots | id | uuid | NO | uuid_generate_v4() |
| enterprise_slots | enterprise_id | uuid | NO |  |
| enterprise_slots | slot_code | text | NO |  |
| enterprise_slots | job_title | text | NO |  |
| enterprise_slots | occupation_id | uuid | YES |  |
| enterprise_slots | contract_type | text | YES | 'دائم'::text |
| enterprise_slots | evaluation_status | text | YES | 'مسودة'::text |
| enterprise_slots | allocated_count | integer | YES | 1 |
| enterprise_slots | yemeni_count | integer | YES | 0 |
| enterprise_slots | expatriate_count | integer | YES | 0 |
| enterprise_slots | salary_range | text | YES |  |
| enterprise_slots | status | text | YES | 'نشط'::text |
| enterprise_slots | created_at | timestamp with time zone | NO | now() |
| enterprise_slots | updated_at | timestamp with time zone | NO | now() |
| entities_summary | entity_id | uuid | YES |  |
| entities_summary | unified_code | text | YES |  |
| entities_summary | registration_number | text | YES |  |
| entities_summary | name_ar | text | YES |  |
| entities_summary | name_en | text | YES |  |
| entities_summary | entity_type | USER-DEFINED | YES |  |
| entities_summary | classification | USER-DEFINED | YES |  |
| entities_summary | sector | USER-DEFINED | YES |  |
| entities_summary | legal_form | USER-DEFINED | YES |  |
| entities_summary | status | USER-DEFINED | YES |  |
| entities_summary | compliance_status | USER-DEFINED | YES |  |
| entities_summary | risk_level | USER-DEFINED | YES |  |
| entities_summary | license_status | USER-DEFINED | YES |  |
| entities_summary | governorate | text | YES |  |
| entities_summary | city | text | YES |  |
| entities_summary | member_count | integer | YES |  |
| entities_summary | branch_count | integer | YES |  |
| entities_summary | annual_budget | numeric | YES |  |
| entities_summary | next_renewal_date | date | YES |  |
| entities_summary | renewal_status | USER-DEFINED | YES |  |
| entities_summary | last_inspection_date | date | YES |  |
| entities_summary | inspection_score | numeric | YES |  |
| entities_summary | establishment_date | date | YES |  |
| entities_summary | registration_date | date | YES |  |
| entities_summary | president_name | text | YES |  |
| entities_summary | president_phone | text | YES |  |
| entities_summary | phone | text | YES |  |
| entities_summary | email | text | YES |  |
| entities_summary | parent_name | text | YES |  |
| entities_summary | created_at | timestamp with time zone | YES |  |
| entities_summary | updated_at | timestamp with time zone | YES |  |
| entity_relationships | id | uuid | NO | uuid_generate_v4() |
| entity_relationships | source_entity_id | uuid | NO |  |
| entity_relationships | target_entity_id | uuid | NO |  |
| entity_relationships | relationship_type | text | NO |  |
| entity_relationships | relationship_level | integer | YES |  |
| entity_relationships | start_date | date | YES |  |
| entity_relationships | end_date | date | YES |  |
| entity_relationships | status | text | NO | 'active'::text |
| entity_relationships | metadata | jsonb | YES | '{}'::jsonb |
| entity_relationships | created_at | timestamp with time zone | NO | now() |
| entity_relationships | deleted_at | timestamp with time zone | YES |  |
| entity_relationships | deleted_by | uuid | YES |  |
| error_log | id | uuid | NO | uuid_generate_v4() |
| error_log | error_code | text | NO |  |
| error_log | message | text | NO |  |
| error_log | severity | USER-DEFINED | NO | 'error'::error_severity |
| error_log | category | USER-DEFINED | NO | 'system'::error_category |
| error_log | stack_trace | text | YES |  |
| error_log | entity_id | uuid | YES |  |
| error_log | user_id | uuid | YES |  |
| error_log | ip_address | inet | YES |  |
| error_log | user_agent | text | YES |  |
| error_log | status | text | YES | 'new'::text |
| error_log | resolved_at | timestamp with time zone | YES |  |
| error_log | resolved_by | uuid | YES |  |
| error_log | created_at | timestamp with time zone | NO | now() |
| evaluation_certificates | id | uuid | NO | uuid_generate_v4() |
| evaluation_certificates | enterprise_id | uuid | NO |  |
| evaluation_certificates | inspection_id | uuid | YES |  |
| evaluation_certificates | certificate_number | text | NO |  |
| evaluation_certificates | issue_date | date | NO | CURRENT_DATE |
| evaluation_certificates | validity_period | integer | NO | 365 |
| evaluation_certificates | expiry_date | date | NO |  |
| evaluation_certificates | overall_score | numeric | NO | 0 |
| evaluation_certificates | status | USER-DEFINED | NO | 'صالحة'::certificate_status |
| evaluation_certificates | labor_law_compliance | boolean | YES | false |
| evaluation_certificates | safety_compliance | boolean | YES | false |
| evaluation_certificates | training_compliance | boolean | YES | false |
| evaluation_certificates | yemenization_compliance | boolean | YES | false |
| evaluation_certificates | certified_occupations | ARRAY | YES |  |
| evaluation_certificates | evaluation_summary | text | YES |  |
| evaluation_certificates | issued_by | text | YES |  |
| evaluation_certificates | approved_by | text | YES |  |
| evaluation_certificates | qr_code_data | text | YES |  |
| evaluation_certificates | attachments | jsonb | YES | '[]'::jsonb |
| evaluation_certificates | created_at | timestamp with time zone | NO | now() |
| evaluation_certificates | updated_at | timestamp with time zone | NO | now() |
| evaluation_certificates | deleted_at | timestamp with time zone | YES |  |
| evaluation_certificates | deleted_by | uuid | YES |  |
| expatriate_licenses | id | uuid | NO | uuid_generate_v4() |
| expatriate_licenses | enterprise_id | uuid | NO |  |
| expatriate_licenses | link_id | uuid | YES |  |
| expatriate_licenses | expatriate_name | text | NO |  |
| expatriate_licenses | expatriate_nationality | text | NO |  |
| expatriate_licenses | passport_number | text | YES |  |
| expatriate_licenses | license_number | text | NO |  |
| expatriate_licenses | issue_date | date | NO |  |
| expatriate_licenses | expiry_date | date | NO |  |
| expatriate_licenses | linked_replacement_plan | text | YES |  |
| expatriate_licenses | status | USER-DEFINED | NO | 'نشط'::expatriate_status |
| expatriate_licenses | created_at | timestamp with time zone | NO | now() |
| expatriate_licenses | updated_at | timestamp with time zone | NO | now() |
| expatriate_licenses | deleted_at | timestamp with time zone | YES |  |
| expatriate_licenses | deleted_by | uuid | YES |  |
| expert_opinions | id | uuid | NO | uuid_generate_v4() |
| expert_opinions | occupation_id | uuid | NO |  |
| expert_opinions | expert_name | text | NO |  |
| expert_opinions | expert_role | text | YES |  |
| expert_opinions | submitted_at | timestamp with time zone | NO | now() |
| expert_opinions | notes | text | YES |  |
| expert_opinions | skill_rating | integer | YES |  |
| expert_opinions | responsibility_rating | integer | YES |  |
| expert_opinions | autonomy_rating | integer | YES |  |
| expert_opinions | complexity_rating | integer | YES |  |
| expert_opinions | hazard_rating | integer | YES |  |
| expert_opinions | created_at | timestamp with time zone | NO | now() |
| fee_payments | id | uuid | NO | uuid_generate_v4() |
| fee_payments | entity_id | uuid | YES |  |
| fee_payments | member_id | uuid | YES |  |
| fee_payments | service_id | uuid | YES |  |
| fee_payments | amount | numeric | NO |  |
| fee_payments | currency | text | NO | 'YER'::text |
| fee_payments | payment_method | text | NO | 'cash'::text |
| fee_payments | receipt_number | text | YES |  |
| fee_payments | payment_date | date | NO | CURRENT_DATE |
| fee_payments | status | text | NO | 'pending'::text |
| fee_payments | description | text | YES |  |
| fee_payments | processed_by | uuid | YES |  |
| fee_payments | notes | text | YES |  |
| fee_payments | metadata | jsonb | YES | '{}'::jsonb |
| fee_payments | created_at | timestamp with time zone | NO | now() |
| fee_payments | updated_at | timestamp with time zone | NO | now() |
| fee_payments | deleted_at | timestamp with time zone | YES |  |
| fee_payments | deleted_by | uuid | YES |  |
| governorates | id | uuid | NO | uuid_generate_v4() |
| governorates | code | text | NO |  |
| governorates | name_ar | text | NO |  |
| governorates | name_en | text | YES |  |
| governorates | region | text | YES |  |
| governorates | population | integer | YES |  |
| governorates | is_active | boolean | YES | true |
| governorates | created_at | timestamp with time zone | NO | now() |
| hazardous_occupations | id | uuid | NO | uuid_generate_v4() |
| hazardous_occupations | occupation_id | uuid | NO |  |
| hazardous_occupations | occupation_code | text | NO |  |
| hazardous_occupations | occupation_name_ar | text | NO |  |
| hazardous_occupations | occupation_name_en | text | YES |  |
| hazardous_occupations | risk_level | integer | NO |  |
| hazardous_occupations | hazard_category | text | NO |  |
| hazardous_occupations | critical_tasks | ARRAY | YES |  |
| hazardous_occupations | safety_requirements | ARRAY | YES |  |
| hazardous_occupations | medical_examinations | ARRAY | YES |  |
| hazardous_occupations | protective_equipment | ARRAY | YES |  |
| hazardous_occupations | training_requirements | ARRAY | YES |  |
| hazardous_occupations | compliance_standards | ARRAY | YES |  |
| hazardous_occupations | inspection_checklist | jsonb | YES | '[]'::jsonb |
| hazardous_occupations | min_salary | numeric | YES |  |
| hazardous_occupations | yemenization_policy | text | YES |  |
| hazardous_occupations | isco_code | text | YES |  |
| hazardous_occupations | created_at | timestamp with time zone | NO | now() |
| hazardous_occupations | updated_at | timestamp with time zone | NO | now() |
| ilo_conventions | id | uuid | NO | uuid_generate_v4() |
| ilo_conventions | convention_number | text | NO |  |
| ilo_conventions | title_ar | text | NO |  |
| ilo_conventions | title_en | text | YES |  |
| ilo_conventions | ratification_date | date | YES |  |
| ilo_conventions | status | text | NO | 'لم يصادق'::text |
| ilo_conventions | key_provisions | ARRAY | YES |  |
| ilo_conventions | summary | text | YES |  |
| ilo_conventions | created_at | timestamp with time zone | NO | now() |
| inspection_checklists | id | uuid | NO | uuid_generate_v4() |
| inspection_checklists | inspection_id | uuid | NO |  |
| inspection_checklists | checklist_item | text | NO |  |
| inspection_checklists | category | text | NO |  |
| inspection_checklists | is_compliant | boolean | YES | false |
| inspection_checklists | notes | text | YES |  |
| inspection_checklists | evidence_url | text | YES |  |
| inspection_checklists | severity | text | YES |  |
| inspection_checklists | created_at | timestamp with time zone | NO | now() |
| inspections | id | uuid | NO | uuid_generate_v4() |
| inspections | enterprise_id | uuid | NO |  |
| inspections | inspection_number | text | NO |  |
| inspections | inspection_date | date | NO | CURRENT_DATE |
| inspections | inspector_name | text | NO |  |
| inspections | inspector_title | text | YES |  |
| inspections | inspection_type | USER-DEFINED | NO | 'روتينية'::inspection_type |
| inspections | compliance_status | USER-DEFINED | NO | 'متوافق جزئياً'::inspection_compliance |
| inspections | overall_score | numeric | NO | 0 |
| inspections | labor_law_score | numeric | YES | 0 |
| inspections | safety_score | numeric | YES | 0 |
| inspections | training_score | numeric | YES | 0 |
| inspections | yemenization_score | numeric | YES | 0 |
| inspections | quality_score | numeric | YES | 0 |
| inspections | labor_law_articles | ARRAY | YES |  |
| inspections | yemeni_decrees | ARRAY | YES |  |
| inspections | international_standards | ARRAY | YES |  |
| inspections | training_compliance_rate | numeric | YES | 0 |
| inspections | occupational_safety_score | numeric | YES | 0 |
| inspections | yemenization_rate | numeric | YES | 0 |
| inspections | recommendations | ARRAY | YES |  |
| inspections | strengths | ARRAY | YES |  |
| inspections | weaknesses | ARRAY | YES |  |
| inspections | next_inspection_date | date | YES |  |
| inspections | evaluation_model | USER-DEFINED | YES | 'standard'::evaluation_model |
| inspections | evaluation_level | USER-DEFINED | YES | 'basic'::evaluation_level |
| inspections | report_url | text | YES |  |
| inspections | attachments | jsonb | YES | '[]'::jsonb |
| inspections | created_at | timestamp with time zone | NO | now() |
| inspections | created_by | uuid | YES |  |
| inspections | updated_at | timestamp with time zone | NO | now() |
| inspections | deleted_at | timestamp with time zone | YES |  |
| inspections | deleted_by | uuid | YES |  |
| institutional_templates | id | uuid | NO | uuid_generate_v4() |
| institutional_templates | template_code | text | NO |  |
| institutional_templates | template_name | text | NO |  |
| institutional_templates | template_type | text | NO |  |
| institutional_templates | description | text | YES |  |
| institutional_templates | content | jsonb | YES | '{}'::jsonb |
| institutional_templates | is_active | boolean | YES | true |
| institutional_templates | created_at | timestamp with time zone | NO | now() |
| international_standards | id | uuid | NO | uuid_generate_v4() |
| international_standards | standard_code | text | NO |  |
| international_standards | standard_name | text | NO |  |
| international_standards | organization | text | NO |  |
| international_standards | description | text | YES |  |
| international_standards | version | text | YES |  |
| international_standards | issue_date | date | YES |  |
| international_standards | status | text | YES | 'ساري'::text |
| international_standards | scope | text | YES |  |
| international_standards | key_requirements | ARRAY | YES |  |
| international_standards | created_at | timestamp with time zone | NO | now() |
| isic4_classifications | id | uuid | NO | uuid_generate_v4() |
| isic4_classifications | isic_code | text | NO |  |
| isic4_classifications | parent_code | text | YES |  |
| isic4_classifications | level | text | NO |  |
| isic4_classifications | depth | integer | NO | 1 |
| isic4_classifications | description_ar | text | NO |  |
| isic4_classifications | description_en | text | YES |  |
| isic4_classifications | section_code | text | YES |  |
| isic4_classifications | section_name | text | YES |  |
| isic4_classifications | division_code | text | YES |  |
| isic4_classifications | division_name | text | YES |  |
| isic4_classifications | group_code | text | YES |  |
| isic4_classifications | group_name | text | YES |  |
| isic4_classifications | sector | USER-DEFINED | YES |  |
| isic4_classifications | activity_type | text | YES |  |
| isic4_classifications | employee_range | text | YES |  |
| isic4_classifications | capital_range | text | YES |  |
| isic4_classifications | regulatory_notes | text | YES |  |
| isic4_classifications | enterprise_count | integer | YES | 0 |
| isic4_classifications | total_employees | integer | YES | 0 |
| isic4_classifications | is_active | boolean | YES | true |
| isic4_classifications | created_at | timestamp with time zone | NO | now() |
| isic4_classifications | updated_at | timestamp with time zone | NO | now() |
| isic4_classifications | deleted_at | timestamp with time zone | YES |  |
| isic4_classifications | deleted_by | uuid | YES |  |
| isic4_hierarchy | isic_code | text | YES |  |
| isic4_hierarchy | level | text | YES |  |
| isic4_hierarchy | depth | integer | YES |  |
| isic4_hierarchy | description_ar | text | YES |  |
| isic4_hierarchy | description_en | text | YES |  |
| isic4_hierarchy | sector | USER-DEFINED | YES |  |
| isic4_hierarchy | activity_type | text | YES |  |
| isic4_hierarchy | enterprise_count | integer | YES |  |
| isic4_hierarchy | total_employees | integer | YES |  |
| isic4_hierarchy | section_name_ar | text | YES |  |
| isic4_hierarchy | section_name_en | text | YES |  |
| isic4_hierarchy | division_name_ar | text | YES |  |
| isic4_hierarchy | division_name_en | text | YES |  |
| isic4_hierarchy | group_name_ar | text | YES |  |
| isic4_hierarchy | group_name_en | text | YES |  |
| labor_disputes | id | uuid | NO | uuid_generate_v4() |
| labor_disputes | enterprise_id | uuid | NO |  |
| labor_disputes | enterprise_name | text | NO |  |
| labor_disputes | worker_name | text | NO |  |
| labor_disputes | occupation_id | uuid | YES |  |
| labor_disputes | dispute_type | text | NO |  |
| labor_disputes | dispute_description | text | NO |  |
| labor_disputes | dispute_date | date | NO | CURRENT_DATE |
| labor_disputes | settlement_proposal | text | YES |  |
| labor_disputes | status | USER-DEFINED | NO | 'قيد النظر'::dispute_status |
| labor_disputes | resolution_date | date | YES |  |
| labor_disputes | resolution_notes | text | YES |  |
| labor_disputes | created_at | timestamp with time zone | NO | now() |
| labor_disputes | updated_at | timestamp with time zone | NO | now() |
| labor_disputes | deleted_at | timestamp with time zone | YES |  |
| labor_disputes | deleted_by | uuid | YES |  |
| law_articles | id | uuid | NO | uuid_generate_v4() |
| law_articles | legal_reference_id | uuid | NO |  |
| law_articles | article_number | text | NO |  |
| law_articles | title | text | NO |  |
| law_articles | content | text | YES |  |
| law_articles | scope | text | YES |  |
| law_articles | penalties | text | YES |  |
| law_articles | related_articles | ARRAY | YES |  |
| law_articles | weight | numeric | YES | 0 |
| law_articles | created_at | timestamp with time zone | NO | now() |
| legal_references | id | uuid | NO | uuid_generate_v4() |
| legal_references | law_name_ar | text | NO |  |
| legal_references | law_name_en | text | YES |  |
| legal_references | law_number | text | YES |  |
| legal_references | law_year | integer | YES |  |
| legal_references | effective_date | date | YES |  |
| legal_references | status | text | YES | 'نافذ'::text |
| legal_references | summary | text | YES |  |
| legal_references | created_at | timestamp with time zone | NO | now() |
| licenses | id | uuid | NO | uuid_generate_v4() |
| licenses | entity_id | uuid | NO |  |
| licenses | license_number | text | NO |  |
| licenses | license_type | text | NO |  |
| licenses | status | USER-DEFINED | NO | 'valid'::license_status |
| licenses | issue_date | date | NO |  |
| licenses | expiry_date | date | NO |  |
| licenses | renewal_date | date | YES |  |
| licenses | issuing_authority | text | NO |  |
| licenses | issuing_decision | text | YES |  |
| licenses | conditions | text | YES |  |
| licenses | notes | text | YES |  |
| licenses | file_url | text | YES |  |
| licenses | created_at | timestamp with time zone | NO | now() |
| licenses | updated_at | timestamp with time zone | NO | now() |
| licenses | deleted_at | timestamp with time zone | YES |  |
| licenses | deleted_by | uuid | YES |  |
| maturity_assessments | id | uuid | NO | uuid_generate_v4() |
| maturity_assessments | entity_id | uuid | NO |  |
| maturity_assessments | overall_score | numeric | NO | 0 |
| maturity_assessments | grade | USER-DEFINED | YES |  |
| maturity_assessments | identity_score | numeric | YES | 0 |
| maturity_assessments | description_score | numeric | YES | 0 |
| maturity_assessments | tasks_score | numeric | YES | 0 |
| maturity_assessments | competencies_score | numeric | YES | 0 |
| maturity_assessments | safety_score | numeric | YES | 0 |
| maturity_assessments | career_score | numeric | YES | 0 |
| maturity_assessments | governance_score | numeric | YES | 0 |
| maturity_assessments | missing_count | integer | YES | 0 |
| maturity_assessments | red_flags | ARRAY | YES |  |
| maturity_assessments | recommendations | ARRAY | YES |  |
| maturity_assessments | assessment_date | date | NO | CURRENT_DATE |
| maturity_assessments | assessed_by | uuid | YES |  |
| maturity_assessments | created_at | timestamp with time zone | NO | now() |
| maturity_assessments | deleted_at | timestamp with time zone | YES |  |
| maturity_assessments | deleted_by | uuid | YES |  |
| members | id | uuid | NO | uuid_generate_v4() |
| members | entity_id | uuid | NO |  |
| members | national_id | text | NO |  |
| members | full_name | text | NO |  |
| members | gender | USER-DEFINED | NO |  |
| members | birth_date | date | YES |  |
| members | nationality | text | YES | 'يمني'::text |
| members | profession | text | YES |  |
| members | specialization | text | YES |  |
| members | qualification | text | YES |  |
| members | experience_years | integer | YES |  |
| members | job_title | text | YES |  |
| members | workplace | text | YES |  |
| members | phone | text | YES |  |
| members | mobile | text | YES |  |
| members | email | text | YES |  |
| members | governorate | text | YES |  |
| members | city | text | YES |  |
| members | directorate | text | YES |  |
| members | district | text | YES |  |
| members | street | text | YES |  |
| members | member_number | text | YES |  |
| members | join_date | date | NO | CURRENT_DATE |
| members | membership_expiry | date | YES |  |
| members | status | USER-DEFINED | NO | 'active'::member_status |
| members | membership_type | text | YES | 'عضو عادي'::text |
| members | subscription_amount | numeric | YES |  |
| members | last_payment_date | date | YES |  |
| members | payment_status | text | YES |  |
| members | created_at | timestamp with time zone | NO | now() |
| members | created_by | uuid | YES |  |
| members | updated_at | timestamp with time zone | NO | now() |
| members | updated_by | uuid | YES |  |
| members | metadata | jsonb | YES | '{}'::jsonb |
| members | deleted_at | timestamp with time zone | YES |  |
| members | deleted_by | uuid | YES |  |
| ministry_dashboard_stats | total_entities | bigint | YES |  |
| ministry_dashboard_stats | active_entities | bigint | YES |  |
| ministry_dashboard_stats | suspended_entities | bigint | YES |  |
| ministry_dashboard_stats | inactive_entities | bigint | YES |  |
| ministry_dashboard_stats | compliant_entities | bigint | YES |  |
| ministry_dashboard_stats | non_compliant_entities | bigint | YES |  |
| ministry_dashboard_stats | high_risk_entities | bigint | YES |  |
| ministry_dashboard_stats | overdue_renewals | bigint | YES |  |
| ministry_dashboard_stats | due_soon_renewals | bigint | YES |  |
| ministry_dashboard_stats | total_members | bigint | YES |  |
| ministry_dashboard_stats | compliance_rate | numeric | YES |  |
| notifications | id | uuid | NO | uuid_generate_v4() |
| notifications | recipient_id | uuid | NO |  |
| notifications | title | text | NO |  |
| notifications | message | text | NO |  |
| notifications | type | text | NO | 'info'::text |
| notifications | is_read | boolean | NO | false |
| notifications | entity_id | uuid | YES |  |
| notifications | action_url | text | YES |  |
| notifications | created_at | timestamp with time zone | NO | now() |
| notifications | deleted_at | timestamp with time zone | YES |  |
| notifications | deleted_by | uuid | YES |  |
| organizational_entities | entity_id | uuid | NO | uuid_generate_v4() |
| organizational_entities | unified_code | text | NO |  |
| organizational_entities | registration_number | text | NO |  |
| organizational_entities | parent_entity_id | uuid | YES |  |
| organizational_entities | entity_type | USER-DEFINED | NO |  |
| organizational_entities | classification | USER-DEFINED | NO |  |
| organizational_entities | sector | USER-DEFINED | YES |  |
| organizational_entities | activity_types | ARRAY | YES |  |
| organizational_entities | governance_level | USER-DEFINED | YES |  |
| organizational_entities | geographic_scope | USER-DEFINED | YES |  |
| organizational_entities | organizational_level | integer | NO | 1 |
| organizational_entities | hierarchy_path | ARRAY | YES |  |
| organizational_entities | legal_form | USER-DEFINED | NO |  |
| organizational_entities | license_number | text | YES |  |
| organizational_entities | license_status | USER-DEFINED | YES | 'valid'::license_status |
| organizational_entities | establishment_date | date | NO |  |
| organizational_entities | registration_date | date | NO |  |
| organizational_entities | status | USER-DEFINED | NO | 'active'::entity_status |
| organizational_entities | compliance_status | USER-DEFINED | NO | 'compliant'::compliance_status |
| organizational_entities | risk_level | USER-DEFINED | NO | 'low'::risk_level |
| organizational_entities | name_ar | text | NO |  |
| organizational_entities | name_en | text | YES |  |
| organizational_entities | description | text | YES |  |
| organizational_entities | mission | text | YES |  |
| organizational_entities | vision | text | YES |  |
| organizational_entities | phone | text | YES |  |
| organizational_entities | mobile | text | YES |  |
| organizational_entities | fax | text | YES |  |
| organizational_entities | email | text | YES |  |
| organizational_entities | website | text | YES |  |
| organizational_entities | social_facebook | text | YES |  |
| organizational_entities | social_twitter | text | YES |  |
| organizational_entities | social_linkedin | text | YES |  |
| organizational_entities | social_instagram | text | YES |  |
| organizational_entities | governorate | text | NO |  |
| organizational_entities | city | text | NO |  |
| organizational_entities | directorate | text | YES |  |
| organizational_entities | district | text | YES |  |
| organizational_entities | street | text | YES |  |
| organizational_entities | building | text | YES |  |
| organizational_entities | floor | text | YES |  |
| organizational_entities | office | text | YES |  |
| organizational_entities | postal_code | text | YES |  |
| organizational_entities | po_box | text | YES |  |
| organizational_entities | latitude | numeric | YES |  |
| organizational_entities | longitude | numeric | YES |  |
| organizational_entities | president_name | text | YES |  |
| organizational_entities | president_national_id | text | YES |  |
| organizational_entities | president_position | text | YES | 'رئيس'::text |
| organizational_entities | president_appointment_date | date | YES |  |
| organizational_entities | president_end_date | date | YES |  |
| organizational_entities | president_phone | text | YES |  |
| organizational_entities | president_email | text | YES |  |
| organizational_entities | vp_name | text | YES |  |
| organizational_entities | vp_national_id | text | YES |  |
| organizational_entities | vp_appointment_date | date | YES |  |
| organizational_entities | vp_phone | text | YES |  |
| organizational_entities | vp_email | text | YES |  |
| organizational_entities | secretary_name | text | YES |  |
| organizational_entities | secretary_national_id | text | YES |  |
| organizational_entities | secretary_appointment_date | date | YES |  |
| organizational_entities | secretary_phone | text | YES |  |
| organizational_entities | secretary_email | text | YES |  |
| organizational_entities | treasurer_name | text | YES |  |
| organizational_entities | treasurer_national_id | text | YES |  |
| organizational_entities | treasurer_appointment_date | date | YES |  |
| organizational_entities | treasurer_phone | text | YES |  |
| organizational_entities | treasurer_email | text | YES |  |
| organizational_entities | member_count | integer | NO | 0 |
| organizational_entities | branch_count | integer | NO | 0 |
| organizational_entities | committee_count | integer | NO | 0 |
| organizational_entities | active_members | integer | YES | 0 |
| organizational_entities | male_members | integer | YES | 0 |
| organizational_entities | female_members | integer | YES | 0 |
| organizational_entities | employee_count | integer | YES | 0 |
| organizational_entities | volunteer_count | integer | YES | 0 |
| organizational_entities | annual_budget | numeric | YES |  |
| organizational_entities | revenue | numeric | YES |  |
| organizational_entities | expenses | numeric | YES |  |
| organizational_entities | assets | numeric | YES |  |
| organizational_entities | liabilities | numeric | YES |  |
| organizational_entities | last_financial_year | integer | YES |  |
| organizational_entities | last_inspection_date | date | YES |  |
| organizational_entities | next_inspection_date | date | YES |  |
| organizational_entities | last_audit_date | date | YES |  |
| organizational_entities | inspection_score | numeric | YES |  |
| organizational_entities | next_renewal_date | date | YES |  |
| organizational_entities | renewal_status | USER-DEFINED | NO | 'current'::renewal_status |
| organizational_entities | entity_code | text | YES |  |
| organizational_entities | qr_code | text | YES |  |
| organizational_entities | digital_certificate | text | YES |  |
| organizational_entities | tax_reference | text | YES |  |
| organizational_entities | social_insurance_ref | text | YES |  |
| organizational_entities | commercial_register_ref | text | YES |  |
| organizational_entities | ai_classification_score | numeric | YES |  |
| organizational_entities | ai_risk_score | numeric | YES |  |
| organizational_entities | ai_recommendations | ARRAY | YES |  |
| organizational_entities | ai_assessment_date | date | YES |  |
| organizational_entities | created_at | timestamp with time zone | NO | now() |
| organizational_entities | created_by | uuid | YES |  |
| organizational_entities | updated_at | timestamp with time zone | NO | now() |
| organizational_entities | updated_by | uuid | YES |  |
| organizational_entities | version | integer | NO | 1 |
| organizational_entities | deleted_at | timestamp with time zone | YES |  |
| organizational_entities | deleted_by | uuid | YES |  |
| organizational_entities | metadata | jsonb | YES | '{}'::jsonb |
| professions | id | uuid | NO | uuid_generate_v4() |
| professions | code | text | NO |  |
| professions | name_ar | text | NO |  |
| professions | name_en | text | YES |  |
| professions | name_fr | text | YES |  |
| professions | isco_code | text | NO |  |
| professions | major_group_code | text | NO |  |
| professions | major_group_name | text | NO |  |
| professions | sub_major_group | text | YES |  |
| professions | minor_group | text | YES |  |
| professions | unit_group | text | YES |  |
| professions | sector | text | NO |  |
| professions | family | text | NO |  |
| professions | level | integer | NO | 1 |
| professions | status | USER-DEFINED | NO | 'مسودة'::profession_status |
| professions | description_ar | text | YES |  |
| professions | description_en | text | YES |  |
| professions | scope | text | YES |  |
| professions | activity_category | text | YES |  |
| professions | syndicate | text | YES |  |
| professions | indoor_site | text | YES |  |
| professions | outdoor_site | text | YES |  |
| professions | climate_condition | text | YES |  |
| professions | shift_pattern | text | YES |  |
| professions | work_access | text | YES |  |
| professions | max_service_years | text | YES |  |
| professions | work_hours_per_day | text | YES |  |
| professions | rest_break | text | YES |  |
| professions | leaves_schedule | text | YES |  |
| professions | medical_exams | jsonb | YES | '{}'::jsonb |
| professions | hazard_level | USER-DEFINED | YES | 'منخفضة'::hazard_level_ar |
| professions | possible_hazards | ARRAY | YES |  |
| professions | potential_injuries | ARRAY | YES |  |
| professions | occupational_diseases | ARRAY | YES |  |
| professions | prevention_methods | ARRAY | YES |  |
| professions | protective_equipment | ARRAY | YES |  |
| professions | qualifications | ARRAY | YES |  |
| professions | training_requirements | ARRAY | YES |  |
| professions | pre_work_conditions | ARRAY | YES |  |
| professions | onboarding | ARRAY | YES |  |
| professions | trial_period | text | YES |  |
| professions | performance_evaluation | ARRAY | YES |  |
| professions | incentives_and_penalties | ARRAY | YES |  |
| professions | tasks | jsonb | YES | '[]'::jsonb |
| professions | competencies | jsonb | YES | '[]'::jsonb |
| professions | skill_score | integer | YES | 0 |
| professions | responsibility_score | integer | YES | 0 |
| professions | autonomy_score | integer | YES | 0 |
| professions | complexity_score | integer | YES | 0 |
| professions | hazard_score | integer | YES | 0 |
| professions | total_score | numeric | YES | 0 |
| professions | grade | USER-DEFINED | YES |  |
| professions | min_salary | numeric | YES |  |
| professions | max_salary | numeric | YES |  |
| professions | currency | text | YES | 'YER'::text |
| professions | pay_frequency | USER-DEFINED | YES |  |
| professions | salary_grade | text | YES |  |
| professions | allowances | ARRAY | YES |  |
| professions | overtime_policy | text | YES |  |
| professions | career_path | jsonb | YES | '{}'::jsonb |
| professions | legal_references | jsonb | YES | '[]'::jsonb |
| professions | institutional_standards | jsonb | YES | '[]'::jsonb |
| professions | decree_number | text | YES |  |
| professions | decree_year | text | YES |  |
| professions | yemenization_policy | text | YES |  |
| professions | keywords | ARRAY | YES |  |
| professions | alternative_titles | ARRAY | YES |  |
| professions | related_occupations | ARRAY | YES |  |
| professions | supervision_level | USER-DEFINED | YES |  |
| professions | decision_making_level | USER-DEFINED | YES |  |
| professions | physical_demands | ARRAY | YES |  |
| professions | mental_demands | ARRAY | YES |  |
| professions | environmental_exposures | ARRAY | YES |  |
| professions | tools_and_equipment | ARRAY | YES |  |
| professions | technology_used | ARRAY | YES |  |
| professions | reporting_structure | text | YES |  |
| professions | team_size | text | YES |  |
| professions | data_sensitivity | USER-DEFINED | YES |  |
| professions | emergency_procedures | ARRAY | YES |  |
| professions | quality_standards | ARRAY | YES |  |
| professions | performance_indicators | ARRAY | YES |  |
| professions | training_hours_required | integer | YES |  |
| professions | certification_required | boolean | YES | false |
| professions | license_required | boolean | YES | false |
| professions | age_requirement | text | YES |  |
| professions | gender_requirement | text | YES |  |
| professions | employment_tiers | ARRAY | YES |  |
| professions | contract_types | jsonb | YES | '[]'::jsonb |
| professions | governance_metadata | jsonb | YES | '{}'::jsonb |
| professions | created_at | timestamp with time zone | NO | now() |
| professions | created_by | uuid | YES |  |
| professions | updated_at | timestamp with time zone | NO | now() |
| professions | updated_by | uuid | YES |  |
| professions | version | integer | NO | 1 |
| professions | deleted_at | timestamp with time zone | YES |  |
| professions | deleted_by | uuid | YES |  |
| professions_summary | id | uuid | YES |  |
| professions_summary | code | text | YES |  |
| professions_summary | name_ar | text | YES |  |
| professions_summary | isco_code | text | YES |  |
| professions_summary | sector | text | YES |  |
| professions_summary | family | text | YES |  |
| professions_summary | level | integer | YES |  |
| professions_summary | status | USER-DEFINED | YES |  |
| professions_summary | linked_enterprises | bigint | YES |  |
| professions_summary | total_headcount | bigint | YES |  |
| professions_summary | total_yemeni | bigint | YES |  |
| profiles | id | uuid | NO |  |
| profiles | email | text | NO |  |
| profiles | full_name | text | YES |  |
| profiles | role | USER-DEFINED | NO | 'viewer'::user_role |
| profiles | entity_id | uuid | YES |  |
| profiles | is_active | boolean | NO | true |
| profiles | last_login | timestamp with time zone | YES |  |
| profiles | login_count | integer | NO | 0 |
| profiles | phone | text | YES |  |
| profiles | avatar_url | text | YES |  |
| profiles | department | text | YES |  |
| profiles | job_title | text | YES |  |
| profiles | permissions | jsonb | YES | '{}'::jsonb |
| profiles | metadata | jsonb | YES | '{}'::jsonb |
| profiles | created_at | timestamp with time zone | NO | now() |
| profiles | updated_at | timestamp with time zone | NO | now() |
| reduction_requests_full | id | uuid | YES |  |
| reduction_requests_full | request_number | text | YES |  |
| reduction_requests_full | enterprise_id | uuid | YES |  |
| reduction_requests_full | enterprise_name | text | YES |  |
| reduction_requests_full | requested_reduction_count | integer | YES |  |
| reduction_requests_full | current_employee_count | integer | YES |  |
| reduction_requests_full | reduction_reason | text | YES |  |
| reduction_requests_full | reduction_category | text | YES |  |
| reduction_requests_full | legal_basis | text | YES |  |
| reduction_requests_full | detailed_description | text | YES |  |
| reduction_requests_full | expected_savings | numeric | YES |  |
| reduction_requests_full | affected_occupations | ARRAY | YES |  |
| reduction_requests_full | affected_member_ids | ARRAY | YES |  |
| reduction_requests_full | affected_worker_names | ARRAY | YES |  |
| reduction_requests_full | alternative_reemployment_plan | text | YES |  |
| reduction_requests_full | reemployment_agency_notified | boolean | YES |  |
| reduction_requests_full | ministry_notified | boolean | YES |  |
| reduction_requests_full | status | USER-DEFINED | YES |  |
| reduction_requests_full | submitted_by | uuid | YES |  |
| reduction_requests_full | submitted_at | timestamp with time zone | YES |  |
| reduction_requests_full | dept_reviewer_id | uuid | YES |  |
| reduction_requests_full | dept_reviewer_notes | text | YES |  |
| reduction_requests_full | dept_reviewed_at | timestamp with time zone | YES |  |
| reduction_requests_full | legal_reviewer_id | uuid | YES |  |
| reduction_requests_full | legal_reviewer_notes | text | YES |  |
| reduction_requests_full | legal_reviewed_at | timestamp with time zone | YES |  |
| reduction_requests_full | final_approver_id | uuid | YES |  |
| reduction_requests_full | final_approver_notes | text | YES |  |
| reduction_requests_full | final_approved_at | timestamp with time zone | YES |  |
| reduction_requests_full | rejection_reason | text | YES |  |
| reduction_requests_full | effective_date | date | YES |  |
| reduction_requests_full | execution_notes | text | YES |  |
| reduction_requests_full | executed_by | uuid | YES |  |
| reduction_requests_full | executed_at | timestamp with time zone | YES |  |
| reduction_requests_full | attachments | jsonb | YES |  |
| reduction_requests_full | metadata | jsonb | YES |  |
| reduction_requests_full | created_by | uuid | YES |  |
| reduction_requests_full | created_at | timestamp with time zone | YES |  |
| reduction_requests_full | updated_at | timestamp with time zone | YES |  |
| reduction_requests_full | enterprise_name_resolved | text | YES |  |
| reduction_requests_full | enterprise_governorate | text | YES |  |
| reduction_requests_full | enterprise_type | USER-DEFINED | YES |  |
| reduction_requests_full | submitted_by_name | text | YES |  |
| reduction_requests_full | dept_reviewer_name | text | YES |  |
| reduction_requests_full | legal_reviewer_name | text | YES |  |
| reduction_requests_full | final_approver_name | text | YES |  |
| reduction_requests_full | executed_by_name | text | YES |  |
| reduction_requests_full | reduction_percentage | numeric | YES |  |
| reports | id | uuid | NO | uuid_generate_v4() |
| reports | report_name | text | NO |  |
| reports | report_type | text | NO |  |
| reports | description | text | YES |  |
| reports | filters | jsonb | YES | '{}'::jsonb |
| reports | columns | jsonb | YES | '[]'::jsonb |
| reports | is_scheduled | boolean | NO | false |
| reports | schedule_cron | text | YES |  |
| reports | created_by | uuid | YES |  |
| reports | is_public | boolean | NO | false |
| reports | created_at | timestamp with time zone | NO | now() |
| reports | updated_at | timestamp with time zone | NO | now() |
| risk_assessments | id | uuid | NO | uuid_generate_v4() |
| risk_assessments | entity_id | uuid | NO |  |
| risk_assessments | risk_type | text | NO |  |
| risk_assessments | risk_description | text | NO |  |
| risk_assessments | likelihood | integer | YES |  |
| risk_assessments | impact | integer | YES |  |
| risk_assessments | risk_score | numeric | YES |  |
| risk_assessments | risk_level | USER-DEFINED | YES |  |
| risk_assessments | mitigation_plan | text | YES |  |
| risk_assessments | responsible_person | text | YES |  |
| risk_assessments | review_date | date | YES |  |
| risk_assessments | status | text | YES | 'مفتوح'::text |
| risk_assessments | created_at | timestamp with time zone | NO | now() |
| risk_assessments | updated_at | timestamp with time zone | NO | now() |
| risk_assessments | deleted_at | timestamp with time zone | YES |  |
| risk_assessments | deleted_by | uuid | YES |  |
| salary_ranges | id | uuid | NO | uuid_generate_v4() |
| salary_ranges | occupation_id | uuid | NO |  |
| salary_ranges | min_salary | numeric | NO |  |
| salary_ranges | max_salary | numeric | NO |  |
| salary_ranges | currency | text | YES | 'YER'::text |
| salary_ranges | pay_frequency | USER-DEFINED | YES |  |
| salary_ranges | allowances | ARRAY | YES |  |
| salary_ranges | overtime_policy | text | YES |  |
| salary_ranges | salary_grade | text | YES |  |
| salary_ranges | created_at | timestamp with time zone | NO | now() |
| schema_migrations | version | text | NO |  |
| schema_migrations | applied_at | timestamp with time zone | NO | now() |
| schema_migrations | applied_by | text | YES |  |
| schema_migrations | description | text | YES |  |
| sector_users | id | uuid | NO | gen_random_uuid() |
| sector_users | name | text | NO |  |
| sector_users | email | text | NO |  |
| sector_users | role | text | NO |  |
| sector_users | user_type | text | NO |  |
| sector_users | password_hash | text | NO |  |
| sector_users | salt | text | NO |  |
| sector_users | organization_id | text | YES |  |
| sector_users | is_active | boolean | YES | true |
| sector_users | last_login | timestamp with time zone | YES |  |
| sector_users | created_at | timestamp with time zone | YES | now() |
| sector_users | updated_at | timestamp with time zone | YES | now() |
| sector_users | deleted_at | timestamp with time zone | YES |  |
| service_requests | id | uuid | NO | uuid_generate_v4() |
| service_requests | entity_id | uuid | NO |  |
| service_requests | service_id | uuid | NO |  |
| service_requests | request_number | text | NO |  |
| service_requests | status | USER-DEFINED | NO | 'pending'::service_request_status |
| service_requests | submission_date | date | NO | CURRENT_DATE |
| service_requests | expected_date | date | YES |  |
| service_requests | completion_date | date | YES |  |
| service_requests | notes | text | YES |  |
| service_requests | rejection_reason | text | YES |  |
| service_requests | processed_by | uuid | YES |  |
| service_requests | created_at | timestamp with time zone | NO | now() |
| service_requests | created_by | uuid | YES |  |
| service_requests | updated_at | timestamp with time zone | NO | now() |
| service_requests | deleted_at | timestamp with time zone | YES |  |
| service_requests | deleted_by | uuid | YES |  |
| services | id | uuid | NO | uuid_generate_v4() |
| services | service_code | text | NO |  |
| services | service_name | text | NO |  |
| services | description | text | YES |  |
| services | category | text | NO |  |
| services | is_active | boolean | NO | true |
| services | requires_documents | boolean | NO | false |
| services | processing_days | integer | YES | 7 |
| services | fee_amount | numeric | YES | 0 |
| services | fee_description | text | YES |  |
| services | requirements | ARRAY | YES |  |
| services | created_at | timestamp with time zone | NO | now() |
| services | deleted_at | timestamp with time zone | YES |  |
| services | deleted_by | uuid | YES |  |
| smart_suggestions | id | uuid | NO | uuid_generate_v4() |
| smart_suggestions | entity_id | uuid | YES |  |
| smart_suggestions | occupation_id | uuid | YES |  |
| smart_suggestions | suggestion_type | text | NO |  |
| smart_suggestions | title | text | NO |  |
| smart_suggestions | description | text | YES |  |
| smart_suggestions | impact | USER-DEFINED | YES | 'متوسط'::suggestion_impact |
| smart_suggestions | patch | jsonb | YES | '{}'::jsonb |
| smart_suggestions | is_applied | boolean | YES | false |
| smart_suggestions | created_at | timestamp with time zone | NO | now() |
| system_statistics | total_professions | bigint | YES |  |
| system_statistics | total_entities | bigint | YES |  |
| system_statistics | total_members | bigint | YES |  |
| system_statistics | total_inspections | bigint | YES |  |
| system_statistics | valid_certificates | bigint | YES |  |
| system_statistics | completed_trainings | bigint | YES |  |
| system_statistics | pending_disputes | bigint | YES |  |
| system_statistics | active_expatriate_licenses | bigint | YES |  |
| system_statistics | active_dispatches | bigint | YES |  |
| system_statistics | pending_reduction_requests | bigint | YES |  |
| system_statistics | active_isic4_codes | bigint | YES |  |
| training_records | id | uuid | NO | uuid_generate_v4() |
| training_records | enterprise_id | uuid | NO |  |
| training_records | occupation_id | uuid | YES |  |
| training_records | member_id | uuid | YES |  |
| training_records | training_name | text | NO |  |
| training_records | training_code | text | YES |  |
| training_records | training_provider | text | YES |  |
| training_records | training_type | text | YES |  |
| training_records | start_date | date | NO |  |
| training_records | end_date | date | YES |  |
| training_records | duration_hours | integer | YES | 0 |
| training_records | employee_name | text | YES |  |
| training_records | employee_id | text | YES |  |
| training_records | status | USER-DEFINED | NO | 'قيد التنفيذ'::training_status |
| training_records | assessment_score | numeric | YES |  |
| training_records | certification_issued | boolean | YES | false |
| training_records | certification_number | text | YES |  |
| training_records | regulatory_basis | text | YES |  |
| training_records | competence_ids | ARRAY | YES |  |
| training_records | created_at | timestamp with time zone | NO | now() |
| training_records | updated_at | timestamp with time zone | NO | now() |
| training_records | deleted_at | timestamp with time zone | YES |  |
| training_records | deleted_by | uuid | YES |  |
| violations | id | uuid | NO | uuid_generate_v4() |
| violations | entity_id | uuid | NO |  |
| violations | violation_number | text | NO |  |
| violations | violation_type | text | NO |  |
| violations | severity | USER-DEFINED | NO | 'minor'::violation_severity |
| violations | status | USER-DEFINED | NO | 'open'::violation_status |
| violations | description | text | NO |  |
| violations | legal_basis | text | YES |  |
| violations | detected_date | date | NO | CURRENT_DATE |
| violations | detected_by | uuid | YES |  |
| violations | decision_date | date | YES |  |
| violations | decision | text | YES |  |
| violations | penalty | text | YES |  |
| violations | penalty_amount | numeric | YES |  |
| violations | resolved_date | date | YES |  |
| violations | resolved_by | uuid | YES |  |
| violations | resolution_notes | text | YES |  |
| violations | appeal_date | date | YES |  |
| violations | appeal_status | text | YES |  |
| violations | appeal_decision | text | YES |  |
| violations | evidence_urls | ARRAY | YES |  |
| violations | created_at | timestamp with time zone | NO | now() |
| violations | created_by | uuid | YES |  |
| violations | updated_at | timestamp with time zone | NO | now() |
| violations | deleted_at | timestamp with time zone | YES |  |
| violations | deleted_by | uuid | YES |  |
| worker_dispatches | id | uuid | NO | uuid_generate_v4() |
| worker_dispatches | dispatch_number | text | NO |  |
| worker_dispatches | sending_enterprise_id | uuid | NO |  |
| worker_dispatches | sending_enterprise_name | text | YES |  |
| worker_dispatches | receiving_enterprise_id | uuid | YES |  |
| worker_dispatches | receiving_enterprise_name | text | YES |  |
| worker_dispatches | occupation_id | uuid | YES |  |
| worker_dispatches | link_id | uuid | YES |  |
| worker_dispatches | worker_name | text | NO |  |
| worker_dispatches | worker_national_id | text | YES |  |
| worker_dispatches | worker_member_id | uuid | YES |  |
| worker_dispatches | dispatch_date | date | NO | CURRENT_DATE |
| worker_dispatches | expected_return_date | date | YES |  |
| worker_dispatches | actual_return_date | date | YES |  |
| worker_dispatches | dispatch_duration | interval | YES |  |
| worker_dispatches | purpose | text | NO |  |
| worker_dispatches | legal_basis | text | YES |  |
| worker_dispatches | status | USER-DEFINED | NO | 'مسودة'::dispatch_status |
| worker_dispatches | submitted_by | uuid | YES |  |
| worker_dispatches | submitted_at | timestamp with time zone | YES |  |
| worker_dispatches | reviewed_by | uuid | YES |  |
| worker_dispatches | reviewed_at | timestamp with time zone | YES |  |
| worker_dispatches | approved_by | uuid | YES |  |
| worker_dispatches | approved_at | timestamp with time zone | YES |  |
| worker_dispatches | rejection_reason | text | YES |  |
| worker_dispatches | safety_briefing_done | boolean | YES | false |
| worker_dispatches | medical_clearance_done | boolean | YES | false |
| worker_dispatches | contract_amendment_required | boolean | YES | false |
| worker_dispatches | notes | text | YES |  |
| worker_dispatches | attachments | jsonb | YES | '[]'::jsonb |
| worker_dispatches | metadata | jsonb | YES | '{}'::jsonb |
| worker_dispatches | created_by | uuid | YES |  |
| worker_dispatches | created_at | timestamp with time zone | NO | now() |
| worker_dispatches | updated_at | timestamp with time zone | NO | now() |
| worker_dispatches | deleted_at | timestamp with time zone | YES |  |
| worker_dispatches | deleted_by | uuid | YES |  |
| worker_dispatches_full | id | uuid | YES |  |
| worker_dispatches_full | dispatch_number | text | YES |  |
| worker_dispatches_full | sending_enterprise_id | uuid | YES |  |
| worker_dispatches_full | sending_enterprise_name | text | YES |  |
| worker_dispatches_full | receiving_enterprise_id | uuid | YES |  |
| worker_dispatches_full | receiving_enterprise_name | text | YES |  |
| worker_dispatches_full | occupation_id | uuid | YES |  |
| worker_dispatches_full | link_id | uuid | YES |  |
| worker_dispatches_full | worker_name | text | YES |  |
| worker_dispatches_full | worker_national_id | text | YES |  |
| worker_dispatches_full | worker_member_id | uuid | YES |  |
| worker_dispatches_full | dispatch_date | date | YES |  |
| worker_dispatches_full | expected_return_date | date | YES |  |
| worker_dispatches_full | actual_return_date | date | YES |  |
| worker_dispatches_full | dispatch_duration | interval | YES |  |
| worker_dispatches_full | purpose | text | YES |  |
| worker_dispatches_full | legal_basis | text | YES |  |
| worker_dispatches_full | status | USER-DEFINED | YES |  |
| worker_dispatches_full | submitted_by | uuid | YES |  |
| worker_dispatches_full | submitted_at | timestamp with time zone | YES |  |
| worker_dispatches_full | reviewed_by | uuid | YES |  |
| worker_dispatches_full | reviewed_at | timestamp with time zone | YES |  |
| worker_dispatches_full | approved_by | uuid | YES |  |
| worker_dispatches_full | approved_at | timestamp with time zone | YES |  |
| worker_dispatches_full | rejection_reason | text | YES |  |
| worker_dispatches_full | safety_briefing_done | boolean | YES |  |
| worker_dispatches_full | medical_clearance_done | boolean | YES |  |
| worker_dispatches_full | contract_amendment_required | boolean | YES |  |
| worker_dispatches_full | notes | text | YES |  |
| worker_dispatches_full | attachments | jsonb | YES |  |
| worker_dispatches_full | metadata | jsonb | YES |  |
| worker_dispatches_full | created_by | uuid | YES |  |
| worker_dispatches_full | created_at | timestamp with time zone | YES |  |
| worker_dispatches_full | updated_at | timestamp with time zone | YES |  |
| worker_dispatches_full | sending_enterprise_name_resolved | text | YES |  |
| worker_dispatches_full | sending_governorate | text | YES |  |
| worker_dispatches_full | receiving_enterprise_name_resolved | text | YES |  |
| worker_dispatches_full | receiving_governorate | text | YES |  |
| worker_dispatches_full | occupation_name_ar | text | YES |  |
| worker_dispatches_full | occupation_isco_code | text | YES |  |
| worker_dispatches_full | occupation_hazard_level | USER-DEFINED | YES |  |
| worker_dispatches_full | worker_member_name | text | YES |  |
| worker_dispatches_full | link_status | text | YES |  |
| worker_dispatches_full | link_compliance_score | numeric | YES |  |
| worker_dispatches_full | submitted_by_name | text | YES |  |
| worker_dispatches_full | reviewed_by_name | text | YES |  |
| worker_dispatches_full | approved_by_name | text | YES |  |
| worker_procedures | id | uuid | NO | uuid_generate_v4() |
| worker_procedures | procedure_code | text | NO |  |
| worker_procedures | name_ar | text | NO |  |
| worker_procedures | name_en | text | YES |  |
| worker_procedures | step_number | integer | NO |  |
| worker_procedures | description | text | YES |  |
| worker_procedures | required_compliance | ARRAY | YES |  |
| worker_procedures | estimated_duration | text | YES |  |
| worker_procedures | safety_requirements | ARRAY | YES |  |
| worker_procedures | checklist | ARRAY | YES |  |
| worker_procedures | created_at | timestamp with time zone | NO | now() |
| worker_profiles | id | uuid | NO | uuid_generate_v4() |
| worker_profiles | member_id | uuid | NO |  |
| worker_profiles | current_enterprise_id | uuid | YES |  |
| worker_profiles | current_occupation_id | uuid | YES |  |
| worker_profiles | link_id | uuid | YES |  |
| worker_profiles | employment_status | text | NO | 'active'::text |
| worker_profiles | employment_start_date | date | YES |  |
| worker_profiles | employment_end_date | date | YES |  |
| worker_profiles | contract_type | text | YES |  |
| worker_profiles | social_insurance_number | text | YES |  |
| worker_profiles | current_salary_grade | text | YES |  |
| worker_profiles | skills | ARRAY | YES | '{}'::text[] |
| worker_profiles | certifications | jsonb | YES | '[]'::jsonb |
| worker_profiles | last_medical_check_date | date | YES |  |
| worker_profiles | next_medical_check_date | date | YES |  |
| worker_profiles | total_experience_years | integer | YES | 0 |
| worker_profiles | compliance_score | numeric | YES | 100 |
| worker_profiles | notes | text | YES |  |
| worker_profiles | metadata | jsonb | YES | '{}'::jsonb |
| worker_profiles | created_at | timestamp with time zone | NO | now() |
| worker_profiles | updated_at | timestamp with time zone | NO | now() |
| worker_profiles | deleted_at | timestamp with time zone | YES |  |
| worker_profiles | deleted_by | uuid | YES |  |
| worker_reduction_requests | id | uuid | NO | uuid_generate_v4() |
| worker_reduction_requests | request_number | text | NO |  |
| worker_reduction_requests | enterprise_id | uuid | NO |  |
| worker_reduction_requests | enterprise_name | text | NO |  |
| worker_reduction_requests | requested_reduction_count | integer | NO |  |
| worker_reduction_requests | current_employee_count | integer | YES |  |
| worker_reduction_requests | reduction_reason | text | NO |  |
| worker_reduction_requests | reduction_category | text | NO | 'economic'::text |
| worker_reduction_requests | legal_basis | text | YES |  |
| worker_reduction_requests | detailed_description | text | YES |  |
| worker_reduction_requests | expected_savings | numeric | YES |  |
| worker_reduction_requests | affected_occupations | ARRAY | YES | '{}'::uuid[] |
| worker_reduction_requests | affected_member_ids | ARRAY | YES | '{}'::uuid[] |
| worker_reduction_requests | affected_worker_names | ARRAY | YES |  |
| worker_reduction_requests | alternative_reemployment_plan | text | YES |  |
| worker_reduction_requests | reemployment_agency_notified | boolean | YES | false |
| worker_reduction_requests | ministry_notified | boolean | YES | false |
| worker_reduction_requests | status | USER-DEFINED | NO | 'مسودة'::reduction_request_status |
| worker_reduction_requests | submitted_by | uuid | YES |  |
| worker_reduction_requests | submitted_at | timestamp with time zone | YES |  |
| worker_reduction_requests | dept_reviewer_id | uuid | YES |  |
| worker_reduction_requests | dept_reviewer_notes | text | YES |  |
| worker_reduction_requests | dept_reviewed_at | timestamp with time zone | YES |  |
| worker_reduction_requests | legal_reviewer_id | uuid | YES |  |
| worker_reduction_requests | legal_reviewer_notes | text | YES |  |
| worker_reduction_requests | legal_reviewed_at | timestamp with time zone | YES |  |
| worker_reduction_requests | final_approver_id | uuid | YES |  |
| worker_reduction_requests | final_approver_notes | text | YES |  |
| worker_reduction_requests | final_approved_at | timestamp with time zone | YES |  |
| worker_reduction_requests | rejection_reason | text | YES |  |
| worker_reduction_requests | effective_date | date | YES |  |
| worker_reduction_requests | execution_notes | text | YES |  |
| worker_reduction_requests | executed_by | uuid | YES |  |
| worker_reduction_requests | executed_at | timestamp with time zone | YES |  |
| worker_reduction_requests | attachments | jsonb | YES | '[]'::jsonb |
| worker_reduction_requests | metadata | jsonb | YES | '{}'::jsonb |
| worker_reduction_requests | created_by | uuid | YES |  |
| worker_reduction_requests | created_at | timestamp with time zone | NO | now() |
| worker_reduction_requests | updated_at | timestamp with time zone | NO | now() |
| worker_reduction_requests | deleted_at | timestamp with time zone | YES |  |
| worker_reduction_requests | deleted_by | uuid | YES |  |


> **Total columns: 1327**


## 3. Constraints

| table_name | constraint_name | constraint_type |
| --- | --- | --- |
| activities | 2200_878547_1_not_null | CHECK |
| activities | 2200_878547_25_not_null | CHECK |
| activities | 2200_878547_27_not_null | CHECK |
| activities | 2200_878547_2_not_null | CHECK |
| activities | 2200_878547_3_not_null | CHECK |
| activities | 2200_878547_4_not_null | CHECK |
| activities | 2200_878547_5_not_null | CHECK |
| activities | 2200_878547_6_not_null | CHECK |
| activities | 2200_878547_7_not_null | CHECK |
| activities | activities_created_by_fkey | FOREIGN KEY |
| activities | activities_entity_id_fkey | FOREIGN KEY |
| activities | activities_pkey | PRIMARY KEY |
| activities | activities_updated_by_fkey | FOREIGN KEY |
| audit_log | 2200_878771_16_not_null | CHECK |
| audit_log | 2200_878771_1_not_null | CHECK |
| audit_log | 2200_878771_2_not_null | CHECK |
| audit_log | 2200_878771_3_not_null | CHECK |
| audit_log | 2200_878771_4_not_null | CHECK |
| audit_log | audit_log_action_check | CHECK |
| audit_log | audit_log_actor_id_fkey | FOREIGN KEY |
| audit_log | audit_log_pkey | PRIMARY KEY |
| backup_log | 2200_927141_12_not_null | CHECK |
| backup_log | 2200_927141_1_not_null | CHECK |
| backup_log | 2200_927141_2_not_null | CHECK |
| backup_log | 2200_927141_3_not_null | CHECK |
| backup_log | backup_log_pkey | PRIMARY KEY |
| board_members | 2200_878437_11_not_null | CHECK |
| board_members | 2200_878437_12_not_null | CHECK |
| board_members | 2200_878437_13_not_null | CHECK |
| board_members | 2200_878437_1_not_null | CHECK |
| board_members | 2200_878437_2_not_null | CHECK |
| board_members | 2200_878437_3_not_null | CHECK |
| board_members | 2200_878437_5_not_null | CHECK |
| board_members | 2200_878437_6_not_null | CHECK |
| board_members | board_members_entity_id_fkey | FOREIGN KEY |
| board_members | board_members_pkey | PRIMARY KEY |
| career_paths | 2200_926839_1_not_null | CHECK |
| career_paths | 2200_926839_2_not_null | CHECK |
| career_paths | 2200_926839_3_not_null | CHECK |
| career_paths | 2200_926839_9_not_null | CHECK |
| career_paths | career_paths_occupation_id_fkey | FOREIGN KEY |
| career_paths | career_paths_pkey | PRIMARY KEY |
| commercial_branches | 2200_927019_12_not_null | CHECK |
| commercial_branches | 2200_927019_13_not_null | CHECK |
| commercial_branches | 2200_927019_1_not_null | CHECK |
| commercial_branches | 2200_927019_2_not_null | CHECK |
| commercial_branches | 2200_927019_3_not_null | CHECK |
| commercial_branches | commercial_branches_enterprise_id_fkey | FOREIGN KEY |
| commercial_branches | commercial_branches_pkey | PRIMARY KEY |
| commercial_contracts | 2200_927067_10_not_null | CHECK |
| commercial_contracts | 2200_927067_11_not_null | CHECK |
| commercial_contracts | 2200_927067_1_not_null | CHECK |
| commercial_contracts | 2200_927067_2_not_null | CHECK |
| commercial_contracts | 2200_927067_3_not_null | CHECK |
| commercial_contracts | 2200_927067_4_not_null | CHECK |
| commercial_contracts | 2200_927067_5_not_null | CHECK |
| commercial_contracts | 2200_927067_6_not_null | CHECK |
| commercial_contracts | 2200_927067_9_not_null | CHECK |
| commercial_contracts | commercial_contracts_enterprise_id_fkey | FOREIGN KEY |
| commercial_contracts | commercial_contracts_pkey | PRIMARY KEY |
| commercial_equipment | 2200_927037_1_not_null | CHECK |
| commercial_equipment | 2200_927037_2_not_null | CHECK |
| commercial_equipment | 2200_927037_3_not_null | CHECK |
| commercial_equipment | 2200_927037_9_not_null | CHECK |
| commercial_equipment | commercial_equipment_enterprise_id_fkey | FOREIGN KEY |
| commercial_equipment | commercial_equipment_pkey | PRIMARY KEY |
| commercial_establishments | 2200_926999_10_not_null | CHECK |
| commercial_establishments | 2200_926999_1_not_null | CHECK |
| commercial_establishments | 2200_926999_23_not_null | CHECK |
| commercial_establishments | 2200_926999_24_not_null | CHECK |
| commercial_establishments | 2200_926999_2_not_null | CHECK |
| commercial_establishments | 2200_926999_3_not_null | CHECK |
| commercial_establishments | 2200_926999_4_not_null | CHECK |
| commercial_establishments | 2200_926999_5_not_null | CHECK |
| commercial_establishments | commercial_establishments_commercial_register_number_key | UNIQUE |
| commercial_establishments | commercial_establishments_establishment_id_key | UNIQUE |
| commercial_establishments | commercial_establishments_pkey | PRIMARY KEY |
| commercial_establishments | commercial_establishments_unified_code_key | UNIQUE |
| commercial_warehouses | 2200_927052_1_not_null | CHECK |
| commercial_warehouses | 2200_927052_2_not_null | CHECK |
| commercial_warehouses | 2200_927052_3_not_null | CHECK |
| commercial_warehouses | 2200_927052_9_not_null | CHECK |
| commercial_warehouses | commercial_warehouses_enterprise_id_fkey | FOREIGN KEY |
| commercial_warehouses | commercial_warehouses_pkey | PRIMARY KEY |
| compliance_alerts | 2200_927382_1_not_null | CHECK |
| compliance_alerts | 2200_927382_20_not_null | CHECK |
| compliance_alerts | 2200_927382_21_not_null | CHECK |
| compliance_alerts | 2200_927382_2_not_null | CHECK |
| compliance_alerts | 2200_927382_4_not_null | CHECK |
| compliance_alerts | 2200_927382_5_not_null | CHECK |
| compliance_alerts | 2200_927382_6_not_null | CHECK |
| compliance_alerts | compliance_alerts_acknowledged_by_fkey | FOREIGN KEY |
| compliance_alerts | compliance_alerts_enterprise_id_fkey | FOREIGN KEY |
| compliance_alerts | compliance_alerts_pkey | PRIMARY KEY |
| compliance_alerts | compliance_alerts_resolved_by_fkey | FOREIGN KEY |
| compliance_matrices | 2200_927111_11_not_null | CHECK |
| compliance_matrices | 2200_927111_12_not_null | CHECK |
| compliance_matrices | 2200_927111_1_not_null | CHECK |
| compliance_matrices | 2200_927111_2_not_null | CHECK |
| compliance_matrices | 2200_927111_5_not_null | CHECK |
| compliance_matrices | 2200_927111_6_not_null | CHECK |
| compliance_matrices | 2200_927111_7_not_null | CHECK |
| compliance_matrices | compliance_matrices_checked_by_fkey | FOREIGN KEY |
| compliance_matrices | compliance_matrices_compliance_status_check | CHECK |
| compliance_matrices | compliance_matrices_enterprise_id_fkey | FOREIGN KEY |
| compliance_matrices | compliance_matrices_occupation_id_fkey | FOREIGN KEY |
| compliance_matrices | compliance_matrices_pkey | PRIMARY KEY |
| contract_types | 2200_909611_1_not_null | CHECK |
| contract_types | 2200_909611_2_not_null | CHECK |
| contract_types | 2200_909611_7_not_null | CHECK |
| contract_types | contract_types_pkey | PRIMARY KEY |
| currencies | 2200_926126_1_not_null | CHECK |
| currencies | 2200_926126_2_not_null | CHECK |
| currencies | 2200_926126_3_not_null | CHECK |
| currencies | 2200_926126_4_not_null | CHECK |
| currencies | 2200_926126_9_not_null | CHECK |
| currencies | currencies_code_key | UNIQUE |
| currencies | currencies_pkey | PRIMARY KEY |
| data_retention_log | 2200_926412_1_not_null | CHECK |
| data_retention_log | 2200_926412_2_not_null | CHECK |
| data_retention_log | 2200_926412_3_not_null | CHECK |
| data_retention_log | 2200_926412_4_not_null | CHECK |
| data_retention_log | 2200_926412_7_not_null | CHECK |
| data_retention_log | data_retention_log_action_check | CHECK |
| data_retention_log | data_retention_log_executed_by_fkey | FOREIGN KEY |
| data_retention_log | data_retention_log_pkey | PRIMARY KEY |
| documents | 2200_878583_1_not_null | CHECK |
| documents | 2200_878583_22_not_null | CHECK |
| documents | 2200_878583_24_not_null | CHECK |
| documents | 2200_878583_2_not_null | CHECK |
| documents | 2200_878583_4_not_null | CHECK |
| documents | 2200_878583_5_not_null | CHECK |
| documents | 2200_878583_6_not_null | CHECK |
| documents | documents_created_by_fkey | FOREIGN KEY |
| documents | documents_entity_id_fkey | FOREIGN KEY |
| documents | documents_pkey | PRIMARY KEY |
| documents | documents_updated_by_fkey | FOREIGN KEY |
| dynamic_fields | 2200_878752_1_not_null | CHECK |
| dynamic_fields | 2200_878752_2_not_null | CHECK |
| dynamic_fields | 2200_878752_3_not_null | CHECK |
| dynamic_fields | 2200_878752_5_not_null | CHECK |
| dynamic_fields | 2200_878752_6_not_null | CHECK |
| dynamic_fields | 2200_878752_7_not_null | CHECK |
| dynamic_fields | dynamic_fields_entity_id_field_name_key | UNIQUE |
| dynamic_fields | dynamic_fields_entity_id_fkey | FOREIGN KEY |
| dynamic_fields | dynamic_fields_field_type_check | CHECK |
| dynamic_fields | dynamic_fields_pkey | PRIMARY KEY |
| election_results | 2200_878525_1_not_null | CHECK |
| election_results | 2200_878525_2_not_null | CHECK |
| election_results | 2200_878525_4_not_null | CHECK |
| election_results | 2200_878525_5_not_null | CHECK |
| election_results | 2200_878525_6_not_null | CHECK |
| election_results | 2200_878525_8_not_null | CHECK |
| election_results | 2200_878525_9_not_null | CHECK |
| election_results | election_results_election_id_fkey | FOREIGN KEY |
| election_results | election_results_member_id_fkey | FOREIGN KEY |
| election_results | election_results_pkey | PRIMARY KEY |
| elections | 2200_878491_1_not_null | CHECK |
| elections | 2200_878491_21_not_null | CHECK |
| elections | 2200_878491_23_not_null | CHECK |
| elections | 2200_878491_2_not_null | CHECK |
| elections | 2200_878491_3_not_null | CHECK |
| elections | 2200_878491_4_not_null | CHECK |
| elections | 2200_878491_5_not_null | CHECK |
| elections | 2200_878491_6_not_null | CHECK |
| elections | 2200_878491_7_not_null | CHECK |
| elections | elections_created_by_fkey | FOREIGN KEY |
| elections | elections_entity_id_fkey | FOREIGN KEY |
| elections | elections_pkey | PRIMARY KEY |
| elections | elections_updated_by_fkey | FOREIGN KEY |
| enterprise_evaluation_levels | 2200_926085_1_not_null | CHECK |
| enterprise_evaluation_levels | 2200_926085_2_not_null | CHECK |
| enterprise_evaluation_levels | 2200_926085_3_not_null | CHECK |
| enterprise_evaluation_levels | 2200_926085_4_not_null | CHECK |
| enterprise_evaluation_levels | 2200_926085_7_not_null | CHECK |
| enterprise_evaluation_levels | enterprise_evaluation_levels_level_name_key | UNIQUE |
| enterprise_evaluation_levels | enterprise_evaluation_levels_pkey | PRIMARY KEY |
| enterprise_isic_links | 2200_927222_1_not_null | CHECK |
| enterprise_isic_links | 2200_927222_2_not_null | CHECK |
| enterprise_isic_links | 2200_927222_3_not_null | CHECK |
| enterprise_isic_links | 2200_927222_5_not_null | CHECK |
| enterprise_isic_links | 2200_927222_8_not_null | CHECK |
| enterprise_isic_links | enterprise_isic_links_assigned_by_fkey | FOREIGN KEY |
| enterprise_isic_links | enterprise_isic_links_enterprise_id_fkey | FOREIGN KEY |
| enterprise_isic_links | enterprise_isic_links_enterprise_id_isic_code_key | UNIQUE |
| enterprise_isic_links | enterprise_isic_links_isic_code_fkey | FOREIGN KEY |
| enterprise_isic_links | enterprise_isic_links_pkey | PRIMARY KEY |
| enterprise_occupation_links | 2200_926692_10_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_11_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_12_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_16_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_1_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_23_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_24_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_2_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_3_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_4_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_6_not_null | CHECK |
| enterprise_occupation_links | 2200_926692_7_not_null | CHECK |
| enterprise_occupation_links | enterprise_occupation_links_enterprise_id_fkey | FOREIGN KEY |
| enterprise_occupation_links | enterprise_occupation_links_enterprise_id_occupation_id_key | UNIQUE |
| enterprise_occupation_links | enterprise_occupation_links_link_status_check | CHECK |
| enterprise_occupation_links | enterprise_occupation_links_occupation_id_fkey | FOREIGN KEY |
| enterprise_occupation_links | enterprise_occupation_links_pkey | PRIMARY KEY |
| enterprise_slots | 2200_927083_13_not_null | CHECK |
| enterprise_slots | 2200_927083_14_not_null | CHECK |
| enterprise_slots | 2200_927083_1_not_null | CHECK |
| enterprise_slots | 2200_927083_2_not_null | CHECK |
| enterprise_slots | 2200_927083_3_not_null | CHECK |
| enterprise_slots | 2200_927083_4_not_null | CHECK |
| enterprise_slots | enterprise_slots_enterprise_id_fkey | FOREIGN KEY |
| enterprise_slots | enterprise_slots_occupation_id_fkey | FOREIGN KEY |
| enterprise_slots | enterprise_slots_pkey | PRIMARY KEY |
| enterprise_slots | enterprise_slots_slot_code_key | UNIQUE |
| entity_relationships | 2200_878725_10_not_null | CHECK |
| entity_relationships | 2200_878725_1_not_null | CHECK |
| entity_relationships | 2200_878725_2_not_null | CHECK |
| entity_relationships | 2200_878725_3_not_null | CHECK |
| entity_relationships | 2200_878725_4_not_null | CHECK |
| entity_relationships | 2200_878725_8_not_null | CHECK |
| entity_relationships | entity_relationships_pkey | PRIMARY KEY |
| entity_relationships | entity_relationships_relationship_type_check | CHECK |
| entity_relationships | entity_relationships_source_entity_id_fkey | FOREIGN KEY |
| entity_relationships | entity_relationships_source_entity_id_target_entity_id_rela_key | UNIQUE |
| entity_relationships | entity_relationships_status_check | CHECK |
| entity_relationships | entity_relationships_target_entity_id_fkey | FOREIGN KEY |
| error_log | 2200_926257_14_not_null | CHECK |
| error_log | 2200_926257_1_not_null | CHECK |
| error_log | 2200_926257_2_not_null | CHECK |
| error_log | 2200_926257_3_not_null | CHECK |
| error_log | 2200_926257_4_not_null | CHECK |
| error_log | 2200_926257_5_not_null | CHECK |
| error_log | error_log_pkey | PRIMARY KEY |
| error_log | error_log_resolved_by_fkey | FOREIGN KEY |
| error_log | error_log_user_id_fkey | FOREIGN KEY |
| evaluation_certificates | 2200_926762_1_not_null | CHECK |
| evaluation_certificates | 2200_926762_20_not_null | CHECK |
| evaluation_certificates | 2200_926762_21_not_null | CHECK |
| evaluation_certificates | 2200_926762_2_not_null | CHECK |
| evaluation_certificates | 2200_926762_4_not_null | CHECK |
| evaluation_certificates | 2200_926762_5_not_null | CHECK |
| evaluation_certificates | 2200_926762_6_not_null | CHECK |
| evaluation_certificates | 2200_926762_7_not_null | CHECK |
| evaluation_certificates | 2200_926762_8_not_null | CHECK |
| evaluation_certificates | 2200_926762_9_not_null | CHECK |
| evaluation_certificates | evaluation_certificates_certificate_number_key | UNIQUE |
| evaluation_certificates | evaluation_certificates_enterprise_id_fkey | FOREIGN KEY |
| evaluation_certificates | evaluation_certificates_inspection_id_fkey | FOREIGN KEY |
| evaluation_certificates | evaluation_certificates_pkey | PRIMARY KEY |
| expatriate_licenses | 2200_926910_11_not_null | CHECK |
| expatriate_licenses | 2200_926910_12_not_null | CHECK |
| expatriate_licenses | 2200_926910_13_not_null | CHECK |
| expatriate_licenses | 2200_926910_1_not_null | CHECK |
| expatriate_licenses | 2200_926910_2_not_null | CHECK |
| expatriate_licenses | 2200_926910_4_not_null | CHECK |
| expatriate_licenses | 2200_926910_5_not_null | CHECK |
| expatriate_licenses | 2200_926910_7_not_null | CHECK |
| expatriate_licenses | 2200_926910_8_not_null | CHECK |
| expatriate_licenses | 2200_926910_9_not_null | CHECK |
| expatriate_licenses | expatriate_licenses_enterprise_id_fkey | FOREIGN KEY |
| expatriate_licenses | expatriate_licenses_license_number_key | UNIQUE |
| expatriate_licenses | expatriate_licenses_link_id_fkey | FOREIGN KEY |
| expatriate_licenses | expatriate_licenses_pkey | PRIMARY KEY |
| expert_opinions | 2200_926868_12_not_null | CHECK |
| expert_opinions | 2200_926868_1_not_null | CHECK |
| expert_opinions | 2200_926868_2_not_null | CHECK |
| expert_opinions | 2200_926868_3_not_null | CHECK |
| expert_opinions | 2200_926868_5_not_null | CHECK |
| expert_opinions | expert_opinions_autonomy_rating_check | CHECK |
| expert_opinions | expert_opinions_complexity_rating_check | CHECK |
| expert_opinions | expert_opinions_hazard_rating_check | CHECK |
| expert_opinions | expert_opinions_occupation_id_fkey | FOREIGN KEY |
| expert_opinions | expert_opinions_pkey | PRIMARY KEY |
| expert_opinions | expert_opinions_responsibility_rating_check | CHECK |
| expert_opinions | expert_opinions_skill_rating_check | CHECK |
| fee_payments | 2200_927301_10_not_null | CHECK |
| fee_payments | 2200_927301_15_not_null | CHECK |
| fee_payments | 2200_927301_16_not_null | CHECK |
| fee_payments | 2200_927301_1_not_null | CHECK |
| fee_payments | 2200_927301_5_not_null | CHECK |
| fee_payments | 2200_927301_6_not_null | CHECK |
| fee_payments | 2200_927301_7_not_null | CHECK |
| fee_payments | 2200_927301_9_not_null | CHECK |
| fee_payments | fee_payments_amount_check | CHECK |
| fee_payments | fee_payments_entity_id_fkey | FOREIGN KEY |
| fee_payments | fee_payments_member_id_fkey | FOREIGN KEY |
| fee_payments | fee_payments_pkey | PRIMARY KEY |
| fee_payments | fee_payments_processed_by_fkey | FOREIGN KEY |
| fee_payments | fee_payments_receipt_number_key | UNIQUE |
| fee_payments | fee_payments_service_id_fkey | FOREIGN KEY |
| governorates | 2200_926140_1_not_null | CHECK |
| governorates | 2200_926140_2_not_null | CHECK |
| governorates | 2200_926140_3_not_null | CHECK |
| governorates | 2200_926140_8_not_null | CHECK |
| governorates | governorates_code_key | UNIQUE |
| governorates | governorates_pkey | PRIMARY KEY |
| hazardous_occupations | 2200_926821_18_not_null | CHECK |
| hazardous_occupations | 2200_926821_19_not_null | CHECK |
| hazardous_occupations | 2200_926821_1_not_null | CHECK |
| hazardous_occupations | 2200_926821_2_not_null | CHECK |
| hazardous_occupations | 2200_926821_3_not_null | CHECK |
| hazardous_occupations | 2200_926821_4_not_null | CHECK |
| hazardous_occupations | 2200_926821_6_not_null | CHECK |
| hazardous_occupations | 2200_926821_7_not_null | CHECK |
| hazardous_occupations | hazardous_occupations_occupation_id_fkey | FOREIGN KEY |
| hazardous_occupations | hazardous_occupations_pkey | PRIMARY KEY |
| hazardous_occupations | hazardous_occupations_risk_level_check | CHECK |
| ilo_conventions | 2200_925986_1_not_null | CHECK |
| ilo_conventions | 2200_925986_2_not_null | CHECK |
| ilo_conventions | 2200_925986_3_not_null | CHECK |
| ilo_conventions | 2200_925986_6_not_null | CHECK |
| ilo_conventions | 2200_925986_9_not_null | CHECK |
| ilo_conventions | ilo_conventions_convention_number_key | UNIQUE |
| ilo_conventions | ilo_conventions_pkey | PRIMARY KEY |
| ilo_conventions | ilo_conventions_status_check | CHECK |
| inspection_checklists | 2200_926962_1_not_null | CHECK |
| inspection_checklists | 2200_926962_2_not_null | CHECK |
| inspection_checklists | 2200_926962_3_not_null | CHECK |
| inspection_checklists | 2200_926962_4_not_null | CHECK |
| inspection_checklists | 2200_926962_9_not_null | CHECK |
| inspection_checklists | inspection_checklists_inspection_id_fkey | FOREIGN KEY |
| inspection_checklists | inspection_checklists_pkey | PRIMARY KEY |
| inspections | 2200_926725_1_not_null | CHECK |
| inspections | 2200_926725_29_not_null | CHECK |
| inspections | 2200_926725_2_not_null | CHECK |
| inspections | 2200_926725_31_not_null | CHECK |
| inspections | 2200_926725_3_not_null | CHECK |
| inspections | 2200_926725_4_not_null | CHECK |
| inspections | 2200_926725_5_not_null | CHECK |
| inspections | 2200_926725_7_not_null | CHECK |
| inspections | 2200_926725_8_not_null | CHECK |
| inspections | 2200_926725_9_not_null | CHECK |
| inspections | inspections_created_by_fkey | FOREIGN KEY |
| inspections | inspections_enterprise_id_fkey | FOREIGN KEY |
| inspections | inspections_inspection_number_key | UNIQUE |
| inspections | inspections_pkey | PRIMARY KEY |
| institutional_templates | 2200_926096_1_not_null | CHECK |
| institutional_templates | 2200_926096_2_not_null | CHECK |
| institutional_templates | 2200_926096_3_not_null | CHECK |
| institutional_templates | 2200_926096_4_not_null | CHECK |
| institutional_templates | 2200_926096_8_not_null | CHECK |
| institutional_templates | institutional_templates_pkey | PRIMARY KEY |
| institutional_templates | institutional_templates_template_code_key | UNIQUE |
| international_standards | 2200_925999_11_not_null | CHECK |
| international_standards | 2200_925999_1_not_null | CHECK |
| international_standards | 2200_925999_2_not_null | CHECK |
| international_standards | 2200_925999_3_not_null | CHECK |
| international_standards | 2200_925999_4_not_null | CHECK |
| international_standards | international_standards_organization_check | CHECK |
| international_standards | international_standards_pkey | PRIMARY KEY |
| international_standards | international_standards_standard_code_key | UNIQUE |
| isic4_classifications | 2200_926369_1_not_null | CHECK |
| isic4_classifications | 2200_926369_22_not_null | CHECK |
| isic4_classifications | 2200_926369_23_not_null | CHECK |
| isic4_classifications | 2200_926369_2_not_null | CHECK |
| isic4_classifications | 2200_926369_4_not_null | CHECK |
| isic4_classifications | 2200_926369_5_not_null | CHECK |
| isic4_classifications | 2200_926369_6_not_null | CHECK |
| isic4_classifications | isic4_classifications_isic_code_key | UNIQUE |
| isic4_classifications | isic4_classifications_level_check | CHECK |
| isic4_classifications | isic4_classifications_parent_code_fkey | FOREIGN KEY |
| isic4_classifications | isic4_classifications_pkey | PRIMARY KEY |
| labor_disputes | 2200_926888_10_not_null | CHECK |
| labor_disputes | 2200_926888_13_not_null | CHECK |
| labor_disputes | 2200_926888_14_not_null | CHECK |
| labor_disputes | 2200_926888_1_not_null | CHECK |
| labor_disputes | 2200_926888_2_not_null | CHECK |
| labor_disputes | 2200_926888_3_not_null | CHECK |
| labor_disputes | 2200_926888_4_not_null | CHECK |
| labor_disputes | 2200_926888_6_not_null | CHECK |
| labor_disputes | 2200_926888_7_not_null | CHECK |
| labor_disputes | 2200_926888_8_not_null | CHECK |
| labor_disputes | labor_disputes_enterprise_id_fkey | FOREIGN KEY |
| labor_disputes | labor_disputes_occupation_id_fkey | FOREIGN KEY |
| labor_disputes | labor_disputes_pkey | PRIMARY KEY |
| law_articles | 2200_925971_10_not_null | CHECK |
| law_articles | 2200_925971_1_not_null | CHECK |
| law_articles | 2200_925971_2_not_null | CHECK |
| law_articles | 2200_925971_3_not_null | CHECK |
| law_articles | 2200_925971_4_not_null | CHECK |
| law_articles | law_articles_legal_reference_id_fkey | FOREIGN KEY |
| law_articles | law_articles_pkey | PRIMARY KEY |
| legal_references | 2200_925960_1_not_null | CHECK |
| legal_references | 2200_925960_2_not_null | CHECK |
| legal_references | 2200_925960_9_not_null | CHECK |
| legal_references | legal_references_pkey | PRIMARY KEY |
| legal_references | legal_references_status_check | CHECK |
| licenses | 2200_878613_14_not_null | CHECK |
| licenses | 2200_878613_15_not_null | CHECK |
| licenses | 2200_878613_1_not_null | CHECK |
| licenses | 2200_878613_2_not_null | CHECK |
| licenses | 2200_878613_3_not_null | CHECK |
| licenses | 2200_878613_4_not_null | CHECK |
| licenses | 2200_878613_5_not_null | CHECK |
| licenses | 2200_878613_6_not_null | CHECK |
| licenses | 2200_878613_7_not_null | CHECK |
| licenses | 2200_878613_9_not_null | CHECK |
| licenses | licenses_entity_id_fkey | FOREIGN KEY |
| licenses | licenses_license_number_key | UNIQUE |
| licenses | licenses_pkey | PRIMARY KEY |
| maturity_assessments | 2200_926933_15_not_null | CHECK |
| maturity_assessments | 2200_926933_17_not_null | CHECK |
| maturity_assessments | 2200_926933_1_not_null | CHECK |
| maturity_assessments | 2200_926933_2_not_null | CHECK |
| maturity_assessments | 2200_926933_3_not_null | CHECK |
| maturity_assessments | maturity_assessments_assessed_by_fkey | FOREIGN KEY |
| maturity_assessments | maturity_assessments_entity_id_fkey | FOREIGN KEY |
| maturity_assessments | maturity_assessments_pkey | PRIMARY KEY |
| members | 2200_878454_1_not_null | CHECK |
| members | 2200_878454_23_not_null | CHECK |
| members | 2200_878454_25_not_null | CHECK |
| members | 2200_878454_2_not_null | CHECK |
| members | 2200_878454_30_not_null | CHECK |
| members | 2200_878454_32_not_null | CHECK |
| members | 2200_878454_3_not_null | CHECK |
| members | 2200_878454_4_not_null | CHECK |
| members | 2200_878454_5_not_null | CHECK |
| members | members_created_by_fkey | FOREIGN KEY |
| members | members_entity_id_fkey | FOREIGN KEY |
| members | members_entity_id_national_id_key | UNIQUE |
| members | members_pkey | PRIMARY KEY |
| members | members_updated_by_fkey | FOREIGN KEY |
| notifications | 2200_878792_1_not_null | CHECK |
| notifications | 2200_878792_2_not_null | CHECK |
| notifications | 2200_878792_3_not_null | CHECK |
| notifications | 2200_878792_4_not_null | CHECK |
| notifications | 2200_878792_5_not_null | CHECK |
| notifications | 2200_878792_6_not_null | CHECK |
| notifications | 2200_878792_9_not_null | CHECK |
| notifications | notifications_entity_id_fkey | FOREIGN KEY |
| notifications | notifications_pkey | PRIMARY KEY |
| notifications | notifications_recipient_id_fkey | FOREIGN KEY |
| notifications | notifications_type_check | CHECK |
| organizational_entities | 2200_878375_101_not_null | CHECK |
| organizational_entities | 2200_878375_103_not_null | CHECK |
| organizational_entities | 2200_878375_11_not_null | CHECK |
| organizational_entities | 2200_878375_13_not_null | CHECK |
| organizational_entities | 2200_878375_16_not_null | CHECK |
| organizational_entities | 2200_878375_17_not_null | CHECK |
| organizational_entities | 2200_878375_18_not_null | CHECK |
| organizational_entities | 2200_878375_19_not_null | CHECK |
| organizational_entities | 2200_878375_1_not_null | CHECK |
| organizational_entities | 2200_878375_20_not_null | CHECK |
| organizational_entities | 2200_878375_21_not_null | CHECK |
| organizational_entities | 2200_878375_2_not_null | CHECK |
| organizational_entities | 2200_878375_35_not_null | CHECK |
| organizational_entities | 2200_878375_36_not_null | CHECK |
| organizational_entities | 2200_878375_3_not_null | CHECK |
| organizational_entities | 2200_878375_5_not_null | CHECK |
| organizational_entities | 2200_878375_69_not_null | CHECK |
| organizational_entities | 2200_878375_6_not_null | CHECK |
| organizational_entities | 2200_878375_70_not_null | CHECK |
| organizational_entities | 2200_878375_71_not_null | CHECK |
| organizational_entities | 2200_878375_88_not_null | CHECK |
| organizational_entities | 2200_878375_99_not_null | CHECK |
| organizational_entities | organizational_entities_created_by_fkey | FOREIGN KEY |
| organizational_entities | organizational_entities_deleted_by_fkey | FOREIGN KEY |
| organizational_entities | organizational_entities_entity_code_key | UNIQUE |
| organizational_entities | organizational_entities_parent_entity_id_fkey | FOREIGN KEY |
| organizational_entities | organizational_entities_pkey | PRIMARY KEY |
| organizational_entities | organizational_entities_registration_number_key | UNIQUE |
| organizational_entities | organizational_entities_unified_code_key | UNIQUE |
| organizational_entities | organizational_entities_updated_by_fkey | FOREIGN KEY |
| professions | 2200_926649_12_not_null | CHECK |
| professions | 2200_926649_13_not_null | CHECK |
| professions | 2200_926649_14_not_null | CHECK |
| professions | 2200_926649_15_not_null | CHECK |
| professions | 2200_926649_1_not_null | CHECK |
| professions | 2200_926649_2_not_null | CHECK |
| professions | 2200_926649_3_not_null | CHECK |
| professions | 2200_926649_6_not_null | CHECK |
| professions | 2200_926649_7_not_null | CHECK |
| professions | 2200_926649_8_not_null | CHECK |
| professions | 2200_926649_90_not_null | CHECK |
| professions | 2200_926649_92_not_null | CHECK |
| professions | 2200_926649_94_not_null | CHECK |
| professions | professions_code_key | UNIQUE |
| professions | professions_created_by_fkey | FOREIGN KEY |
| professions | professions_pkey | PRIMARY KEY |
| professions | professions_updated_by_fkey | FOREIGN KEY |
| profiles | 2200_878359_15_not_null | CHECK |
| profiles | 2200_878359_16_not_null | CHECK |
| profiles | 2200_878359_1_not_null | CHECK |
| profiles | 2200_878359_2_not_null | CHECK |
| profiles | 2200_878359_4_not_null | CHECK |
| profiles | 2200_878359_6_not_null | CHECK |
| profiles | 2200_878359_8_not_null | CHECK |
| profiles | profiles_email_key | UNIQUE |
| profiles | profiles_pkey | PRIMARY KEY |
| reports | 2200_878816_10_not_null | CHECK |
| reports | 2200_878816_11_not_null | CHECK |
| reports | 2200_878816_12_not_null | CHECK |
| reports | 2200_878816_1_not_null | CHECK |
| reports | 2200_878816_2_not_null | CHECK |
| reports | 2200_878816_3_not_null | CHECK |
| reports | 2200_878816_7_not_null | CHECK |
| reports | reports_created_by_fkey | FOREIGN KEY |
| reports | reports_pkey | PRIMARY KEY |
| risk_assessments | 2200_926238_13_not_null | CHECK |
| risk_assessments | 2200_926238_14_not_null | CHECK |
| risk_assessments | 2200_926238_1_not_null | CHECK |
| risk_assessments | 2200_926238_2_not_null | CHECK |
| risk_assessments | 2200_926238_3_not_null | CHECK |
| risk_assessments | 2200_926238_4_not_null | CHECK |
| risk_assessments | risk_assessments_entity_id_fkey | FOREIGN KEY |
| risk_assessments | risk_assessments_impact_check | CHECK |
| risk_assessments | risk_assessments_likelihood_check | CHECK |
| risk_assessments | risk_assessments_pkey | PRIMARY KEY |
| salary_ranges | 2200_926853_10_not_null | CHECK |
| salary_ranges | 2200_926853_1_not_null | CHECK |
| salary_ranges | 2200_926853_2_not_null | CHECK |
| salary_ranges | 2200_926853_3_not_null | CHECK |
| salary_ranges | 2200_926853_4_not_null | CHECK |
| salary_ranges | salary_ranges_occupation_id_fkey | FOREIGN KEY |
| salary_ranges | salary_ranges_pkey | PRIMARY KEY |
| schema_migrations | 2200_926404_1_not_null | CHECK |
| schema_migrations | 2200_926404_2_not_null | CHECK |
| schema_migrations | schema_migrations_pkey | PRIMARY KEY |
| sector_users | 2200_983040_1_not_null | CHECK |
| sector_users | 2200_983040_2_not_null | CHECK |
| sector_users | 2200_983040_3_not_null | CHECK |
| sector_users | 2200_983040_4_not_null | CHECK |
| sector_users | 2200_983040_5_not_null | CHECK |
| sector_users | 2200_983040_6_not_null | CHECK |
| sector_users | 2200_983040_7_not_null | CHECK |
| sector_users | sector_users_email_key | UNIQUE |
| sector_users | sector_users_pkey | PRIMARY KEY |
| service_requests | 2200_878649_12_not_null | CHECK |
| service_requests | 2200_878649_14_not_null | CHECK |
| service_requests | 2200_878649_1_not_null | CHECK |
| service_requests | 2200_878649_2_not_null | CHECK |
| service_requests | 2200_878649_3_not_null | CHECK |
| service_requests | 2200_878649_4_not_null | CHECK |
| service_requests | 2200_878649_5_not_null | CHECK |
| service_requests | 2200_878649_6_not_null | CHECK |
| service_requests | service_requests_created_by_fkey | FOREIGN KEY |
| service_requests | service_requests_entity_id_fkey | FOREIGN KEY |
| service_requests | service_requests_pkey | PRIMARY KEY |
| service_requests | service_requests_processed_by_fkey | FOREIGN KEY |
| service_requests | service_requests_request_number_key | UNIQUE |
| service_requests | service_requests_service_id_fkey | FOREIGN KEY |
| services | 2200_878634_12_not_null | CHECK |
| services | 2200_878634_1_not_null | CHECK |
| services | 2200_878634_2_not_null | CHECK |
| services | 2200_878634_3_not_null | CHECK |
| services | 2200_878634_5_not_null | CHECK |
| services | 2200_878634_6_not_null | CHECK |
| services | 2200_878634_7_not_null | CHECK |
| services | services_pkey | PRIMARY KEY |
| services | services_service_code_key | UNIQUE |
| smart_suggestions | 2200_926977_10_not_null | CHECK |
| smart_suggestions | 2200_926977_1_not_null | CHECK |
| smart_suggestions | 2200_926977_4_not_null | CHECK |
| smart_suggestions | 2200_926977_5_not_null | CHECK |
| smart_suggestions | smart_suggestions_entity_id_fkey | FOREIGN KEY |
| smart_suggestions | smart_suggestions_occupation_id_fkey | FOREIGN KEY |
| smart_suggestions | smart_suggestions_pkey | PRIMARY KEY |
| training_records | 2200_926793_14_not_null | CHECK |
| training_records | 2200_926793_1_not_null | CHECK |
| training_records | 2200_926793_20_not_null | CHECK |
| training_records | 2200_926793_21_not_null | CHECK |
| training_records | 2200_926793_2_not_null | CHECK |
| training_records | 2200_926793_5_not_null | CHECK |
| training_records | 2200_926793_9_not_null | CHECK |
| training_records | training_records_enterprise_id_fkey | FOREIGN KEY |
| training_records | training_records_member_id_fkey | FOREIGN KEY |
| training_records | training_records_occupation_id_fkey | FOREIGN KEY |
| training_records | training_records_pkey | PRIMARY KEY |
| violations | 2200_878686_1_not_null | CHECK |
| violations | 2200_878686_22_not_null | CHECK |
| violations | 2200_878686_24_not_null | CHECK |
| violations | 2200_878686_2_not_null | CHECK |
| violations | 2200_878686_3_not_null | CHECK |
| violations | 2200_878686_4_not_null | CHECK |
| violations | 2200_878686_5_not_null | CHECK |
| violations | 2200_878686_6_not_null | CHECK |
| violations | 2200_878686_7_not_null | CHECK |
| violations | 2200_878686_9_not_null | CHECK |
| violations | violations_created_by_fkey | FOREIGN KEY |
| violations | violations_detected_by_fkey | FOREIGN KEY |
| violations | violations_entity_id_fkey | FOREIGN KEY |
| violations | violations_pkey | PRIMARY KEY |
| violations | violations_resolved_by_fkey | FOREIGN KEY |
| violations | violations_violation_number_key | UNIQUE |
| worker_dispatches | 2200_927158_12_not_null | CHECK |
| worker_dispatches | 2200_927158_16_not_null | CHECK |
| worker_dispatches | 2200_927158_18_not_null | CHECK |
| worker_dispatches | 2200_927158_1_not_null | CHECK |
| worker_dispatches | 2200_927158_2_not_null | CHECK |
| worker_dispatches | 2200_927158_33_not_null | CHECK |
| worker_dispatches | 2200_927158_34_not_null | CHECK |
| worker_dispatches | 2200_927158_3_not_null | CHECK |
| worker_dispatches | 2200_927158_9_not_null | CHECK |
| worker_dispatches | worker_dispatches_approved_by_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_created_by_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_dispatch_number_key | UNIQUE |
| worker_dispatches | worker_dispatches_link_id_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_occupation_id_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_pkey | PRIMARY KEY |
| worker_dispatches | worker_dispatches_receiving_enterprise_id_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_reviewed_by_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_sending_enterprise_id_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_submitted_by_fkey | FOREIGN KEY |
| worker_dispatches | worker_dispatches_worker_member_id_fkey | FOREIGN KEY |
| worker_procedures | 2200_926031_11_not_null | CHECK |
| worker_procedures | 2200_926031_1_not_null | CHECK |
| worker_procedures | 2200_926031_2_not_null | CHECK |
| worker_procedures | 2200_926031_3_not_null | CHECK |
| worker_procedures | 2200_926031_5_not_null | CHECK |
| worker_procedures | worker_procedures_pkey | PRIMARY KEY |
| worker_procedures | worker_procedures_procedure_code_key | UNIQUE |
| worker_profiles | 2200_927412_1_not_null | CHECK |
| worker_profiles | 2200_927412_20_not_null | CHECK |
| worker_profiles | 2200_927412_21_not_null | CHECK |
| worker_profiles | 2200_927412_2_not_null | CHECK |
| worker_profiles | 2200_927412_6_not_null | CHECK |
| worker_profiles | worker_profiles_current_enterprise_id_fkey | FOREIGN KEY |
| worker_profiles | worker_profiles_current_occupation_id_fkey | FOREIGN KEY |
| worker_profiles | worker_profiles_link_id_fkey | FOREIGN KEY |
| worker_profiles | worker_profiles_member_id_fkey | FOREIGN KEY |
| worker_profiles | worker_profiles_member_id_key | UNIQUE |
| worker_profiles | worker_profiles_pkey | PRIMARY KEY |
| worker_reduction_requests | 2200_926313_18_not_null | CHECK |
| worker_reduction_requests | 2200_926313_1_not_null | CHECK |
| worker_reduction_requests | 2200_926313_2_not_null | CHECK |
| worker_reduction_requests | 2200_926313_38_not_null | CHECK |
| worker_reduction_requests | 2200_926313_39_not_null | CHECK |
| worker_reduction_requests | 2200_926313_3_not_null | CHECK |
| worker_reduction_requests | 2200_926313_4_not_null | CHECK |
| worker_reduction_requests | 2200_926313_5_not_null | CHECK |
| worker_reduction_requests | 2200_926313_7_not_null | CHECK |
| worker_reduction_requests | 2200_926313_8_not_null | CHECK |
| worker_reduction_requests | worker_reduction_requests_created_by_fkey | FOREIGN KEY |
| worker_reduction_requests | worker_reduction_requests_dept_reviewer_id_fkey | FOREIGN KEY |
| worker_reduction_requests | worker_reduction_requests_enterprise_id_fkey | FOREIGN KEY |
| worker_reduction_requests | worker_reduction_requests_executed_by_fkey | FOREIGN KEY |
| worker_reduction_requests | worker_reduction_requests_final_approver_id_fkey | FOREIGN KEY |
| worker_reduction_requests | worker_reduction_requests_legal_reviewer_id_fkey | FOREIGN KEY |
| worker_reduction_requests | worker_reduction_requests_pkey | PRIMARY KEY |
| worker_reduction_requests | worker_reduction_requests_request_number_key | UNIQUE |
| worker_reduction_requests | worker_reduction_requests_requested_reduction_count_check | CHECK |
| worker_reduction_requests | worker_reduction_requests_submitted_by_fkey | FOREIGN KEY |


> **Total constraints: 642**


## 4. Foreign Keys

| table_name | column_name | foreign_table_name | foreign_column_name | constraint_name |
| --- | --- | --- | --- | --- |
| activities | created_by | profiles | id | activities_created_by_fkey |
| activities | entity_id | organizational_entities | entity_id | activities_entity_id_fkey |
| activities | updated_by | profiles | id | activities_updated_by_fkey |
| audit_log | actor_id | profiles | id | audit_log_actor_id_fkey |
| board_members | entity_id | organizational_entities | entity_id | board_members_entity_id_fkey |
| career_paths | occupation_id | professions | id | career_paths_occupation_id_fkey |
| commercial_branches | enterprise_id | commercial_establishments | id | commercial_branches_enterprise_id_fkey |
| commercial_contracts | enterprise_id | commercial_establishments | id | commercial_contracts_enterprise_id_fkey |
| commercial_equipment | enterprise_id | commercial_establishments | id | commercial_equipment_enterprise_id_fkey |
| commercial_warehouses | enterprise_id | commercial_establishments | id | commercial_warehouses_enterprise_id_fkey |
| compliance_alerts | acknowledged_by | profiles | id | compliance_alerts_acknowledged_by_fkey |
| compliance_alerts | enterprise_id | organizational_entities | entity_id | compliance_alerts_enterprise_id_fkey |
| compliance_alerts | resolved_by | profiles | id | compliance_alerts_resolved_by_fkey |
| compliance_matrices | checked_by | profiles | id | compliance_matrices_checked_by_fkey |
| compliance_matrices | enterprise_id | organizational_entities | entity_id | compliance_matrices_enterprise_id_fkey |
| compliance_matrices | occupation_id | professions | id | compliance_matrices_occupation_id_fkey |
| data_retention_log | executed_by | profiles | id | data_retention_log_executed_by_fkey |
| documents | created_by | profiles | id | documents_created_by_fkey |
| documents | entity_id | organizational_entities | entity_id | documents_entity_id_fkey |
| documents | updated_by | profiles | id | documents_updated_by_fkey |
| dynamic_fields | entity_id | organizational_entities | entity_id | dynamic_fields_entity_id_fkey |
| election_results | election_id | elections | id | election_results_election_id_fkey |
| election_results | member_id | members | id | election_results_member_id_fkey |
| elections | created_by | profiles | id | elections_created_by_fkey |
| elections | entity_id | organizational_entities | entity_id | elections_entity_id_fkey |
| elections | updated_by | profiles | id | elections_updated_by_fkey |
| enterprise_isic_links | assigned_by | profiles | id | enterprise_isic_links_assigned_by_fkey |
| enterprise_isic_links | enterprise_id | commercial_establishments | id | enterprise_isic_links_enterprise_id_fkey |
| enterprise_isic_links | isic_code | isic4_classifications | isic_code | enterprise_isic_links_isic_code_fkey |
| enterprise_occupation_links | enterprise_id | organizational_entities | entity_id | enterprise_occupation_links_enterprise_id_fkey |
| enterprise_occupation_links | occupation_id | professions | id | enterprise_occupation_links_occupation_id_fkey |
| enterprise_slots | enterprise_id | organizational_entities | entity_id | enterprise_slots_enterprise_id_fkey |
| enterprise_slots | occupation_id | professions | id | enterprise_slots_occupation_id_fkey |
| entity_relationships | source_entity_id | organizational_entities | entity_id | entity_relationships_source_entity_id_fkey |
| entity_relationships | target_entity_id | organizational_entities | entity_id | entity_relationships_target_entity_id_fkey |
| error_log | resolved_by | profiles | id | error_log_resolved_by_fkey |
| error_log | user_id | profiles | id | error_log_user_id_fkey |
| evaluation_certificates | enterprise_id | organizational_entities | entity_id | evaluation_certificates_enterprise_id_fkey |
| evaluation_certificates | inspection_id | inspections | id | evaluation_certificates_inspection_id_fkey |
| expatriate_licenses | enterprise_id | organizational_entities | entity_id | expatriate_licenses_enterprise_id_fkey |
| expatriate_licenses | link_id | enterprise_occupation_links | id | expatriate_licenses_link_id_fkey |
| expert_opinions | occupation_id | professions | id | expert_opinions_occupation_id_fkey |
| fee_payments | entity_id | organizational_entities | entity_id | fee_payments_entity_id_fkey |
| fee_payments | member_id | members | id | fee_payments_member_id_fkey |
| fee_payments | processed_by | profiles | id | fee_payments_processed_by_fkey |
| fee_payments | service_id | services | id | fee_payments_service_id_fkey |
| hazardous_occupations | occupation_id | professions | id | hazardous_occupations_occupation_id_fkey |
| inspection_checklists | inspection_id | inspections | id | inspection_checklists_inspection_id_fkey |
| inspections | created_by | profiles | id | inspections_created_by_fkey |
| inspections | enterprise_id | organizational_entities | entity_id | inspections_enterprise_id_fkey |
| isic4_classifications | parent_code | isic4_classifications | isic_code | isic4_classifications_parent_code_fkey |
| labor_disputes | enterprise_id | organizational_entities | entity_id | labor_disputes_enterprise_id_fkey |
| labor_disputes | occupation_id | professions | id | labor_disputes_occupation_id_fkey |
| law_articles | legal_reference_id | legal_references | id | law_articles_legal_reference_id_fkey |
| licenses | entity_id | organizational_entities | entity_id | licenses_entity_id_fkey |
| maturity_assessments | assessed_by | profiles | id | maturity_assessments_assessed_by_fkey |
| maturity_assessments | entity_id | organizational_entities | entity_id | maturity_assessments_entity_id_fkey |
| members | created_by | profiles | id | members_created_by_fkey |
| members | entity_id | organizational_entities | entity_id | members_entity_id_fkey |
| members | updated_by | profiles | id | members_updated_by_fkey |
| notifications | entity_id | organizational_entities | entity_id | notifications_entity_id_fkey |
| notifications | recipient_id | profiles | id | notifications_recipient_id_fkey |
| organizational_entities | created_by | profiles | id | organizational_entities_created_by_fkey |
| organizational_entities | deleted_by | profiles | id | organizational_entities_deleted_by_fkey |
| organizational_entities | parent_entity_id | organizational_entities | entity_id | organizational_entities_parent_entity_id_fkey |
| organizational_entities | updated_by | profiles | id | organizational_entities_updated_by_fkey |
| professions | created_by | profiles | id | professions_created_by_fkey |
| professions | updated_by | profiles | id | professions_updated_by_fkey |
| reports | created_by | profiles | id | reports_created_by_fkey |
| risk_assessments | entity_id | organizational_entities | entity_id | risk_assessments_entity_id_fkey |
| salary_ranges | occupation_id | professions | id | salary_ranges_occupation_id_fkey |
| service_requests | created_by | profiles | id | service_requests_created_by_fkey |
| service_requests | entity_id | organizational_entities | entity_id | service_requests_entity_id_fkey |
| service_requests | processed_by | profiles | id | service_requests_processed_by_fkey |
| service_requests | service_id | services | id | service_requests_service_id_fkey |
| smart_suggestions | entity_id | organizational_entities | entity_id | smart_suggestions_entity_id_fkey |
| smart_suggestions | occupation_id | professions | id | smart_suggestions_occupation_id_fkey |
| training_records | enterprise_id | organizational_entities | entity_id | training_records_enterprise_id_fkey |
| training_records | member_id | members | id | training_records_member_id_fkey |
| training_records | occupation_id | professions | id | training_records_occupation_id_fkey |
| violations | created_by | profiles | id | violations_created_by_fkey |
| violations | detected_by | profiles | id | violations_detected_by_fkey |
| violations | entity_id | organizational_entities | entity_id | violations_entity_id_fkey |
| violations | resolved_by | profiles | id | violations_resolved_by_fkey |
| worker_dispatches | approved_by | profiles | id | worker_dispatches_approved_by_fkey |
| worker_dispatches | created_by | profiles | id | worker_dispatches_created_by_fkey |
| worker_dispatches | link_id | enterprise_occupation_links | id | worker_dispatches_link_id_fkey |
| worker_dispatches | occupation_id | professions | id | worker_dispatches_occupation_id_fkey |
| worker_dispatches | receiving_enterprise_id | organizational_entities | entity_id | worker_dispatches_receiving_enterprise_id_fkey |
| worker_dispatches | reviewed_by | profiles | id | worker_dispatches_reviewed_by_fkey |
| worker_dispatches | sending_enterprise_id | organizational_entities | entity_id | worker_dispatches_sending_enterprise_id_fkey |
| worker_dispatches | submitted_by | profiles | id | worker_dispatches_submitted_by_fkey |
| worker_dispatches | worker_member_id | members | id | worker_dispatches_worker_member_id_fkey |
| worker_profiles | current_enterprise_id | organizational_entities | entity_id | worker_profiles_current_enterprise_id_fkey |
| worker_profiles | current_occupation_id | professions | id | worker_profiles_current_occupation_id_fkey |
| worker_profiles | link_id | enterprise_occupation_links | id | worker_profiles_link_id_fkey |
| worker_profiles | member_id | members | id | worker_profiles_member_id_fkey |
| worker_reduction_requests | created_by | profiles | id | worker_reduction_requests_created_by_fkey |
| worker_reduction_requests | dept_reviewer_id | profiles | id | worker_reduction_requests_dept_reviewer_id_fkey |
| worker_reduction_requests | enterprise_id | organizational_entities | entity_id | worker_reduction_requests_enterprise_id_fkey |
| worker_reduction_requests | executed_by | profiles | id | worker_reduction_requests_executed_by_fkey |
| worker_reduction_requests | final_approver_id | profiles | id | worker_reduction_requests_final_approver_id_fkey |
| worker_reduction_requests | legal_reviewer_id | profiles | id | worker_reduction_requests_legal_reviewer_id_fkey |
| worker_reduction_requests | submitted_by | profiles | id | worker_reduction_requests_submitted_by_fkey |


> **Total foreign keys: 104**


## 5. Indexes

| tablename | indexname | indexdef |
| --- | --- | --- |
| activities | activities_pkey | CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id) |
| activities | idx_activities_date | CREATE INDEX idx_activities_date ON public.activities USING btree (start_date) |
| activities | idx_activities_entity | CREATE INDEX idx_activities_entity ON public.activities USING btree (entity_id) |
| activities | idx_activities_status | CREATE INDEX idx_activities_status ON public.activities USING btree (status) |
| activities | idx_activities_type | CREATE INDEX idx_activities_type ON public.activities USING btree (activity_type) |
| audit_log | audit_log_pkey | CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id) |
| audit_log | idx_audit_action | CREATE INDEX idx_audit_action ON public.audit_log USING btree (action) |
| audit_log | idx_audit_actor | CREATE INDEX idx_audit_actor ON public.audit_log USING btree (actor_id) |
| audit_log | idx_audit_created | CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at) |
| audit_log | idx_audit_date | CREATE INDEX idx_audit_date ON public.audit_log USING btree (created_at DESC) |
| audit_log | idx_audit_entity | CREATE INDEX idx_audit_entity ON public.audit_log USING btree (entity_id) |
| audit_log | idx_audit_record | CREATE INDEX idx_audit_record ON public.audit_log USING btree (record_id) |
| audit_log | idx_audit_table | CREATE INDEX idx_audit_table ON public.audit_log USING btree (table_name) |
| backup_log | backup_log_pkey | CREATE UNIQUE INDEX backup_log_pkey ON public.backup_log USING btree (id) |
| board_members | board_members_pkey | CREATE UNIQUE INDEX board_members_pkey ON public.board_members USING btree (id) |
| board_members | idx_bm_entity | CREATE INDEX idx_bm_entity ON public.board_members USING btree (entity_id) |
| board_members | idx_board_entity | CREATE INDEX idx_board_entity ON public.board_members USING btree (entity_id) |
| career_paths | career_paths_pkey | CREATE UNIQUE INDEX career_paths_pkey ON public.career_paths USING btree (id) |
| commercial_branches | commercial_branches_pkey | CREATE UNIQUE INDEX commercial_branches_pkey ON public.commercial_branches USING btree (id) |
| commercial_contracts | commercial_contracts_pkey | CREATE UNIQUE INDEX commercial_contracts_pkey ON public.commercial_contracts USING btree (id) |
| commercial_equipment | commercial_equipment_pkey | CREATE UNIQUE INDEX commercial_equipment_pkey ON public.commercial_equipment USING btree (id) |
| commercial_establishments | commercial_establishments_commercial_register_number_key | CREATE UNIQUE INDEX commercial_establishments_commercial_register_number_key ON public.commercial_establishments USING btree (commercial_register_number) |
| commercial_establishments | commercial_establishments_establishment_id_key | CREATE UNIQUE INDEX commercial_establishments_establishment_id_key ON public.commercial_establishments USING btree (establishment_id) |
| commercial_establishments | commercial_establishments_pkey | CREATE UNIQUE INDEX commercial_establishments_pkey ON public.commercial_establishments USING btree (id) |
| commercial_establishments | commercial_establishments_unified_code_key | CREATE UNIQUE INDEX commercial_establishments_unified_code_key ON public.commercial_establishments USING btree (unified_code) |
| commercial_establishments | idx_commercial_establishments_deleted | CREATE INDEX idx_commercial_establishments_deleted ON public.commercial_establishments USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| commercial_warehouses | commercial_warehouses_pkey | CREATE UNIQUE INDEX commercial_warehouses_pkey ON public.commercial_warehouses USING btree (id) |
| compliance_alerts | compliance_alerts_pkey | CREATE UNIQUE INDEX compliance_alerts_pkey ON public.compliance_alerts USING btree (id) |
| compliance_alerts | idx_ca_due | CREATE INDEX idx_ca_due ON public.compliance_alerts USING btree (due_date) WHERE (due_date IS NOT NULL) |
| compliance_alerts | idx_ca_enterprise | CREATE INDEX idx_ca_enterprise ON public.compliance_alerts USING btree (enterprise_id) |
| compliance_alerts | idx_ca_resolved | CREATE INDEX idx_ca_resolved ON public.compliance_alerts USING btree (is_resolved) WHERE (is_resolved = false) |
| compliance_alerts | idx_ca_severity | CREATE INDEX idx_ca_severity ON public.compliance_alerts USING btree (severity) |
| compliance_alerts | idx_ca_type | CREATE INDEX idx_ca_type ON public.compliance_alerts USING btree (alert_type) |
| compliance_matrices | compliance_matrices_pkey | CREATE UNIQUE INDEX compliance_matrices_pkey ON public.compliance_matrices USING btree (id) |
| compliance_matrices | idx_compliance_matrices_deleted | CREATE INDEX idx_compliance_matrices_deleted ON public.compliance_matrices USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| contract_types | contract_types_pkey | CREATE UNIQUE INDEX contract_types_pkey ON public.contract_types USING btree (id) |
| currencies | currencies_code_key | CREATE UNIQUE INDEX currencies_code_key ON public.currencies USING btree (code) |
| currencies | currencies_pkey | CREATE UNIQUE INDEX currencies_pkey ON public.currencies USING btree (id) |
| data_retention_log | data_retention_log_pkey | CREATE UNIQUE INDEX data_retention_log_pkey ON public.data_retention_log USING btree (id) |
| documents | documents_pkey | CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id) |
| documents | idx_docs_entity | CREATE INDEX idx_docs_entity ON public.documents USING btree (entity_id) |
| documents | idx_docs_expiry | CREATE INDEX idx_docs_expiry ON public.documents USING btree (expiry_date) WHERE (expiry_date IS NOT NULL) |
| documents | idx_docs_status | CREATE INDEX idx_docs_status ON public.documents USING btree (status) |
| documents | idx_docs_type | CREATE INDEX idx_docs_type ON public.documents USING btree (document_type) |
| documents | idx_documents_entity | CREATE INDEX idx_documents_entity ON public.documents USING btree (entity_id) |
| documents | idx_documents_expiry | CREATE INDEX idx_documents_expiry ON public.documents USING btree (expiry_date) |
| documents | idx_documents_status | CREATE INDEX idx_documents_status ON public.documents USING btree (status) |
| documents | idx_documents_type | CREATE INDEX idx_documents_type ON public.documents USING btree (document_type) |
| dynamic_fields | dynamic_fields_entity_id_field_name_key | CREATE UNIQUE INDEX dynamic_fields_entity_id_field_name_key ON public.dynamic_fields USING btree (entity_id, field_name) |
| dynamic_fields | dynamic_fields_pkey | CREATE UNIQUE INDEX dynamic_fields_pkey ON public.dynamic_fields USING btree (id) |
| dynamic_fields | idx_dynamic_fields_entity | CREATE INDEX idx_dynamic_fields_entity ON public.dynamic_fields USING btree (entity_id) |
| election_results | election_results_pkey | CREATE UNIQUE INDEX election_results_pkey ON public.election_results USING btree (id) |
| election_results | idx_election_results_election | CREATE INDEX idx_election_results_election ON public.election_results USING btree (election_id) |
| election_results | idx_er_election | CREATE INDEX idx_er_election ON public.election_results USING btree (election_id) |
| election_results | idx_er_member | CREATE INDEX idx_er_member ON public.election_results USING btree (member_id) |
| elections | elections_pkey | CREATE UNIQUE INDEX elections_pkey ON public.elections USING btree (id) |
| elections | idx_elections_date | CREATE INDEX idx_elections_date ON public.elections USING btree (planned_date) |
| elections | idx_elections_entity | CREATE INDEX idx_elections_entity ON public.elections USING btree (entity_id) |
| elections | idx_elections_status | CREATE INDEX idx_elections_status ON public.elections USING btree (status) |
| enterprise_evaluation_levels | enterprise_evaluation_levels_level_name_key | CREATE UNIQUE INDEX enterprise_evaluation_levels_level_name_key ON public.enterprise_evaluation_levels USING btree (level_name) |
| enterprise_evaluation_levels | enterprise_evaluation_levels_pkey | CREATE UNIQUE INDEX enterprise_evaluation_levels_pkey ON public.enterprise_evaluation_levels USING btree (id) |
| enterprise_isic_links | enterprise_isic_links_enterprise_id_isic_code_key | CREATE UNIQUE INDEX enterprise_isic_links_enterprise_id_isic_code_key ON public.enterprise_isic_links USING btree (enterprise_id, isic_code) |
| enterprise_isic_links | enterprise_isic_links_pkey | CREATE UNIQUE INDEX enterprise_isic_links_pkey ON public.enterprise_isic_links USING btree (id) |
| enterprise_occupation_links | enterprise_occupation_links_enterprise_id_occupation_id_key | CREATE UNIQUE INDEX enterprise_occupation_links_enterprise_id_occupation_id_key ON public.enterprise_occupation_links USING btree (enterprise_id, occupation_id) |
| enterprise_occupation_links | enterprise_occupation_links_pkey | CREATE UNIQUE INDEX enterprise_occupation_links_pkey ON public.enterprise_occupation_links USING btree (id) |
| enterprise_occupation_links | idx_enterprise_occupation_links_deleted | CREATE INDEX idx_enterprise_occupation_links_deleted ON public.enterprise_occupation_links USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| enterprise_slots | enterprise_slots_pkey | CREATE UNIQUE INDEX enterprise_slots_pkey ON public.enterprise_slots USING btree (id) |
| enterprise_slots | enterprise_slots_slot_code_key | CREATE UNIQUE INDEX enterprise_slots_slot_code_key ON public.enterprise_slots USING btree (slot_code) |
| entity_relationships | entity_relationships_pkey | CREATE UNIQUE INDEX entity_relationships_pkey ON public.entity_relationships USING btree (id) |
| entity_relationships | entity_relationships_source_entity_id_target_entity_id_rela_key | CREATE UNIQUE INDEX entity_relationships_source_entity_id_target_entity_id_rela_key ON public.entity_relationships USING btree (source_entity_id, target_entity_id, relationship_type) |
| entity_relationships | idx_entity_relationships_deleted | CREATE INDEX idx_entity_relationships_deleted ON public.entity_relationships USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| entity_relationships | idx_relationships_source | CREATE INDEX idx_relationships_source ON public.entity_relationships USING btree (source_entity_id) |
| entity_relationships | idx_relationships_target | CREATE INDEX idx_relationships_target ON public.entity_relationships USING btree (target_entity_id) |
| error_log | error_log_pkey | CREATE UNIQUE INDEX error_log_pkey ON public.error_log USING btree (id) |
| error_log | idx_err_category | CREATE INDEX idx_err_category ON public.error_log USING btree (category) |
| error_log | idx_err_date | CREATE INDEX idx_err_date ON public.error_log USING btree (created_at DESC) |
| error_log | idx_err_severity | CREATE INDEX idx_err_severity ON public.error_log USING btree (severity) |
| error_log | idx_err_status | CREATE INDEX idx_err_status ON public.error_log USING btree (status) |
| evaluation_certificates | evaluation_certificates_certificate_number_key | CREATE UNIQUE INDEX evaluation_certificates_certificate_number_key ON public.evaluation_certificates USING btree (certificate_number) |
| evaluation_certificates | evaluation_certificates_pkey | CREATE UNIQUE INDEX evaluation_certificates_pkey ON public.evaluation_certificates USING btree (id) |
| evaluation_certificates | idx_evaluation_certificates_deleted | CREATE INDEX idx_evaluation_certificates_deleted ON public.evaluation_certificates USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| expatriate_licenses | expatriate_licenses_license_number_key | CREATE UNIQUE INDEX expatriate_licenses_license_number_key ON public.expatriate_licenses USING btree (license_number) |
| expatriate_licenses | expatriate_licenses_pkey | CREATE UNIQUE INDEX expatriate_licenses_pkey ON public.expatriate_licenses USING btree (id) |
| expatriate_licenses | idx_expatriate_licenses_deleted | CREATE INDEX idx_expatriate_licenses_deleted ON public.expatriate_licenses USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| expert_opinions | expert_opinions_pkey | CREATE UNIQUE INDEX expert_opinions_pkey ON public.expert_opinions USING btree (id) |
| fee_payments | fee_payments_pkey | CREATE UNIQUE INDEX fee_payments_pkey ON public.fee_payments USING btree (id) |
| fee_payments | fee_payments_receipt_number_key | CREATE UNIQUE INDEX fee_payments_receipt_number_key ON public.fee_payments USING btree (receipt_number) |
| fee_payments | idx_fp_date | CREATE INDEX idx_fp_date ON public.fee_payments USING btree (payment_date DESC) |
| fee_payments | idx_fp_entity | CREATE INDEX idx_fp_entity ON public.fee_payments USING btree (entity_id) WHERE (entity_id IS NOT NULL) |
| fee_payments | idx_fp_member | CREATE INDEX idx_fp_member ON public.fee_payments USING btree (member_id) WHERE (member_id IS NOT NULL) |
| fee_payments | idx_fp_status | CREATE INDEX idx_fp_status ON public.fee_payments USING btree (status) |
| governorates | governorates_code_key | CREATE UNIQUE INDEX governorates_code_key ON public.governorates USING btree (code) |
| governorates | governorates_pkey | CREATE UNIQUE INDEX governorates_pkey ON public.governorates USING btree (id) |
| hazardous_occupations | hazardous_occupations_pkey | CREATE UNIQUE INDEX hazardous_occupations_pkey ON public.hazardous_occupations USING btree (id) |
| ilo_conventions | ilo_conventions_convention_number_key | CREATE UNIQUE INDEX ilo_conventions_convention_number_key ON public.ilo_conventions USING btree (convention_number) |
| ilo_conventions | ilo_conventions_pkey | CREATE UNIQUE INDEX ilo_conventions_pkey ON public.ilo_conventions USING btree (id) |
| inspection_checklists | inspection_checklists_pkey | CREATE UNIQUE INDEX inspection_checklists_pkey ON public.inspection_checklists USING btree (id) |
| inspections | inspections_inspection_number_key | CREATE UNIQUE INDEX inspections_inspection_number_key ON public.inspections USING btree (inspection_number) |
| inspections | inspections_pkey | CREATE UNIQUE INDEX inspections_pkey ON public.inspections USING btree (id) |
| institutional_templates | institutional_templates_pkey | CREATE UNIQUE INDEX institutional_templates_pkey ON public.institutional_templates USING btree (id) |
| institutional_templates | institutional_templates_template_code_key | CREATE UNIQUE INDEX institutional_templates_template_code_key ON public.institutional_templates USING btree (template_code) |
| international_standards | international_standards_pkey | CREATE UNIQUE INDEX international_standards_pkey ON public.international_standards USING btree (id) |
| international_standards | international_standards_standard_code_key | CREATE UNIQUE INDEX international_standards_standard_code_key ON public.international_standards USING btree (standard_code) |
| isic4_classifications | idx_isic4_classifications_deleted | CREATE INDEX idx_isic4_classifications_deleted ON public.isic4_classifications USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| isic4_classifications | idx_isic4_level | CREATE INDEX idx_isic4_level ON public.isic4_classifications USING btree (level) |
| isic4_classifications | idx_isic4_parent | CREATE INDEX idx_isic4_parent ON public.isic4_classifications USING btree (parent_code) WHERE (parent_code IS NOT NULL) |
| isic4_classifications | idx_isic4_sector | CREATE INDEX idx_isic4_sector ON public.isic4_classifications USING btree (sector) WHERE (sector IS NOT NULL) |
| isic4_classifications | isic4_classifications_isic_code_key | CREATE UNIQUE INDEX isic4_classifications_isic_code_key ON public.isic4_classifications USING btree (isic_code) |
| isic4_classifications | isic4_classifications_pkey | CREATE UNIQUE INDEX isic4_classifications_pkey ON public.isic4_classifications USING btree (id) |
| labor_disputes | idx_labor_disputes_deleted | CREATE INDEX idx_labor_disputes_deleted ON public.labor_disputes USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| labor_disputes | labor_disputes_pkey | CREATE UNIQUE INDEX labor_disputes_pkey ON public.labor_disputes USING btree (id) |
| law_articles | law_articles_pkey | CREATE UNIQUE INDEX law_articles_pkey ON public.law_articles USING btree (id) |
| legal_references | legal_references_pkey | CREATE UNIQUE INDEX legal_references_pkey ON public.legal_references USING btree (id) |
| licenses | idx_licenses_entity | CREATE INDEX idx_licenses_entity ON public.licenses USING btree (entity_id) |
| licenses | idx_licenses_expiry | CREATE INDEX idx_licenses_expiry ON public.licenses USING btree (expiry_date) |
| licenses | idx_licenses_status | CREATE INDEX idx_licenses_status ON public.licenses USING btree (status) |
| licenses | licenses_license_number_key | CREATE UNIQUE INDEX licenses_license_number_key ON public.licenses USING btree (license_number) |
| licenses | licenses_pkey | CREATE UNIQUE INDEX licenses_pkey ON public.licenses USING btree (id) |
| maturity_assessments | idx_maturity_assessments_deleted | CREATE INDEX idx_maturity_assessments_deleted ON public.maturity_assessments USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| maturity_assessments | maturity_assessments_pkey | CREATE UNIQUE INDEX maturity_assessments_pkey ON public.maturity_assessments USING btree (id) |
| members | idx_members_entity | CREATE INDEX idx_members_entity ON public.members USING btree (entity_id) |
| members | idx_members_governorate | CREATE INDEX idx_members_governorate ON public.members USING btree (governorate) |
| members | idx_members_join_date | CREATE INDEX idx_members_join_date ON public.members USING btree (join_date DESC) |
| members | idx_members_name | CREATE INDEX idx_members_name ON public.members USING gin (to_tsvector('arabic'::regconfig, full_name)) |
| members | idx_members_national_id | CREATE INDEX idx_members_national_id ON public.members USING btree (national_id) |
| members | idx_members_status | CREATE INDEX idx_members_status ON public.members USING btree (status) |
| members | members_entity_id_national_id_key | CREATE UNIQUE INDEX members_entity_id_national_id_key ON public.members USING btree (entity_id, national_id) |
| members | members_pkey | CREATE UNIQUE INDEX members_pkey ON public.members USING btree (id) |
| mv_dashboard_stats | idx_mv_dashboard | CREATE UNIQUE INDEX idx_mv_dashboard ON public.mv_dashboard_stats USING btree (total_professions) |
| mv_enterprise_compliance | idx_mv_ecompliance | CREATE UNIQUE INDEX idx_mv_ecompliance ON public.mv_enterprise_compliance USING btree (entity_id) |
| notifications | idx_notif_date | CREATE INDEX idx_notif_date ON public.notifications USING btree (created_at DESC) |
| notifications | idx_notif_read | CREATE INDEX idx_notif_read ON public.notifications USING btree (is_read) WHERE (is_read = false) |
| notifications | idx_notif_recipient | CREATE INDEX idx_notif_recipient ON public.notifications USING btree (recipient_id) |
| notifications | idx_notifications_read | CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read) WHERE (NOT is_read) |
| notifications | idx_notifications_recipient | CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id) |
| notifications | notifications_pkey | CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id) |
| organizational_entities | idx_entities_compliance | CREATE INDEX idx_entities_compliance ON public.organizational_entities USING btree (compliance_status) |
| organizational_entities | idx_entities_deleted | CREATE INDEX idx_entities_deleted ON public.organizational_entities USING btree (deleted_at) WHERE (deleted_at IS NULL) |
| organizational_entities | idx_entities_governorate | CREATE INDEX idx_entities_governorate ON public.organizational_entities USING btree (governorate) |
| organizational_entities | idx_entities_name_ar | CREATE INDEX idx_entities_name_ar ON public.organizational_entities USING gin (to_tsvector('arabic'::regconfig, name_ar)) |
| organizational_entities | idx_entities_parent | CREATE INDEX idx_entities_parent ON public.organizational_entities USING btree (parent_entity_id) |
| organizational_entities | idx_entities_renewal | CREATE INDEX idx_entities_renewal ON public.organizational_entities USING btree (next_renewal_date) |
| organizational_entities | idx_entities_risk | CREATE INDEX idx_entities_risk ON public.organizational_entities USING btree (risk_level) |
| organizational_entities | idx_entities_status | CREATE INDEX idx_entities_status ON public.organizational_entities USING btree (status) |
| organizational_entities | idx_entities_type | CREATE INDEX idx_entities_type ON public.organizational_entities USING btree (entity_type) |
| organizational_entities | idx_oe_compliance | CREATE INDEX idx_oe_compliance ON public.organizational_entities USING btree (compliance_status) WHERE (deleted_at IS NULL) |
| organizational_entities | idx_oe_created | CREATE INDEX idx_oe_created ON public.organizational_entities USING btree (created_at DESC) |
| organizational_entities | idx_oe_parent | CREATE INDEX idx_oe_parent ON public.organizational_entities USING btree (parent_entity_id) WHERE (parent_entity_id IS NOT NULL) |
| organizational_entities | idx_oe_renewal | CREATE INDEX idx_oe_renewal ON public.organizational_entities USING btree (next_renewal_date) WHERE ((next_renewal_date IS NOT NULL) AND (deleted_at IS NULL)) |
| organizational_entities | organizational_entities_entity_code_key | CREATE UNIQUE INDEX organizational_entities_entity_code_key ON public.organizational_entities USING btree (entity_code) |
| organizational_entities | organizational_entities_pkey | CREATE UNIQUE INDEX organizational_entities_pkey ON public.organizational_entities USING btree (entity_id) |
| organizational_entities | organizational_entities_registration_number_key | CREATE UNIQUE INDEX organizational_entities_registration_number_key ON public.organizational_entities USING btree (registration_number) |
| organizational_entities | organizational_entities_unified_code_key | CREATE UNIQUE INDEX organizational_entities_unified_code_key ON public.organizational_entities USING btree (unified_code) |
| professions | idx_professions_code | CREATE INDEX idx_professions_code ON public.professions USING btree (code) |
| professions | idx_professions_family | CREATE INDEX idx_professions_family ON public.professions USING btree (family) |
| professions | idx_professions_isco | CREATE INDEX idx_professions_isco ON public.professions USING btree (isco_code) |
| professions | idx_professions_level | CREATE INDEX idx_professions_level ON public.professions USING btree (level) |
| professions | idx_professions_sector | CREATE INDEX idx_professions_sector ON public.professions USING btree (sector) |
| professions | idx_professions_status | CREATE INDEX idx_professions_status ON public.professions USING btree (status) |
| professions | professions_code_key | CREATE UNIQUE INDEX professions_code_key ON public.professions USING btree (code) |
| professions | professions_pkey | CREATE UNIQUE INDEX professions_pkey ON public.professions USING btree (id) |
| profiles | profiles_email_key | CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email) |
| profiles | profiles_pkey | CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id) |
| reports | reports_pkey | CREATE UNIQUE INDEX reports_pkey ON public.reports USING btree (id) |
| risk_assessments | idx_ra_entity | CREATE INDEX idx_ra_entity ON public.risk_assessments USING btree (entity_id) |
| risk_assessments | idx_ra_level | CREATE INDEX idx_ra_level ON public.risk_assessments USING btree (risk_level) |
| risk_assessments | idx_risk_assessments_deleted | CREATE INDEX idx_risk_assessments_deleted ON public.risk_assessments USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| risk_assessments | risk_assessments_pkey | CREATE UNIQUE INDEX risk_assessments_pkey ON public.risk_assessments USING btree (id) |
| salary_ranges | salary_ranges_pkey | CREATE UNIQUE INDEX salary_ranges_pkey ON public.salary_ranges USING btree (id) |
| schema_migrations | schema_migrations_pkey | CREATE UNIQUE INDEX schema_migrations_pkey ON public.schema_migrations USING btree (version) |
| sector_users | sector_users_email_key | CREATE UNIQUE INDEX sector_users_email_key ON public.sector_users USING btree (email) |
| sector_users | sector_users_pkey | CREATE UNIQUE INDEX sector_users_pkey ON public.sector_users USING btree (id) |
| service_requests | idx_service_requests_date | CREATE INDEX idx_service_requests_date ON public.service_requests USING btree (submission_date) |
| service_requests | idx_service_requests_entity | CREATE INDEX idx_service_requests_entity ON public.service_requests USING btree (entity_id) |
| service_requests | idx_service_requests_status | CREATE INDEX idx_service_requests_status ON public.service_requests USING btree (status) |
| service_requests | idx_sr_date | CREATE INDEX idx_sr_date ON public.service_requests USING btree (submission_date DESC) |
| service_requests | idx_sr_entity | CREATE INDEX idx_sr_entity ON public.service_requests USING btree (entity_id) |
| service_requests | idx_sr_processed_by | CREATE INDEX idx_sr_processed_by ON public.service_requests USING btree (processed_by) WHERE (processed_by IS NOT NULL) |
| service_requests | idx_sr_service | CREATE INDEX idx_sr_service ON public.service_requests USING btree (service_id) |
| service_requests | idx_sr_status | CREATE INDEX idx_sr_status ON public.service_requests USING btree (status) |
| service_requests | service_requests_pkey | CREATE UNIQUE INDEX service_requests_pkey ON public.service_requests USING btree (id) |
| service_requests | service_requests_request_number_key | CREATE UNIQUE INDEX service_requests_request_number_key ON public.service_requests USING btree (request_number) |
| services | idx_services_deleted | CREATE INDEX idx_services_deleted ON public.services USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| services | services_pkey | CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id) |
| services | services_service_code_key | CREATE UNIQUE INDEX services_service_code_key ON public.services USING btree (service_code) |
| smart_suggestions | smart_suggestions_pkey | CREATE UNIQUE INDEX smart_suggestions_pkey ON public.smart_suggestions USING btree (id) |
| training_records | training_records_pkey | CREATE UNIQUE INDEX training_records_pkey ON public.training_records USING btree (id) |
| violations | idx_viol_detected | CREATE INDEX idx_viol_detected ON public.violations USING btree (detected_date DESC) |
| violations | idx_viol_detected_by | CREATE INDEX idx_viol_detected_by ON public.violations USING btree (detected_by) WHERE (detected_by IS NOT NULL) |
| violations | idx_viol_entity | CREATE INDEX idx_viol_entity ON public.violations USING btree (entity_id) |
| violations | idx_viol_severity | CREATE INDEX idx_viol_severity ON public.violations USING btree (severity) |
| violations | idx_viol_status | CREATE INDEX idx_viol_status ON public.violations USING btree (status) |
| violations | idx_violations_date | CREATE INDEX idx_violations_date ON public.violations USING btree (detected_date) |
| violations | idx_violations_entity | CREATE INDEX idx_violations_entity ON public.violations USING btree (entity_id) |
| violations | idx_violations_severity | CREATE INDEX idx_violations_severity ON public.violations USING btree (severity) |
| violations | idx_violations_status | CREATE INDEX idx_violations_status ON public.violations USING btree (status) |
| violations | violations_pkey | CREATE UNIQUE INDEX violations_pkey ON public.violations USING btree (id) |
| violations | violations_violation_number_key | CREATE UNIQUE INDEX violations_violation_number_key ON public.violations USING btree (violation_number) |
| worker_dispatches | worker_dispatches_dispatch_number_key | CREATE UNIQUE INDEX worker_dispatches_dispatch_number_key ON public.worker_dispatches USING btree (dispatch_number) |
| worker_dispatches | worker_dispatches_pkey | CREATE UNIQUE INDEX worker_dispatches_pkey ON public.worker_dispatches USING btree (id) |
| worker_procedures | worker_procedures_pkey | CREATE UNIQUE INDEX worker_procedures_pkey ON public.worker_procedures USING btree (id) |
| worker_procedures | worker_procedures_procedure_code_key | CREATE UNIQUE INDEX worker_procedures_procedure_code_key ON public.worker_procedures USING btree (procedure_code) |
| worker_profiles | idx_wp_enterprise | CREATE INDEX idx_wp_enterprise ON public.worker_profiles USING btree (current_enterprise_id) WHERE (current_enterprise_id IS NOT NULL) |
| worker_profiles | idx_wp_member | CREATE INDEX idx_wp_member ON public.worker_profiles USING btree (member_id) |
| worker_profiles | idx_wp_status | CREATE INDEX idx_wp_status ON public.worker_profiles USING btree (employment_status) |
| worker_profiles | worker_profiles_member_id_key | CREATE UNIQUE INDEX worker_profiles_member_id_key ON public.worker_profiles USING btree (member_id) |
| worker_profiles | worker_profiles_pkey | CREATE UNIQUE INDEX worker_profiles_pkey ON public.worker_profiles USING btree (id) |
| worker_reduction_requests | idx_worker_reduction_requests_deleted | CREATE INDEX idx_worker_reduction_requests_deleted ON public.worker_reduction_requests USING btree (deleted_at) WHERE (deleted_at IS NOT NULL) |
| worker_reduction_requests | idx_wrr_enterprise | CREATE INDEX idx_wrr_enterprise ON public.worker_reduction_requests USING btree (enterprise_id) |
| worker_reduction_requests | idx_wrr_status | CREATE INDEX idx_wrr_status ON public.worker_reduction_requests USING btree (status) |
| worker_reduction_requests | worker_reduction_requests_pkey | CREATE UNIQUE INDEX worker_reduction_requests_pkey ON public.worker_reduction_requests USING btree (id) |
| worker_reduction_requests | worker_reduction_requests_request_number_key | CREATE UNIQUE INDEX worker_reduction_requests_request_number_key ON public.worker_reduction_requests USING btree (request_number) |


> **Total indexes: 212**


## 6. Enums

| enum_name | enum_value | sort_order |
| --- | --- | --- |
| activity_status | planned | 1 |
| activity_status | ongoing | 2 |
| activity_status | completed | 3 |
| activity_status | cancelled | 4 |
| activity_status | postponed | 5 |
| activity_type | training | 1 |
| activity_type | conference | 2 |
| activity_type | seminar | 3 |
| activity_type | workshop | 4 |
| activity_type | election | 5 |
| activity_type | meeting | 6 |
| activity_type | cultural | 7 |
| activity_type | sports | 8 |
| activity_type | charity | 9 |
| activity_type | awareness | 10 |
| activity_type | other | 11 |
| attachment_type | document | 1 |
| attachment_type | image | 2 |
| attachment_type | pdf | 3 |
| attachment_type | record | 4 |
| audit_action_type | create | 1 |
| audit_action_type | update | 2 |
| audit_action_type | delete | 3 |
| audit_action_type | view | 4 |
| audit_action_type | export | 5 |
| audit_action_type | import | 6 |
| audit_action_type | approve | 7 |
| audit_action_type | reject | 8 |
| audit_action_type | login | 9 |
| audit_action_type | logout | 10 |
| backup_type | full | 1 |
| backup_type | incremental | 2 |
| backup_type | differential | 3 |
| certificate_status | صالحة | 1 |
| certificate_status | شرطية | 2 |
| certificate_status | ملغاة | 3 |
| classification | labor | 1 |
| classification | professional | 2 |
| classification | employers | 3 |
| classification | charity | 4 |
| classification | social | 5 |
| classification | cultural | 6 |
| classification | sports | 7 |
| commercial_entity_type | company | 1 |
| commercial_entity_type | corporation | 2 |
| commercial_entity_type | partnership | 3 |
| commercial_entity_type | llc | 4 |
| commercial_entity_type | cooperative | 5 |
| commercial_entity_type | factory | 6 |
| commercial_entity_type | shop | 7 |
| commercial_entity_type | office | 8 |
| commercial_entity_type | warehouse | 9 |
| commercial_entity_type | restaurant | 10 |
| commercial_entity_type | service | 11 |
| commercial_entity_type | craft | 12 |
| commercial_entity_type | other | 13 |
| competency_category | فنية | 1 |
| competency_category | رقمية | 2 |
| competency_category | سلوكية | 3 |
| competency_level | مبتدئ | 1 |
| competency_level | متوسط | 2 |
| competency_level | متقدم | 3 |
| competency_level | خبير | 4 |
| compliance_status | compliant | 1 |
| compliance_status | non_compliant | 2 |
| compliance_status | under_review | 3 |
| compliance_status | warned | 4 |
| compliance_status | sanctioned | 5 |
| connection_status | online | 1 |
| connection_status | offline | 2 |
| connection_status | connecting | 3 |
| connection_status | syncing | 4 |
| contract_status | active | 1 |
| contract_status | expired | 2 |
| contract_status | terminated | 3 |
| data_sensitivity | عام | 1 |
| data_sensitivity | مقيد | 2 |
| data_sensitivity | سري | 3 |
| data_sensitivity | سري للغاية | 4 |
| decision_making_level | محدود | 1 |
| decision_making_level | متوسط | 2 |
| decision_making_level | واسع | 3 |
| decision_making_level | استراتيجي | 4 |
| dispatch_status | مسودة | 1 |
| dispatch_status | قيد الموافقة | 2 |
| dispatch_status | تمت الموافقة | 3 |
| dispatch_status | جاري التنفيذ | 4 |
| dispatch_status | مكتمل | 5 |
| dispatch_status | ملغي | 6 |
| dispatch_status | معلق | 7 |
| dispute_status | قيد النظر | 1 |
| dispute_status | تم التسوية ودياً | 2 |
| dispute_status | محال للقضاء العمالي | 3 |
| document_status | draft | 1 |
| document_status | submitted | 2 |
| document_status | under_review | 3 |
| document_status | approved | 4 |
| document_status | rejected | 5 |
| document_status | archived | 6 |
| election_status | planned | 1 |
| election_status | ongoing | 2 |
| election_status | completed | 3 |
| election_status | cancelled | 4 |
| election_status | postponed | 5 |
| enterprise_size | small | 1 |
| enterprise_size | medium | 2 |
| enterprise_size | large | 3 |
| enterprise_size | mega | 4 |
| entity_status | active | 1 |
| entity_status | suspended | 2 |
| entity_status | inactive | 3 |
| entity_status | dissolved | 4 |
| entity_status | under_review | 5 |
| entity_type | union | 1 |
| entity_type | organization | 2 |
| entity_type | federation | 3 |
| entity_type | branch | 4 |
| entity_type | committee | 5 |
| entity_type | department | 6 |
| entity_type | unit | 7 |
| entity_type | office | 8 |
| error_category | network | 1 |
| error_category | database | 2 |
| error_category | validation | 3 |
| error_category | auth | 4 |
| error_category | sync | 5 |
| error_category | backup | 6 |
| error_category | ui | 7 |
| error_category | system | 8 |
| error_category | security | 9 |
| error_category | storage | 10 |
| error_category | performance | 11 |
| error_category | external | 12 |
| error_category | business | 13 |
| error_severity | info | 1 |
| error_severity | warning | 2 |
| error_severity | error | 3 |
| error_severity | critical | 4 |
| error_severity | fatal | 5 |
| evaluation_level | basic | 1 |
| evaluation_level | advanced | 2 |
| evaluation_level | expert | 3 |
| evaluation_model | standard | 1 |
| evaluation_model | comprehensive | 2 |
| evaluation_model | enterprise-level | 3 |
| expatriate_status | نشط | 1 |
| expatriate_status | منتهي | 2 |
| expatriate_status | ملغي | 3 |
| gender | male | 1 |
| gender | female | 2 |
| geographic_scope | nationwide | 1 |
| geographic_scope | multi_governorate | 2 |
| geographic_scope | single_governorate | 3 |
| geographic_scope | directorate | 4 |
| geographic_scope | local | 5 |
| governance_level | national | 1 |
| governance_level | regional | 2 |
| governance_level | governorate | 3 |
| governance_level | directorate | 4 |
| governance_level | district | 5 |
| hazard_level_ar | شديدة | 1 |
| hazard_level_ar | متوسطة | 2 |
| hazard_level_ar | منخفضة | 3 |
| hazard_level_ar | عالية | 4 |
| inspection_compliance | متوافق بالكامل | 1 |
| inspection_compliance | متوافق جزئياً | 2 |
| inspection_compliance | غير متوافق | 3 |
| inspection_type | روتينية | 1 |
| inspection_type | طارئة | 2 |
| inspection_type | سنوية | 3 |
| inspection_type | متابعة | 4 |
| institutional_compliance | إلزامي | 1 |
| institutional_compliance | موصى به | 2 |
| institutional_compliance | استرشادي | 3 |
| legal_form | syndicate | 1 |
| legal_form | association | 2 |
| legal_form | federation | 3 |
| legal_form | cooperative | 4 |
| legal_form | foundation | 5 |
| legal_form_entity | syndicate | 1 |
| legal_form_entity | association | 2 |
| legal_form_entity | federation | 3 |
| legal_form_entity | cooperative | 4 |
| legal_form_entity | foundation | 5 |
| legal_form_entity | company | 6 |
| license_status | valid | 1 |
| license_status | expired | 2 |
| license_status | suspended | 3 |
| license_status | revoked | 4 |
| license_status | pending_renewal | 5 |
| lifecycle_state | draft | 1 |
| lifecycle_state | pending | 2 |
| lifecycle_state | submitted | 3 |
| lifecycle_state | under_review | 4 |
| lifecycle_state | returned | 5 |
| lifecycle_state | approved | 6 |
| lifecycle_state | rejected | 7 |
| lifecycle_state | cancelled | 8 |
| lifecycle_state | closed | 9 |
| lifecycle_state | archived | 10 |
| lifecycle_state | deleted | 11 |
| lifecycle_state | expired | 12 |
| lifecycle_state | renewed | 13 |
| lifecycle_state | suspended | 14 |
| lifecycle_state | reopened | 15 |
| maturity_grade | نموذجية | 1 |
| maturity_grade | متقدمة | 2 |
| maturity_grade | متكاملة | 3 |
| maturity_grade | أساسية | 4 |
| maturity_grade | مبدئية | 5 |
| member_status | active | 1 |
| member_status | inactive | 2 |
| member_status | suspended | 3 |
| member_status | withdrawn | 4 |
| member_status | deceased | 5 |
| payment_frequency | شهري | 1 |
| payment_frequency | أسبوعي | 2 |
| payment_frequency | يومي | 3 |
| payment_frequency | بالساعة | 4 |
| penalty_status_db | لا يوجد | 1 |
| penalty_status_db | تنبيه | 2 |
| penalty_status_db | غرامة | 3 |
| penalty_status_db | إغلاق مؤقت | 4 |
| permit_status | active | 1 |
| permit_status | suspended | 2 |
| permit_status | revoked | 3 |
| permit_status | expired | 4 |
| profession_grade | ممتاز | 1 |
| profession_grade | متقدم | 2 |
| profession_grade | متوسط | 3 |
| profession_grade | مبتدئ | 4 |
| profession_status | معتمدة | 1 |
| profession_status | قيد المراجعة | 2 |
| profession_status | مسودة | 3 |
| reduction_request_status | مسودة | 1 |
| reduction_request_status | قيد المراجعة | 2 |
| reduction_request_status | قيد مراجعة القسم | 3 |
| reduction_request_status | قيد المراجعة القانونية | 4 |
| reduction_request_status | تمت الموافقة النهائية | 5 |
| reduction_request_status | مرفوض | 6 |
| reduction_request_status | قيد التنفيذ | 7 |
| reduction_request_status | مكتمل | 8 |
| renewal_status | current | 1 |
| renewal_status | due_soon | 2 |
| renewal_status | overdue | 3 |
| renewal_status | in_process | 4 |
| risk_level | low | 1 |
| risk_level | medium | 2 |
| risk_level | high | 3 |
| risk_level | critical | 4 |
| sector | industry | 1 |
| sector | services | 2 |
| sector | agriculture | 3 |
| sector | construction | 4 |
| sector | healthcare | 5 |
| sector | education | 6 |
| sector | transportation | 7 |
| sector | trade | 8 |
| sector | technology | 9 |
| sector | finance | 10 |
| sector | tourism | 11 |
| sector | other | 12 |
| service_request_status | pending | 1 |
| service_request_status | processing | 2 |
| service_request_status | approved | 3 |
| service_request_status | rejected | 4 |
| service_request_status | completed | 5 |
| suggestion_impact | عالٍ | 1 |
| suggestion_impact | متوسط | 2 |
| suggestion_impact | تحسين | 3 |
| supervision_level | تنفيذي | 1 |
| supervision_level | إشرافي | 2 |
| supervision_level | إداري | 3 |
| supervision_level | قيادي | 4 |
| training_status | قيد التنفيذ | 1 |
| training_status | مكتمل | 2 |
| training_status | معلق | 3 |
| training_status | ملغي | 4 |
| user_role | ministry | 1 |
| user_role | organization | 2 |
| user_role | auditor | 3 |
| user_role | viewer | 4 |
| user_role_key | admin | 1 |
| user_role_key | ministry_officer | 2 |
| user_role_key | occupational_analyst | 3 |
| user_role_key | sector_expert | 4 |
| user_role_key | company_rep | 5 |
| violation_severity | minor | 1 |
| violation_severity | moderate | 2 |
| violation_severity | major | 3 |
| violation_severity | critical | 4 |
| violation_status | open | 1 |
| violation_status | under_review | 2 |
| violation_status | resolved | 3 |
| violation_status | closed | 4 |
| violation_status | appealed | 5 |


> **Total enums: 57, Total values: 296**


## 7. Views & Materialized Views

| view_name | type |
| --- | --- |
| mv_dashboard_stats | materialized |
| mv_enterprise_compliance | materialized |
| enterprise_compliance_summary | view |
| entities_summary | view |
| isic4_hierarchy | view |
| ministry_dashboard_stats | view |
| professions_summary | view |
| reduction_requests_full | view |
| system_statistics | view |
| worker_dispatches_full | view |



## 8. Triggers

| table_name | trigger_name | event | timing |
| --- | --- | --- | --- |
| activities | trg_activities_updated_at | UPDATE | BEFORE |
| commercial_establishments | trg_commercial_updated_at | UPDATE | BEFORE |
| compliance_alerts | trg_compliance_alerts_updated_at | UPDATE | BEFORE |
| documents | trg_documents_updated_at | UPDATE | BEFORE |
| elections | trg_elections_updated_at | UPDATE | BEFORE |
| enterprise_occupation_links | trg_compute_yemenization | UPDATE | BEFORE |
| enterprise_occupation_links | trg_compute_yemenization | INSERT | BEFORE |
| enterprise_occupation_links | trg_eol_updated_at | UPDATE | BEFORE |
| evaluation_certificates | trg_certificates_updated_at | UPDATE | BEFORE |
| evaluation_certificates | trg_compute_certificate_expiry | INSERT | BEFORE |
| evaluation_certificates | trg_compute_certificate_expiry | UPDATE | BEFORE |
| expatriate_licenses | trg_expatriate_updated_at | UPDATE | BEFORE |
| fee_payments | trg_fee_payments_updated_at | UPDATE | BEFORE |
| inspections | trg_inspections_updated_at | UPDATE | BEFORE |
| isic4_classifications | trg_isic4_updated_at | UPDATE | BEFORE |
| labor_disputes | trg_disputes_updated_at | UPDATE | BEFORE |
| members | trg_members_updated_at | UPDATE | BEFORE |
| members | trg_sync_member_count | DELETE | AFTER |
| members | trg_sync_member_count | INSERT | AFTER |
| organizational_entities | trg_audit_entities | UPDATE | AFTER |
| organizational_entities | trg_audit_entities | DELETE | AFTER |
| organizational_entities | trg_audit_entities | INSERT | AFTER |
| organizational_entities | trg_compute_renewal_status | INSERT | BEFORE |
| organizational_entities | trg_compute_renewal_status | UPDATE | BEFORE |
| organizational_entities | trg_entities_updated_at | UPDATE | BEFORE |
| professions | trg_professions_updated_at | UPDATE | BEFORE |
| profiles | trg_profiles_updated_at | UPDATE | BEFORE |
| training_records | trg_training_updated_at | UPDATE | BEFORE |
| violations | trg_violations_updated_at | UPDATE | BEFORE |
| worker_dispatches | trg_dispatches_updated_at | UPDATE | BEFORE |
| worker_profiles | trg_worker_profiles_updated_at | UPDATE | BEFORE |
| worker_reduction_requests | trg_reduction_requests_updated_at | UPDATE | BEFORE |


> **Total triggers: 32**


## 9. Functions & Procedures

| routine_name | routine_type | return_type | external_language |
| --- | --- | --- | --- |
| armor | FUNCTION | text | C |
| armor | FUNCTION | text | C |
| audit_entity_changes | FUNCTION | trigger | PLPGSQL |
| compute_certificate_expiry | FUNCTION | trigger | PLPGSQL |
| compute_renewal_status | FUNCTION | trigger | PLPGSQL |
| compute_yemenization_rate | FUNCTION | trigger | PLPGSQL |
| crypt | FUNCTION | text | C |
| dearmor | FUNCTION | bytea | C |
| decrypt | FUNCTION | bytea | C |
| decrypt_iv | FUNCTION | bytea | C |
| digest | FUNCTION | bytea | C |
| digest | FUNCTION | bytea | C |
| encrypt | FUNCTION | bytea | C |
| encrypt_iv | FUNCTION | bytea | C |
| gen_random_bytes | FUNCTION | bytea | C |
| gen_random_uuid | FUNCTION | uuid | C |
| gen_salt | FUNCTION | text | C |
| gen_salt | FUNCTION | text | C |
| gin_extract_query_trgm | FUNCTION | internal | C |
| gin_extract_value_trgm | FUNCTION | internal | C |
| gin_trgm_consistent | FUNCTION | boolean | C |
| gin_trgm_triconsistent | FUNCTION | "char" | C |
| gtrgm_compress | FUNCTION | internal | C |
| gtrgm_consistent | FUNCTION | boolean | C |
| gtrgm_decompress | FUNCTION | internal | C |
| gtrgm_distance | FUNCTION | double precision | C |
| gtrgm_in | FUNCTION | USER-DEFINED | C |
| gtrgm_options | FUNCTION | void | C |
| gtrgm_out | FUNCTION | cstring | C |
| gtrgm_penalty | FUNCTION | internal | C |
| gtrgm_picksplit | FUNCTION | internal | C |
| gtrgm_same | FUNCTION | internal | C |
| gtrgm_union | FUNCTION | USER-DEFINED | C |
| hmac | FUNCTION | bytea | C |
| hmac | FUNCTION | bytea | C |
| pgp_armor_headers | FUNCTION | record | C |
| pgp_key_id | FUNCTION | text | C |
| pgp_pub_decrypt | FUNCTION | text | C |
| pgp_pub_decrypt | FUNCTION | text | C |
| pgp_pub_decrypt | FUNCTION | text | C |
| pgp_pub_decrypt_bytea | FUNCTION | bytea | C |
| pgp_pub_decrypt_bytea | FUNCTION | bytea | C |
| pgp_pub_decrypt_bytea | FUNCTION | bytea | C |
| pgp_pub_encrypt | FUNCTION | bytea | C |
| pgp_pub_encrypt | FUNCTION | bytea | C |
| pgp_pub_encrypt_bytea | FUNCTION | bytea | C |
| pgp_pub_encrypt_bytea | FUNCTION | bytea | C |
| pgp_sym_decrypt | FUNCTION | text | C |
| pgp_sym_decrypt | FUNCTION | text | C |
| pgp_sym_decrypt_bytea | FUNCTION | bytea | C |
| pgp_sym_decrypt_bytea | FUNCTION | bytea | C |
| pgp_sym_encrypt | FUNCTION | bytea | C |
| pgp_sym_encrypt | FUNCTION | bytea | C |
| pgp_sym_encrypt_bytea | FUNCTION | bytea | C |
| pgp_sym_encrypt_bytea | FUNCTION | bytea | C |
| refresh_all_materialized_views | FUNCTION | void | PLPGSQL |
| resolve_compliance_alert | FUNCTION | boolean | PLPGSQL |
| set_limit | FUNCTION | real | C |
| show_limit | FUNCTION | real | C |
| show_trgm | FUNCTION | ARRAY | C |
| similarity | FUNCTION | real | C |
| similarity_dist | FUNCTION | real | C |
| similarity_op | FUNCTION | boolean | C |
| strict_word_similarity | FUNCTION | real | C |
| strict_word_similarity_commutator_op | FUNCTION | boolean | C |
| strict_word_similarity_dist_commutator_op | FUNCTION | real | C |
| strict_word_similarity_dist_op | FUNCTION | real | C |
| strict_word_similarity_op | FUNCTION | boolean | C |
| sync_member_count | FUNCTION | trigger | PLPGSQL |
| unaccent | FUNCTION | text | C |
| unaccent | FUNCTION | text | C |
| unaccent_init | FUNCTION | internal | C |
| unaccent_lexize | FUNCTION | internal | C |
| update_updated_at | FUNCTION | trigger | PLPGSQL |
| uuid_generate_v1 | FUNCTION | uuid | C |
| uuid_generate_v1mc | FUNCTION | uuid | C |
| uuid_generate_v3 | FUNCTION | uuid | C |
| uuid_generate_v4 | FUNCTION | uuid | C |
| uuid_generate_v5 | FUNCTION | uuid | C |
| uuid_nil | FUNCTION | uuid | C |
| uuid_ns_dns | FUNCTION | uuid | C |
| uuid_ns_oid | FUNCTION | uuid | C |
| uuid_ns_url | FUNCTION | uuid | C |
| uuid_ns_x500 | FUNCTION | uuid | C |
| word_similarity | FUNCTION | real | C |
| word_similarity_commutator_op | FUNCTION | boolean | C |
| word_similarity_dist_commutator_op | FUNCTION | real | C |
| word_similarity_dist_op | FUNCTION | real | C |
| word_similarity_op | FUNCTION | boolean | C |


> **Total functions/procedures: 89**


## 10. Key Table Row Counts

| table_name | count | status |
| --- | --- | --- |
| organizational_entities | 30 | exists |
| members | 45 | exists |
| professions | 3607 | exists |
| enterprises_occupation_links | - | missing |
| violations | 41 | exists |
| inspections | 30 | exists |
| compliance_matrices | 0 | exists |
| risk_assessments | 2 | exists |
| activities | 28 | exists |
| documents | 38 | exists |
| licenses | 20 | exists |
| elections | 1 | exists |
| board_members | 15 | exists |
| worker_profiles | 18 | exists |
| service_requests | 3 | exists |
| fee_payments | 20 | exists |
| worker_dispatches | 12 | exists |
| commercial_establishments | 12 | exists |
| legal_references | 13 | exists |
| law_articles | 8 | exists |
| ilo_conventions | 8 | exists |
| international_standards | 7 | exists |



## 11. Orphan Records

No orphaned foreign key records found across all FK constraints.


## 12. Duplicate Data

### Entities with same name_ar

| name_ar | count |
| --- | --- |
| نقابة عمال البناء | 2 |
| نقابة المهندسين اليمنية | 2 |


> **2 duplicate groups**

### Members with same national_id

No duplicates found.


## 13. Enum Usage

The following custom enum types exist in the database:

- **activity_status**: planned, ongoing, completed, cancelled, postponed
- **activity_type**: training, conference, seminar, workshop, election, meeting, cultural, sports, charity, awareness, other
- **attachment_type**: document, image, pdf, record
- **audit_action_type**: create, update, delete, view, export, import, approve, reject, login, logout
- **backup_type**: full, incremental, differential
- **certificate_status**: صالحة, شرطية, ملغاة
- **classification**: labor, professional, employers, charity, social, cultural, sports
- **commercial_entity_type**: company, corporation, partnership, llc, cooperative, factory, shop, office, warehouse, restaurant, service, craft, other
- **competency_category**: فنية, رقمية, سلوكية
- **competency_level**: مبتدئ, متوسط, متقدم, خبير
- **compliance_status**: compliant, non_compliant, under_review, warned, sanctioned
- **connection_status**: online, offline, connecting, syncing
- **contract_status**: active, expired, terminated
- **data_sensitivity**: عام, مقيد, سري, سري للغاية
- **decision_making_level**: محدود, متوسط, واسع, استراتيجي
- **dispatch_status**: مسودة, قيد الموافقة, تمت الموافقة, جاري التنفيذ, مكتمل, ملغي, معلق
- **dispute_status**: قيد النظر, تم التسوية ودياً, محال للقضاء العمالي
- **document_status**: draft, submitted, under_review, approved, rejected, archived
- **election_status**: planned, ongoing, completed, cancelled, postponed
- **enterprise_size**: small, medium, large, mega
- **entity_status**: active, suspended, inactive, dissolved, under_review
- **entity_type**: union, organization, federation, branch, committee, department, unit, office
- **error_category**: network, database, validation, auth, sync, backup, ui, system, security, storage, performance, external, business
- **error_severity**: info, warning, error, critical, fatal
- **evaluation_level**: basic, advanced, expert
- **evaluation_model**: standard, comprehensive, enterprise-level
- **expatriate_status**: نشط, منتهي, ملغي
- **gender**: male, female
- **geographic_scope**: nationwide, multi_governorate, single_governorate, directorate, local
- **governance_level**: national, regional, governorate, directorate, district
- **hazard_level_ar**: شديدة, متوسطة, منخفضة, عالية
- **inspection_compliance**: متوافق بالكامل, متوافق جزئياً, غير متوافق
- **inspection_type**: روتينية, طارئة, سنوية, متابعة
- **institutional_compliance**: إلزامي, موصى به, استرشادي
- **legal_form**: syndicate, association, federation, cooperative, foundation
- **legal_form_entity**: syndicate, association, federation, cooperative, foundation, company
- **license_status**: valid, expired, suspended, revoked, pending_renewal
- **lifecycle_state**: draft, pending, submitted, under_review, returned, approved, rejected, cancelled, closed, archived, deleted, expired, renewed, suspended, reopened
- **maturity_grade**: نموذجية, متقدمة, متكاملة, أساسية, مبدئية
- **member_status**: active, inactive, suspended, withdrawn, deceased
- **payment_frequency**: شهري, أسبوعي, يومي, بالساعة
- **penalty_status_db**: لا يوجد, تنبيه, غرامة, إغلاق مؤقت
- **permit_status**: active, suspended, revoked, expired
- **profession_grade**: ممتاز, متقدم, متوسط, مبتدئ
- **profession_status**: معتمدة, قيد المراجعة, مسودة
- **reduction_request_status**: مسودة, قيد المراجعة, قيد مراجعة القسم, قيد المراجعة القانونية, تمت الموافقة النهائية, مرفوض, قيد التنفيذ, مكتمل
- **renewal_status**: current, due_soon, overdue, in_process
- **risk_level**: low, medium, high, critical
- **sector**: industry, services, agriculture, construction, healthcare, education, transportation, trade, technology, finance, tourism, other
- **service_request_status**: pending, processing, approved, rejected, completed
- **suggestion_impact**: عالٍ, متوسط, تحسين
- **supervision_level**: تنفيذي, إشرافي, إداري, قيادي
- **training_status**: قيد التنفيذ, مكتمل, معلق, ملغي
- **user_role**: ministry, organization, auditor, viewer
- **user_role_key**: admin, ministry_officer, occupational_analyst, sector_expert, company_rep
- **violation_severity**: minor, moderate, major, critical
- **violation_status**: open, under_review, resolved, closed, appealed


## 14. Data Completeness (Key Fields)

### organizational_entities

| field | total_rows | non_null_count | percentage |
| --- | --- | --- | --- |
| email | 30 | 13 | 43.3% |
| phone | 30 | 13 | 43.3% |
| address | - | - | column may not exist |
| name_ar | 30 | 30 | 100.0% |
| name_en | 30 | 8 | 26.7% |
| commercial_registration_number | - | - | column may not exist |


### members

| field | total_rows | non_null_count | percentage |
| --- | --- | --- | --- |
| email | 45 | 5 | 11.1% |
| phone | 45 | 45 | 100.0% |
| national_id | 45 | 45 | 100.0% |
| first_name | - | - | column may not exist |
| last_name | - | - | column may not exist |


### worker_profiles

| field | total_rows | non_null_count | percentage |
| --- | --- | --- | --- |
| email | - | - | column may not exist |
| phone | - | - | column may not exist |
| national_id | - | - | column may not exist |



## Summary

| Metric | Count |
| --- | --- |
| Total tables | 61 |
| Total columns | 1327 |
| Total constraints | 642 |
| Total foreign keys | 104 |
| Total indexes | 212 |
| Total enums | 57 |
| Total views | 10 |
| Total triggers | 32 |
| Total functions/procedures | 89 |

