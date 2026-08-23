-- Create Materialized View for Dashboard Stats
-- This replaces 11 parallel queries with a single view query

CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM organizational_entities WHERE deleted_at IS NULL) AS total_entities,
  (SELECT COUNT(*) FROM organizational_entities WHERE deleted_at IS NULL AND status = 'active') AS active_entities,
  (SELECT COUNT(*) FROM organizational_entities WHERE deleted_at IS NULL AND compliance_status = 'compliant') AS compliant_entities,
  (SELECT COUNT(*) FROM organizational_entities WHERE deleted_at IS NULL AND risk_level = 'high') AS high_risk_entities,
  (SELECT COALESCE(SUM(member_count), 0) FROM organizational_entities WHERE deleted_at IS NULL) AS total_members,
  (SELECT COUNT(*) FROM activities WHERE deleted_at IS NULL) AS total_activities,
  (SELECT COUNT(*) FROM violations WHERE deleted_at IS NULL AND status = 'open') AS open_violations,
  (SELECT COUNT(*) FROM licenses WHERE deleted_at IS NULL AND status = 'valid') AS valid_licenses,
  (SELECT COUNT(*) FROM compliance_alerts WHERE is_resolved = false) AS unresolved_alerts;