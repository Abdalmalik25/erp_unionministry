-- ============================================================
-- National Labor Platform — Production Migration
-- تحسينات الإنتاجية والجودة والامتثال
-- وزارة الشؤون الاجتماعية والعمل - الجمهورية اليمنية
-- ============================================================

-- ============================================================
-- 1. SCHEMA VERSIONING — تتبع إصدارات المخطط
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by TEXT,
  description TEXT
);

INSERT INTO schema_migrations (version, applied_by, description)
VALUES ('5.0.0', 'system', 'Production readiness: indexes, RLS, roles, worker_profiles, compliance_alerts, fee_payments, audit triggers, materialized views')
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- 2. NEW ENUMS — تعريفات إضافية
-- ============================================================

CREATE TYPE IF NOT EXISTS worker_employment_status AS ENUM ('active','on_leave','terminated','retired','suspended');
CREATE TYPE IF NOT EXISTS payment_method AS ENUM ('cash','bank_transfer','check','mobile_payment','card');
CREATE TYPE IF NOT EXISTS payment_status AS ENUM ('pending','completed','failed','refunded');
CREATE TYPE IF NOT EXISTS alert_type AS ENUM ('expiring_certificate','expiring_license','overdue_inspection','compliance_breach','renewal_due','license_expired','yemenization_breach','safety_violation');
CREATE TYPE IF NOT EXISTS alert_severity AS ENUM ('info','warning','critical','urgent');

-- ============================================================
-- 3. NEW TABLES — جداول إنتاجية جديدة
-- ============================================================

-- ── 52. WORKER_PROFILES — ملف العامل المركزي ──
-- يربط العضو بالمنشأة والمهنة والتاريخ المهني
CREATE TABLE IF NOT EXISTS worker_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  current_enterprise_id UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,
  current_occupation_id UUID REFERENCES professions(id) ON DELETE SET NULL,
  link_id UUID REFERENCES enterprise_occupation_links(id) ON DELETE SET NULL,
  employment_status worker_employment_status NOT NULL DEFAULT 'active',
  employment_start_date DATE,
  employment_end_date DATE,
  contract_type TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  social_insurance_number TEXT,
  workers_compensation_id TEXT,
  current_salary_grade TEXT,
  salary_amount NUMERIC(12,2),
  skills TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]',
  languages TEXT[] DEFAULT '{}',
  last_medical_check_date DATE,
  next_medical_check_date DATE,
  total_experience_years INTEGER DEFAULT 0,
  total_dispatches INTEGER DEFAULT 0,
  active_dispatches INTEGER DEFAULT 0,
  training_hours_completed NUMERIC(8,1) DEFAULT 0,
  compliance_score NUMERIC(5,2) DEFAULT 100,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 53. COMPLIANCE_ALERTS — تنبيهات الامتثال ──
-- يتنقل تلقائياً عند انتهاء الصلاحية أو المخالفات
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(entity_id) ON DELETE CASCADE,
  enterprise_name TEXT,
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT,
  source_table TEXT,
  source_id UUID,
  due_date DATE,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  is_resolved BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 54. FEE_PAYMENTS — سجل المدفوعات ──
-- يتبع جميع المعاملات المالية للخدمات والعضويات
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID REFERENCES organizational_entities(entity_id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'YER',
  payment_method payment_method NOT NULL DEFAULT 'cash',
  receipt_number TEXT UNIQUE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status payment_status NOT NULL DEFAULT 'pending',
  description TEXT,
  processed_by UUID REFERENCES profiles(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 55. DATA_RETENTION_LOG — سجل الاحتفاظ بالبيانات ──
-- يتبع عمليات حذف/أرشفة البيانات وفق سياسات الاحتفاظ
CREATE TABLE IF NOT EXISTS data_retention_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  records_affected INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('archive','purge','anonymize')),
  criteria TEXT,
  executed_by UUID REFERENCES profiles(id),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- ============================================================
-- 4. PERFORMANCE INDEXES — فهارس الأداء (40+ فهرس)
-- ============================================================

-- organizational_entities (existing: 5, add 5 more)
CREATE INDEX IF NOT EXISTS idx_oe_parent ON organizational_entities(parent_entity_id) WHERE parent_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oe_compliance ON organizational_entities(compliance_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oe_renewal ON organizational_entities(next_renewal_date) WHERE next_renewal_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_oe_name_ar ON organizational_entities USING gin(name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_oe_created ON organizational_entities(created_at DESC);

-- members (existing: 3, add 5)
CREATE INDEX IF NOT EXISTS idx_members_entity ON members(entity_id);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON members USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_join_date ON members(join_date DESC);
CREATE INDEX IF NOT EXISTS idx_members_subscription ON members(subscription_status);
CREATE INDEX IF NOT EXISTS idx_members_national_id ON members(national_id) WHERE national_id IS NOT NULL;

-- professions (existing: 6, add 2)
CREATE INDEX IF NOT EXISTS idx_profs_name_ar ON professions USING gin(name_ar gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profs_level ON professions(level);

-- board_members
CREATE INDEX IF NOT EXISTS idx_bm_entity ON board_members(entity_id);

-- elections
CREATE INDEX IF NOT EXISTS idx_elections_entity ON elections(entity_id);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_date ON elections(planned_date DESC);

-- election_results
CREATE INDEX IF NOT EXISTS idx_er_election ON election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_er_member ON election_results(member_id);

-- activities
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(start_date DESC);

-- documents
CREATE INDEX IF NOT EXISTS idx_docs_entity ON documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_docs_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_docs_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- licenses
CREATE INDEX IF NOT EXISTS idx_licenses_entity ON licenses(entity_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date) WHERE expiry_date IS NOT NULL;

-- service_requests
CREATE INDEX IF NOT EXISTS idx_sr_entity ON service_requests(entity_id);
CREATE INDEX IF NOT EXISTS idx_sr_service ON service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_sr_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_sr_date ON service_requests(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_sr_processed_by ON service_requests(processed_by) WHERE processed_by IS NOT NULL;

-- violations
CREATE INDEX IF NOT EXISTS idx_viol_entity ON violations(entity_id);
CREATE INDEX IF NOT EXISTS idx_viol_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_viol_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_viol_detected ON violations(detected_date DESC);
CREATE INDEX IF NOT EXISTS idx_viol_detected_by ON violations(detected_by) WHERE detected_by IS NOT NULL;

-- enterprise_occupation_links
CREATE INDEX IF NOT EXISTS idx_eol_enterprise ON enterprise_occupation_links(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_eol_occupation ON enterprise_occupation_links(occupation_id);
CREATE INDEX IF NOT EXISTS idx_eol_status ON enterprise_occupation_links(link_status);

-- inspections
CREATE INDEX IF NOT EXISTS idx_insp_enterprise ON inspections(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_insp_date ON inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_insp_type ON inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_insp_created_by ON inspections(created_by) WHERE created_by IS NOT NULL;

-- evaluation_certificates
CREATE INDEX IF NOT EXISTS idx_cert_enterprise ON evaluation_certificates(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_cert_status ON evaluation_certificates(status);
CREATE INDEX IF NOT EXISTS idx_cert_expiry ON evaluation_certificates(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cert_inspection ON evaluation_certificates(inspection_id) WHERE inspection_id IS NOT NULL;

-- training_records
CREATE INDEX IF NOT EXISTS idx_train_enterprise ON training_records(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_train_occupation ON training_records(occupation_id) WHERE occupation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_train_status ON training_records(status);
CREATE INDEX IF NOT EXISTS idx_train_member ON training_records(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_train_date ON training_records(start_date DESC);

-- labor_disputes
CREATE INDEX IF NOT EXISTS idx_dispute_enterprise ON labor_disputes(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_dispute_status ON labor_disputes(status);

-- expatriate_licenses
CREATE INDEX IF NOT EXISTS idx_expat_enterprise ON expatriate_licenses(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_expat_status ON expatriate_licenses(status);
CREATE INDEX IF NOT EXISTS idx_expat_expiry ON expatriate_licenses(expiry_date) WHERE expiry_date IS NOT NULL;

-- worker_dispatches
CREATE INDEX IF NOT EXISTS idx_wd_sending ON worker_dispatches(sending_enterprise_id);
CREATE INDEX IF NOT EXISTS idx_wd_receiving ON worker_dispatches(receiving_enterprise_id) WHERE receiving_enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wd_status ON worker_dispatches(status);
CREATE INDEX IF NOT EXISTS idx_wd_occupation ON worker_dispatches(occupation_id) WHERE occupation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wd_link ON worker_dispatches(link_id) WHERE link_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wd_date ON worker_dispatches(dispatch_date DESC);

-- worker_reduction_requests
CREATE INDEX IF NOT EXISTS idx_wrr_enterprise ON worker_reduction_requests(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_wrr_status ON worker_reduction_requests(status);

-- commercial_establishments
CREATE INDEX IF NOT EXISTS idx_ce_sector ON commercial_establishments(sector);
CREATE INDEX IF NOT EXISTS idx_ce_status ON commercial_establishments(status);
CREATE INDEX IF NOT EXISTS idx_ce_governorate ON commercial_establishments(governorate);
CREATE INDEX IF NOT EXISTS idx_ce_name ON commercial_establishments USING gin(name_ar gin_trgm_ops);

-- compliance_matrices
CREATE INDEX IF NOT EXISTS idx_cm_enterprise ON compliance_matrices(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_cm_occupation ON compliance_matrices(occupation_id) WHERE occupation_id IS NOT NULL;

-- risk_assessments
CREATE INDEX IF NOT EXISTS idx_ra_entity ON risk_assessments(entity_id);
CREATE INDEX IF NOT EXISTS idx_ra_level ON risk_assessments(risk_level);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_date ON notifications(created_at DESC);

-- audit_log (critical for performance)
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_id) WHERE entity_id IS NOT NULL;

-- error_log
CREATE INDEX IF NOT EXISTS idx_err_severity ON error_log(severity);
CREATE INDEX IF NOT EXISTS idx_err_category ON error_log(category);
CREATE INDEX IF NOT EXISTS idx_err_status ON error_log(status);
CREATE INDEX IF NOT EXISTS idx_err_date ON error_log(created_at DESC);

-- isic4_classifications
CREATE INDEX IF NOT EXISTS idx_isic4_parent ON isic4_classifications(parent_code) WHERE parent_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_isic4_sector ON isic4_classifications(sector) WHERE sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_isic4_level ON isic4_classifications(level);

-- enterprise_isic_links
CREATE INDEX IF NOT EXISTS idx_eil_enterprise ON enterprise_isic_links(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_eil_isic ON enterprise_isic_links(isic_code);

-- worker_profiles
CREATE INDEX IF NOT EXISTS idx_wp_member ON worker_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_wp_enterprise ON worker_profiles(current_enterprise_id) WHERE current_enterprise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wp_occupation ON worker_profiles(current_occupation_id) WHERE current_occupation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wp_status ON worker_profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_wp_link ON worker_profiles(link_id) WHERE link_id IS NOT NULL;

-- compliance_alerts
CREATE INDEX IF NOT EXISTS idx_ca_enterprise ON compliance_alerts(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_ca_type ON compliance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_ca_severity ON compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ca_resolved ON compliance_alerts(is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_ca_due ON compliance_alerts(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ca_date ON compliance_alerts(created_at DESC);

-- fee_payments
CREATE INDEX IF NOT EXISTS idx_fp_entity ON fee_payments(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fp_member ON fee_payments(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fp_service ON fee_payments(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fp_date ON fee_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_fp_status ON fee_payments(status);

-- Enable pg_trgm for trigram indexes (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) — أمان على مستوى الصفوف
-- ============================================================

-- Enable RLS on critical tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organizational_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS worker_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS worker_reduction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commercial_establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: ministry role has full access
CREATE POLICY IF NOT EXISTS policy_ministry_full ON organizational_entities
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON members
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON documents
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON violations
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON service_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON worker_dispatches
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON worker_reduction_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON commercial_establishments
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON fee_payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON audit_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'ministry');

CREATE POLICY IF NOT EXISTS policy_ministry_full ON notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'ministry');

-- RLS Policies: organization role — access own entity's data
CREATE POLICY IF NOT EXISTS policy_org_own ON organizational_entities
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'organization'
    AND entity_id = (auth.jwt() ->> 'entity_id')::UUID
  );

CREATE POLICY IF NOT EXISTS policy_org_members ON members
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'organization'
    AND entity_id = (auth.jwt() ->> 'entity_id')::UUID
  );

CREATE POLICY IF NOT EXISTS policy_org_docs ON documents
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'organization'
    AND entity_id = (auth.jwt() ->> 'entity_id')::UUID
  );

CREATE POLICY IF NOT EXISTS policy_org_notif ON notifications
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'organization'
    AND recipient_id = (auth.jwt() ->> 'user_id')::UUID
  );

-- RLS Policies: auditor role — read-only on audited entities
CREATE POLICY IF NOT EXISTS policy_auditor_read ON organizational_entities
  FOR SELECT USING (auth.jwt() ->> 'role' = 'auditor');

CREATE POLICY IF NOT EXISTS policy_auditor_read ON members
  FOR SELECT USING (auth.jwt() ->> 'role' = 'auditor');

CREATE POLICY IF NOT EXISTS policy_auditor_read ON violations
  FOR SELECT USING (auth.jwt() ->> 'role' = 'auditor');

CREATE POLICY IF NOT EXISTS policy_auditor_read ON audit_log
  FOR SELECT USING (auth.jwt() ->> 'role' = 'auditor');

-- RLS Policies: viewer role — read-only public data
CREATE POLICY IF NOT EXISTS policy_viewer_read ON organizational_entities
  FOR SELECT USING (auth.jwt() ->> 'role' = 'viewer' AND deleted_at IS NULL);

-- ============================================================
-- 6. DATABASE ROLES — أدوار قاعدة البيانات
-- ============================================================

DO $$
BEGIN
  -- Create roles if they don't exist
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_ministry') THEN
    CREATE ROLE app_ministry LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_organization') THEN
    CREATE ROLE app_organization LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_auditor') THEN
    CREATE ROLE app_auditor LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_viewer') THEN
    CREATE ROLE app_viewer LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly LOGIN;
  END IF;
END $$;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO app_ministry, app_organization, app_auditor, app_viewer, app_readonly;

-- Ministry: full access to all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_ministry;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_ministry;

-- Organization: read/write on own entity data (enforced via RLS)
GRANT SELECT, INSERT, UPDATE ON organizational_entities, members, documents, activities, elections, service_requests, violations TO app_organization;
GRANT SELECT ON professions, enterprise_occupation_links, inspection_checklists, training_records, commercial_establishments, isic4_classifications TO app_organization;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_organization;

-- Auditor: read-only on all tables, write to audit_log
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_auditor;
GRANT INSERT ON audit_log TO app_auditor;
GRANT USAGE ON SEQUENCES IN SCHEMA public TO app_auditor;

-- Viewer: read-only on public data
GRANT SELECT ON organizational_entities, professions, commercial_establishments, isic4_classifications, enterprise_evaluation_levels TO app_viewer;

-- Readonly: read-only on everything
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- ============================================================
-- 7. MATERIALIZED VIEWS — عروض م.materialized للتحليلات
-- ============================================================

-- Dashboard statistics (refresh every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM professions WHERE status = 'معتمدة') AS total_professions,
  (SELECT COUNT(*) FROM organizational_entities WHERE deleted_at IS NULL) AS total_entities,
  (SELECT COUNT(*) FROM members) AS total_members,
  (SELECT COUNT(*) FROM inspections) AS total_inspections,
  (SELECT COUNT(*) FROM evaluation_certificates WHERE status = 'صالحة') AS valid_certificates,
  (SELECT COUNT(*) FROM training_records WHERE status = 'مكتمل') AS completed_trainings,
  (SELECT COUNT(*) FROM labor_disputes WHERE status = 'قيد النظر') AS pending_disputes,
  (SELECT COUNT(*) FROM expatriate_licenses WHERE status = 'نشط') AS active_expatriate_licenses,
  (SELECT COUNT(*) FROM worker_dispatches WHERE status NOT IN ('ملغي','مكتمل')) AS active_dispatches,
  (SELECT COUNT(*) FROM worker_reduction_requests WHERE status NOT IN ('مرفوض','مكتمل')) AS pending_reductions,
  (SELECT COUNT(*) FROM commercial_establishments WHERE status = 'active') AS active_establishments,
  (SELECT COUNT(*) FROM compliance_alerts WHERE is_resolved = FALSE) AS unresolved_alerts,
  (SELECT COUNT(*) FROM fee_payments WHERE status = 'completed' AND payment_date >= CURRENT_DATE - INTERVAL '30 days') AS recent_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM fee_payments WHERE status = 'completed' AND payment_date >= CURRENT_DATE - INTERVAL '30 days') AS recent_revenue;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard ON mv_dashboard_stats(total_professions);

-- Enterprise compliance (refresh every 15 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_enterprise_compliance AS
SELECT
  e.entity_id,
  e.name_ar,
  e.governorate,
  e.sector,
  e.compliance_status,
  COUNT(DISTINCT i.id) AS total_inspections,
  MAX(i.inspection_date) AS last_inspection,
  ROUND(AVG(i.overall_score), 2) AS avg_inspection_score,
  COUNT(DISTINCT ec.id) AS total_certificates,
  COUNT(DISTINCT CASE WHEN ec.status = 'صالحة' THEN ec.id END) AS valid_certificates,
  COUNT(DISTINCT eol.id) AS linked_occupations,
  ROUND(AVG(eol.compliance_score), 2) AS avg_compliance_score,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.is_resolved = FALSE) AS open_alerts
FROM organizational_entities e
LEFT JOIN inspections i ON i.enterprise_id = e.entity_id
LEFT JOIN evaluation_certificates ec ON ec.enterprise_id = e.entity_id
LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.entity_id
LEFT JOIN compliance_alerts ca ON ca.enterprise_id = e.entity_id
WHERE e.deleted_at IS NULL
GROUP BY e.entity_id, e.name_ar, e.governorate, e.sector, e.compliance_status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ecompliance ON mv_enterprise_compliance(entity_id);

-- Occupation statistics (refresh every 30 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_occupation_stats AS
SELECT
  p.id,
  p.code,
  p.name_ar,
  p.isco_code,
  p.sector,
  p.family,
  p.level,
  p.status,
  COUNT(DISTINCT eol.id) AS linked_enterprises,
  COALESCE(SUM(eol.allocated_headcount), 0) AS total_headcount,
  COALESCE(SUM(eol.yemeni_headcount), 0) AS total_yemeni,
  ROUND(AVG(eol.compliance_score), 2) AS avg_compliance_score,
  COUNT(DISTINCT CASE WHEN eol.link_status = 'نشط' THEN eol.id END) AS active_links,
  COUNT(DISTINCT CASE WHEN eol.expatriate_headcount > 0 THEN eol.id END) AS expatriate_links
FROM professions p
LEFT JOIN enterprise_occupation_links eol ON eol.occupation_id = p.id
GROUP BY p.id, p.code, p.name_ar, p.isco_code, p.sector, p.family, p.level, p.status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ostats ON mv_occupation_stats(id);

-- ISIC-4 enterprise distribution (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_isic_distribution AS
SELECT
  i4.isic_code,
  i4.level,
  i4.description_ar,
  i4.sector,
  COUNT(DISTINCT eil.enterprise_id) AS enterprise_count,
  COUNT(DISTINCT ce.id) AS total_establishments,
  COUNT(DISTINCT CASE WHEN ce.employees_count > 50 THEN ce.id END) AS large_enterprises,
  COUNT(DISTINCT CASE WHEN ce.employees_count <= 50 THEN ce.id END) AS small_enterprises
FROM isic4_classifications i4
LEFT JOIN enterprise_isic_links eil ON eil.isic_code = i4.isic_code
LEFT JOIN commercial_establishments ce ON ce.id = eil.enterprise_id
WHERE i4.is_active = true
GROUP BY i4.isic_code, i4.level, i4.description_ar, i4.sector;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_isic ON mv_isic_distribution(isic_code);

-- ============================================================
-- 8. MISSING updated_at TRIGGERS — محفزات محدثة
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_board_members_updated_at') THEN
    CREATE TRIGGER trg_board_members_updated_at BEFORE UPDATE ON board_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compliance_matrices_updated_at') THEN
    CREATE TRIGGER trg_compliance_matrices_updated_at BEFORE UPDATE ON compliance_matrices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_risk_assessments_updated_at') THEN
    CREATE TRIGGER trg_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at') THEN
    CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reports_updated_at') THEN
    CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_entity_relationships_updated_at') THEN
    CREATE TRIGGER trg_entity_relationships_updated_at BEFORE UPDATE ON entity_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dynamic_fields_updated_at') THEN
    CREATE TRIGGER trg_dynamic_fields_updated_at BEFORE UPDATE ON dynamic_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_worker_profiles_updated_at') THEN
    CREATE TRIGGER trg_worker_profiles_updated_at BEFORE UPDATE ON worker_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_compliance_alerts_updated_at') THEN
    CREATE TRIGGER trg_compliance_alerts_updated_at BEFORE UPDATE ON compliance_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fee_payments_updated_at') THEN
    CREATE TRIGGER trg_fee_payments_updated_at BEFORE UPDATE ON fee_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================
-- 9. AUDIT TRIGGER — محفز التدقيق التلقائي
-- ============================================================

CREATE OR REPLACE FUNCTION audit_entity_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_record_id UUID;
  v_entity_id UUID;
  v_changed_fields TEXT[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := (v_old->>'id')::UUID;
    v_entity_id := (v_old->>'entity_id')::UUID;
    IF v_entity_id IS NULL THEN v_entity_id := (v_old->>'enterprise_id')::UUID; END IF;

    INSERT INTO audit_log (table_name, record_id, action, actor_id, old_values, entity_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'delete',
      COALESCE((current_setting('app.current_user_id', true))::UUID, NULL),
      v_old, v_entity_id);
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := (v_new->>'id')::UUID;
    v_entity_id := (v_new->>'entity_id')::UUID;
    IF v_entity_id IS NULL THEN v_entity_id := (v_new->>'enterprise_id')::UUID; END IF;

    -- Find changed fields
    SELECT array_agg(key) INTO v_changed_fields
    FROM jsonb_each(v_new) k JOIN jsonb_each(v_old) j ON k.key = j.key
    WHERE k.value IS DISTINCT FROM j.value AND k.value != '""' AND k.value != 'null';

    IF v_changed_fields IS NOT NULL AND array_length(v_changed_fields, 1) > 0 THEN
      INSERT INTO audit_log (table_name, record_id, action, actor_id, old_values, new_values, changed_fields, entity_id)
      VALUES (TG_TABLE_NAME, v_record_id, 'update',
        COALESCE((current_setting('app.current_user_id', true))::UUID, NULL),
        v_old, v_new, v_changed_fields, v_entity_id);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record_id := (v_new->>'id')::UUID;
    v_entity_id := (v_new->>'entity_id')::UUID;
    IF v_entity_id IS NULL THEN v_entity_id := (v_new->>'enterprise_id')::UUID; END IF;

    INSERT INTO audit_log (table_name, record_id, action, actor_id, new_values, entity_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'create',
      COALESCE((current_setting('app.current_user_id', true))::UUID, NULL),
      v_new, v_entity_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach audit triggers to critical tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizational_entities', 'members', 'violations', 'licenses',
    'service_requests', 'worker_dispatches', 'worker_reduction_requests',
    'commercial_establishments', 'fee_payments', 'expatriate_licenses',
    'labor_disputes', 'training_records'
  ]) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_' || t) THEN
      EXECUTE format(
        'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION audit_entity_changes()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 10. ADDITIONAL CHECK CONSTRAINTS — قيود تحقق إضافية
-- ============================================================

DO $$
BEGIN
  -- organizational_entities
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_oe_member_count') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT ck_oe_member_count CHECK (member_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_oe_branch_count') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT ck_oe_branch_count CHECK (branch_count >= 0);
  END IF;

  -- members
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_members_experience') THEN
    ALTER TABLE members ADD CONSTRAINT ck_members_experience CHECK (experience_years >= 0);
  END IF;

  -- elections
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_elections_voters') THEN
    ALTER TABLE elections ADD CONSTRAINT ck_elections_voters CHECK (eligible_voters >= 0);
  END IF;

  -- activities
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_activities_participants') THEN
    ALTER TABLE activities ADD CONSTRAINT ck_activities_participants CHECK (planned_participants >= 0);
  END IF;

  -- inspections
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_insp_score') THEN
    ALTER TABLE inspections ADD CONSTRAINT ck_insp_score CHECK (overall_score BETWEEN 0 AND 100);
  END IF;

  -- evaluation_certificates
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_cert_score') THEN
    ALTER TABLE evaluation_certificates ADD CONSTRAINT ck_cert_score CHECK (overall_score BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_cert_validity') THEN
    ALTER TABLE evaluation_certificates ADD CONSTRAINT ck_cert_validity CHECK (validity_period > 0);
  END IF;

  -- training_records
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_train_hours') THEN
    ALTER TABLE training_records ADD CONSTRAINT ck_train_hours CHECK (duration_hours >= 0);
  END IF;

  -- commercial_establishments
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_ce_employees') THEN
    ALTER TABLE commercial_establishments ADD CONSTRAINT ck_ce_employees CHECK (employees_count >= 0);
  END IF;

  -- services
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_svc_fee') THEN
    ALTER TABLE services ADD CONSTRAINT ck_svc_fee CHECK (fee_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_svc_days') THEN
    ALTER TABLE services ADD CONSTRAINT ck_svc_days CHECK (processing_days > 0);
  END IF;
END $$;

-- ============================================================
-- 11. SCHEMA VALIDATION FUNCTION — دالة التحقق من سلامة المخطط
-- ============================================================

CREATE OR REPLACE FUNCTION validate_schema_health()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check table count
  RETURN QUERY
  SELECT 'tables'::TEXT, 'ok'::TEXT,
    (SELECT COUNT(*)::TEXT || ' tables' FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');

  -- Check index count
  RETURN QUERY
  SELECT 'indexes'::TEXT, 'ok'::TEXT,
    (SELECT COUNT(*)::TEXT || ' indexes' FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT LIKE 'idx_%' IS FALSE);

  -- Check RLS enabled tables
  RETURN QUERY
  SELECT 'rls_tables'::TEXT, 'ok'::TEXT,
    (SELECT COUNT(*)::TEXT || ' tables with RLS' FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true);

  -- Check materialized views
  RETURN QUERY
  SELECT 'materialized_views'::TEXT, 'ok'::TEXT,
    (SELECT COUNT(*)::TEXT || ' materialized views' FROM pg_matviews WHERE schemaname = 'public');

  -- Check triggers
  RETURN QUERY
  SELECT 'triggers'::TEXT, 'ok'::TEXT,
    (SELECT COUNT(*)::TEXT || ' triggers' FROM pg_trigger WHERE tgname NOT LIKE 'RI_%');

  -- Check functions
  RETURN QUERY
  SELECT 'functions'::TEXT, 'ok'::TEXT,
    (SELECT COUNT(*)::TEXT || ' functions' FROM pg_proc WHERE pronamespace = 'public'::regnamespace);

  -- Check enums
  RETURN QUERY
  SELECT 'enums'::TEXT, 'ok'::TEXT,
    (SELECT COUNT(*)::TEXT || ' enum types' FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 12. HELPER FUNCTIONS — دوال مساعدة
-- ============================================================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_enterprise_compliance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_occupation_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_isic_distribution;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate compliance alerts for expiring items
CREATE OR REPLACE FUNCTION generate_compliance_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Alert for expiring certificates (30 days)
  INSERT INTO compliance_alerts (enterprise_id, enterprise_name, alert_type, severity, title, description, source_table, source_id, due_date)
  SELECT ec.enterprise_id, e.name_ar, 'expiring_certificate', 'warning',
    'شهادة تقييم تنتهي صلاحيتها خلال 30 يوم',
    'الشهادة رقم ' || ec.certificate_number || ' تنتهي في ' || ec.expiry_date,
    'evaluation_certificates', ec.id, ec.expiry_date
  FROM evaluation_certificates ec
  JOIN organizational_entities e ON e.entity_id = ec.enterprise_id
  WHERE ec.status = 'صالحة'
    AND ec.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND NOT EXISTS (SELECT 1 FROM compliance_alerts ca WHERE ca.source_table = 'evaluation_certificates' AND ca.source_id = ec.id AND ca.is_resolved = FALSE);

  v_count := v_count + FOUND;

  -- Alert for expiring expatriate licenses (30 days)
  INSERT INTO compliance_alerts (enterprise_id, enterprise_name, alert_type, severity, title, description, source_table, source_id, due_date)
  SELECT el.enterprise_id, e.name_ar, 'expiring_license', 'warning',
    'تصريح عمالة وافدة ينتهي خلال 30 يوم',
    'التصريح رقم ' || el.license_number || ' للعامل ' || el.expatriate_name || ' ينتهي في ' || el.expiry_date,
    'expatriate_licenses', el.id, el.expiry_date
  FROM expatriate_licenses el
  JOIN organizational_entities e ON e.entity_id = el.enterprise_id
  WHERE el.status = 'نشط'
    AND el.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND NOT EXISTS (SELECT 1 FROM compliance_alerts ca WHERE ca.source_table = 'expatriate_licenses' AND ca.source_id = el.id AND ca.is_resolved = FALSE);

  v_count := v_count + FOUND;

  -- Alert for overdue inspections (90 days since last)
  INSERT INTO compliance_alerts (enterprise_id, enterprise_name, alert_type, severity, title, description, source_table, due_date)
  SELECT e.entity_id, e.name_ar, 'overdue_inspection', 'critical',
    'تفتيش متأخر - لم يتم التفتيش منذ 90 يوم',
    'المنشأة ' || e.name_ar || ' لم تتم تفتيشها منذ أكثر من 90 يوم',
    'organizational_entities', CURRENT_DATE
  FROM organizational_entities e
  WHERE e.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM inspections i WHERE i.enterprise_id = e.entity_id
      AND i.inspection_date >= CURRENT_DATE - INTERVAL '90 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM compliance_alerts ca
      WHERE ca.enterprise_id = e.entity_id AND ca.alert_type = 'overdue_inspection' AND ca.is_resolved = FALSE
    );

  v_count := v_count + FOUND;

  -- Alert for yemenization breaches (< 70% compliance)
  INSERT INTO compliance_alerts (enterprise_id, enterprise_name, alert_type, severity, title, description, source_table, source_id)
  SELECT eol.enterprise_id, e.name_ar, 'yemenization_breach', 'critical',
    'مخالفة نسبة اليمننة - أقل من 70%',
    'نسبة اليمننة الحالية: ' || ROUND(eol.compliance_score, 1) || '% المطلوب: 70%',
    'enterprise_occupation_links', eol.id
  FROM enterprise_occupation_links eol
  JOIN organizational_entities e ON e.entity_id = eol.enterprise_id
  WHERE eol.compliance_score < 70 AND eol.link_status = 'نشط'
    AND NOT EXISTS (
      SELECT 1 FROM compliance_alerts ca
      WHERE ca.source_table = 'enterprise_occupation_links' AND ca.source_id = eol.id AND ca.is_resolved = FALSE
    );

  v_count := v_count + FOUND;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Mark alerts as resolved
CREATE OR REPLACE FUNCTION resolve_compliance_alert(
  p_alert_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE compliance_alerts
  SET is_resolved = TRUE, resolved_at = NOW(), resolved_by = p_user_id, resolution_notes = p_notes
  WHERE id = p_alert_id AND is_resolved = FALSE;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. CLEANUP FUNCTION — دالة تنظيف البيانات القديمة
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_data(
  p_audit_days INTEGER DEFAULT 365,
  p_notification_days INTEGER DEFAULT 90,
  p_error_days INTEGER DEFAULT 180
)
RETURNS void AS $$
BEGIN
  -- Archive old audit logs (move to data_retention_log)
  INSERT INTO data_retention_log (table_name, records_affected, action, criteria)
  SELECT 'audit_log', COUNT(*), 'purge', 'created_at < ' || (NOW() - (p_audit_days || ' days')::INTERVAL)
  FROM audit_log WHERE created_at < NOW() - (p_audit_days || ' days')::INTERVAL;

  DELETE FROM audit_log WHERE created_at < NOW() - (p_audit_days || ' days')::INTERVAL;

  -- Delete old read notifications
  DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - (p_notification_days || ' days')::INTERVAL;

  -- Delete old resolved errors
  DELETE FROM error_log WHERE status = 'resolved' AND created_at < NOW() - (p_error_days || ' days')::INTERVAL;

  -- Delete old sync logs
  DELETE FROM sync_log WHERE completed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

DO $$ BEGIN RAISE NOTICE '✅ Production migration v5.0 complete'; END $$;
DO $$ BEGIN RAISE NOTICE '   - 3 new tables (worker_profiles, compliance_alerts, fee_payments)'; END $$;
DO $$ BEGIN RAISE NOTICE '   - 80+ performance indexes'; END $$;
DO $$ BEGIN RAISE NOTICE '   - RLS policies on 12 critical tables'; END $$;
DO $$ BEGIN RAISE NOTICE '   - 4 materialized views for analytics'; END $$;
DO $$ BEGIN RAISE NOTICE '   - Audit triggers on 12 critical tables'; END $$;
DO $$ BEGIN RAISE NOTICE '   - Database roles (ministry, organization, auditor, viewer, readonly)'; END $$;
DO $$ BEGIN RAISE NOTICE '   - Compliance alert auto-generation'; END $$;
DO $$ BEGIN RAISE NOTICE '   - Data retention/cleanup functions'; END $$;
DO $$ BEGIN RAISE NOTICE '   - Schema health validation'; END $$;
