-- ============================================================
-- Phase 6: Cross-Portal Foundation Tables
-- Yemen National Labor Platform
-- Date: 2026-08-29
-- 
-- This migration creates the foundational tables needed for the
-- cross-portal integration layer:
-- - Cross-portal notifications
-- - Cross-portal workflows
-- - Unified identity & permissions
-- - Audit log (already exists; add data lineage)
-- - Attachments registry
-- - Address normalization
-- - Data lineage tracking
-- ============================================================
-- ============================================================
-- 1. CROSS-PORTAL NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS cross_portal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Recipient
    recipient_user_id UUID,
    recipient_role TEXT,
    recipient_type TEXT CHECK (
        recipient_type IN ('ministry', 'employer', 'union', 'worker')
    ),
    recipient_jurisdiction JSONB,
    -- { governorate, directorate }
    -- Source
    source_portal TEXT NOT NULL CHECK (
        source_portal IN (
            'ministry',
            'employer',
            'worker',
            'union',
            'inspector',
            'system'
        )
    ),
    source_user_id UUID,
    source_entity_id UUID,
    -- e.g., disputeId, contractId, inspectionId
    -- Content
    type TEXT NOT NULL CHECK (
        type IN (
            'workflow',
            'approval',
            'violation',
            'renewal',
            'dispute',
            'inspection',
            'contract',
            'system',
            'security'
        )
    ),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    title_ar TEXT,
    message_ar TEXT,
    -- Action
    action_url TEXT,
    action_required BOOLEAN DEFAULT FALSE,
    action_completed BOOLEAN DEFAULT FALSE,
    action_completed_at TIMESTAMPTZ,
    action_completed_by UUID,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    related_entity_type TEXT,
    -- 'dispute', 'contract', 'inspection', 'worker', etc.
    related_entity_id UUID,
    -- State
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    -- Delivery
    delivery_channels TEXT [] DEFAULT ARRAY ['in_app'],
    -- ['in_app', 'email', 'sms', 'push']
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMPTZ,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_recipient ON cross_portal_notifications(recipient_user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_role ON cross_portal_notifications(recipient_role, created_at DESC)
WHERE recipient_user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_unread ON cross_portal_notifications(recipient_user_id, read)
WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_type ON cross_portal_notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_priority ON cross_portal_notifications(priority, created_at DESC)
WHERE priority IN ('urgent', 'high');
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_entity ON cross_portal_notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_expires ON cross_portal_notifications(expires_at)
WHERE expires_at IS NOT NULL;
-- ============================================================
-- 2. CROSS-PORTAL WORKFLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS cross_portal_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type TEXT NOT NULL,
    -- 'dispute_resolution', 'contract_signing', 'inspection_outcome', 'violation_cascade', etc.
    name TEXT NOT NULL,
    description TEXT,
    -- Initiator
    initiated_by UUID NOT NULL,
    initiated_by_portal TEXT NOT NULL CHECK (
        initiated_by_portal IN (
            'ministry',
            'employer',
            'worker',
            'union',
            'inspector',
            'system'
        )
    ),
    -- Context
    context JSONB NOT NULL DEFAULT '{}',
    -- business context data
    related_entity_type TEXT,
    related_entity_id UUID,
    -- Participants
    participants JSONB NOT NULL DEFAULT '[]',
    -- array of { portal, userId, role }
    -- Steps
    steps JSONB NOT NULL DEFAULT '[]',
    -- array of { id, order, name, assignedTo, status, ... }
    -- State
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
        status IN (
            'in_progress',
            'completed',
            'failed',
            'paused',
            'cancelled'
        )
    ),
    current_step INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    -- Lifecycle
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    pause_reason TEXT,
    -- SLA
    expected_completion_at TIMESTAMPTZ,
    actual_completion_at TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT FALSE,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT [],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cross_portal_wf_type ON cross_portal_workflows(workflow_type, status);
CREATE INDEX IF NOT EXISTS idx_cross_portal_wf_initiator ON cross_portal_workflows(initiated_by, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_portal_wf_status ON cross_portal_workflows(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_portal_wf_entity ON cross_portal_workflows(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_cross_portal_wf_sla ON cross_portal_workflows(expected_completion_at)
WHERE status = 'in_progress';
-- ============================================================
-- 3. UNIFIED IDENTITY & PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS unified_user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Cross-portal user reference
    global_user_id UUID NOT NULL UNIQUE,
    -- unified across all portals
    -- Identity
    email TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    phone TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    full_name TEXT NOT NULL,
    national_id TEXT,
    -- Yemen national ID
    national_id_verified BOOLEAN DEFAULT FALSE,
    -- Multi-portal access
    user_type TEXT NOT NULL CHECK (
        user_type IN ('ministry', 'employer', 'union', 'worker')
    ),
    primary_portal TEXT NOT NULL,
    accessible_portals TEXT [] NOT NULL DEFAULT '{}',
    -- Roles (multiple roles possible)
    roles TEXT [] NOT NULL DEFAULT '{}',
    -- Permissions (consolidated)
    consolidated_permissions TEXT [] NOT NULL DEFAULT '{}',
    -- Jurisdiction
    jurisdiction JSONB DEFAULT '{}',
    -- { governorate, directorate }
    -- MFA
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method TEXT,
    -- 'totp', 'sms', 'email'
    mfa_secret_encrypted TEXT,
    -- encrypted
    -- Biometric (optional)
    biometric_verified BOOLEAN DEFAULT FALSE,
    biometric_type TEXT,
    biometric_data_encrypted TEXT,
    -- Linked entities (worker/employer/union/etc.)
    linked_entities JSONB DEFAULT '[]',
    -- [{ type, id, name, role }]
    -- Account state
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMPTZ,
    lock_reason TEXT,
    failed_login_count INTEGER DEFAULT 0,
    -- Activity
    last_login_at TIMESTAMPTZ,
    last_login_ip TEXT,
    last_login_portal TEXT,
    last_active_at TIMESTAMPTZ,
    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    password_changed_at TIMESTAMPTZ,
    -- Data integrity
    hash TEXT,
    -- integrity hash of consolidated record
    version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_unified_user_global ON unified_user_identities(global_user_id);
CREATE INDEX IF NOT EXISTS idx_unified_user_email ON unified_user_identities(email)
WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_user_phone ON unified_user_identities(phone)
WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_user_national_id ON unified_user_identities(national_id)
WHERE national_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_user_active ON unified_user_identities(is_active, user_type);
CREATE INDEX IF NOT EXISTS idx_unified_user_portals ON unified_user_identities USING GIN(accessible_portals);
-- ============================================================
-- 4. UNIFIED REGISTRY ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS unified_registry_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type TEXT NOT NULL CHECK (
        entry_type IN (
            'commercial_establishment',
            'union',
            'profession',
            'worker',
            'employer',
            'license',
            'training_center',
            'agency'
        )
    ),
    entity_id UUID NOT NULL,
    -- the actual entity this registry entry refers to
    -- Data snapshot
    data_snapshot JSONB NOT NULL,
    -- current state of the entity
    -- Cross-portal sync
    synced_across_portals BOOLEAN DEFAULT TRUE,
    synced_portals TEXT [] NOT NULL DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    sync_failures JSONB DEFAULT '[]',
    -- [{ portal, error, timestamp }]
    -- Master data governance
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'suspended',
            'cancelled',
            'pending',
            'under_review'
        )
    ),
    is_master_record BOOLEAN DEFAULT FALSE,
    -- single source of truth
    superseded_by UUID REFERENCES unified_registry_entries(id),
    -- Integrity
    version INTEGER DEFAULT 1,
    data_hash TEXT,
    -- SHA-256 of canonicalized data
    last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_modified_by UUID,
    last_modified_portal TEXT,
    -- Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_portal TEXT,
    UNIQUE (entry_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_registry_type_entity ON unified_registry_entries(entry_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_registry_status ON unified_registry_entries(status);
CREATE INDEX IF NOT EXISTS idx_registry_synced ON unified_registry_entries(synced_across_portals);
CREATE INDEX IF NOT EXISTS idx_registry_modified ON unified_registry_entries(last_modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_registry_data ON unified_registry_entries USING GIN(data_snapshot);
-- ============================================================
-- 5. ATTACHMENTS REGISTRY (unified across portals)
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- File metadata
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash TEXT NOT NULL,
    -- SHA-256 of content
    -- Storage
    storage_provider TEXT NOT NULL DEFAULT 'local',
    -- 'local', 's3', 'supabase_storage'
    storage_path TEXT NOT NULL,
    storage_bucket TEXT,
    storage_url TEXT,
    -- public/signed URL
    -- Encryption
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_algorithm TEXT,
    encryption_key_id TEXT,
    -- Context
    entity_type TEXT NOT NULL,
    -- 'dispute', 'contract', 'inspection', 'worker', etc.
    entity_id UUID NOT NULL,
    -- Classification
    category TEXT,
    -- 'evidence', 'identification', 'certificate', 'report', 'photo', etc.
    tags TEXT [],
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    required_permissions TEXT [],
    restricted_to_roles TEXT [],
    -- Virus scan
    scan_status TEXT DEFAULT 'pending' CHECK (
        scan_status IN ('pending', 'clean', 'infected', 'skipped')
    ),
    scanned_at TIMESTAMPTZ,
    scan_result TEXT,
    -- Lifecycle
    uploaded_by UUID NOT NULL,
    uploaded_by_portal TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Retention
    retention_period_days INTEGER,
    expires_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    deletion_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON attachments(uploaded_by, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_category ON attachments(category);
CREATE INDEX IF NOT EXISTS idx_attachments_hash ON attachments(file_hash);
-- dedup
CREATE INDEX IF NOT EXISTS idx_attachments_expires ON attachments(expires_at)
WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_scan ON attachments(scan_status)
WHERE scan_status = 'pending';
-- ============================================================
-- 6. ADDRESS NORMALIZATION
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Hierarchical location
    governorate_code TEXT NOT NULL,
    governorate_name TEXT NOT NULL,
    governorate_name_ar TEXT NOT NULL,
    directorate_code TEXT NOT NULL,
    directorate_name TEXT NOT NULL,
    directorate_name_ar TEXT NOT NULL,
    village_or_area TEXT,
    village_or_area_ar TEXT,
    -- Street address
    street_name TEXT,
    building_number TEXT,
    floor TEXT,
    apartment TEXT,
    -- Coordinates
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    elevation NUMERIC(8, 2),
    coordinate_accuracy TEXT,
    -- 'rooftop', 'street', 'city', etc.
    -- Postal
    postal_code TEXT,
    -- Geocoding
    geocoded BOOLEAN DEFAULT FALSE,
    geocoding_provider TEXT,
    geocoded_at TIMESTAMPTZ,
    geocoding_confidence NUMERIC(3, 2),
    -- Validation
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    verification_method TEXT,
    -- 'field_visit', 'document', 'gps'
    -- Context
    entity_type TEXT,
    -- 'employer', 'worker', 'union', 'inspection_location', etc.
    entity_id UUID,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    UNIQUE (entity_type, entity_id) -- one primary address per entity
);
CREATE INDEX IF NOT EXISTS idx_addresses_governorate ON addresses(governorate_code, directorate_code);
CREATE INDEX IF NOT EXISTS idx_addresses_coords ON addresses(latitude, longitude)
WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_addresses_entity ON addresses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_addresses_verified ON addresses(is_verified);
-- ============================================================
-- 7. DATA LINEAGE (track cross-portal modifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS data_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Subject
    entity_type TEXT NOT NULL,
    -- 'dispute', 'contract', 'inspection', 'worker', etc.
    entity_id UUID NOT NULL,
    -- Action
    action TEXT NOT NULL CHECK (
        action IN (
            'create',
            'update',
            'delete',
            'restore',
            'sync',
            'approve',
            'reject',
            'assign',
            'transition'
        )
    ),
    -- Actor
    actor_user_id UUID,
    actor_role TEXT,
    actor_portal TEXT NOT NULL,
    actor_ip TEXT,
    actor_user_agent TEXT,
    -- Changes
    changes JSONB NOT NULL DEFAULT '{}',
    -- { field: { from, to } }
    -- Context
    workflow_id UUID,
    -- link to cross_portal_workflows
    workflow_step_id TEXT,
    correlation_id TEXT,
    -- trace ID across operations
    -- Timestamp
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lineage_entity ON data_lineage(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lineage_actor ON data_lineage(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lineage_portal ON data_lineage(actor_portal, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lineage_workflow ON data_lineage(workflow_id)
WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lineage_correlation ON data_lineage(correlation_id)
WHERE correlation_id IS NOT NULL;
-- ============================================================
-- 8. AUDIT LOG (enhanced - already exists, add cross-portal)
-- ============================================================
CREATE TABLE IF NOT EXISTS cross_portal_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Action
    action_type TEXT NOT NULL,
    action_category TEXT NOT NULL,
    -- 'auth', 'data_modify', 'permission', 'workflow', 'security', 'admin'
    -- Subject
    entity_type TEXT,
    entity_id UUID,
    entity_before JSONB,
    entity_after JSONB,
    -- Actor
    actor_user_id UUID,
    actor_role TEXT,
    actor_portal TEXT,
    actor_ip TEXT,
    actor_user_agent TEXT,
    -- Context
    correlation_id TEXT,
    workflow_id UUID,
    request_id TEXT,
    -- Severity
    severity TEXT DEFAULT 'info' CHECK (
        severity IN ('debug', 'info', 'warning', 'error', 'critical')
    ),
    -- Result
    result TEXT DEFAULT 'success' CHECK (result IN ('success', 'failure', 'partial')),
    error_message TEXT,
    -- Timestamp
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Integrity (hash chain)
    previous_hash TEXT,
    current_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cross_audit_entity ON cross_portal_audit_log(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_audit_actor ON cross_portal_audit_log(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_audit_category ON cross_portal_audit_log(action_category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_audit_severity ON cross_portal_audit_log(severity, occurred_at DESC)
WHERE severity IN ('error', 'critical');
CREATE INDEX IF NOT EXISTS idx_cross_audit_correlation ON cross_portal_audit_log(correlation_id)
WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cross_audit_workflow ON cross_portal_audit_log(workflow_id)
WHERE workflow_id IS NOT NULL;
-- ============================================================
-- 9. PERMISSION GRANTS (fine-grained)
-- ============================================================
CREATE TABLE IF NOT EXISTS permission_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Subject (who)
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL CHECK (
        user_type IN ('ministry', 'employer', 'union', 'worker')
    ),
    -- Permission (what)
    permission TEXT NOT NULL,
    -- e.g., 'disputes:resolve', 'inspections:schedule'
    resource_type TEXT,
    -- e.g., 'dispute', 'inspection'
    -- Scope (where)
    scope_type TEXT NOT NULL CHECK (
        scope_type IN (
            'global',
            'governorate',
            'directorate',
            'entity',
            'self'
        )
    ),
    scope_value TEXT,
    -- governorate code, directorate code, entity ID, etc.
    -- Constraints
    constraints JSONB DEFAULT '{}',
    -- { field, operator, value } e.g., { status: 'pending' }
    -- Validity
    granted_by UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    -- Revocation
    revoked_by UUID,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    -- Audit
    legal_basis TEXT,
    -- legal reference supporting this grant
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_perm_grants_user ON permission_grants(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_perm_grants_scope ON permission_grants(scope_type, scope_value);
CREATE INDEX IF NOT EXISTS idx_perm_grants_perm ON permission_grants(permission, is_active);
CREATE INDEX IF NOT EXISTS idx_perm_grants_validity ON permission_grants(valid_from, valid_until)
WHERE is_active = TRUE;
-- ============================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DO $$
DECLARE t TEXT;
BEGIN FOR t IN
SELECT unnest(
        ARRAY [
            'cross_portal_notifications',
            'cross_portal_workflows',
            'unified_user_identities',
            'unified_registry_entries',
            'addresses'
        ]
    ) LOOP EXECUTE format(
        '
            CREATE TRIGGER trigger_update_%I
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ',
        t,
        t
    );
END LOOP;
END $$;
-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all new tables
ALTER TABLE cross_portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_portal_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_registry_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_portal_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_grants ENABLE ROW LEVEL SECURITY;
-- Policies for cross_portal_notifications: users see their own
CREATE POLICY "Users can view own notifications" ON cross_portal_notifications FOR
SELECT USING (
        recipient_user_id = current_setting('app.current_user_id', true)::UUID
        OR current_setting('app.user_role', true) IN (
            'super_admin',
            'ministry_admin',
            'deputy_minister'
        )
    );
-- Policies for cross_portal_workflows: participants + ministry can see
CREATE POLICY "Workflow participants can view" ON cross_portal_workflows FOR
SELECT USING (
        initiated_by = current_setting('app.current_user_id', true)::UUID
        OR current_setting('app.user_role', true) IN (
            'super_admin',
            'ministry_admin',
            'deputy_minister'
        )
        OR participants @> to_jsonb(
            json_build_object(
                'userId',
                current_setting('app.current_user_id', true)
            )::jsonb
        )
    );
-- Policies for unified_registry_entries: all authenticated can read
CREATE POLICY "Authenticated users can view registry" ON unified_registry_entries FOR
SELECT USING (
        current_setting('app.current_user_id', true) IS NOT NULL
    );
-- Policies for attachments: role-based + owner
CREATE POLICY "Users can view permitted attachments" ON attachments FOR
SELECT USING (
        uploaded_by = current_setting('app.current_user_id', true)::UUID
        OR is_public = TRUE
        OR current_setting('app.user_role', true) IN (
            'super_admin',
            'ministry_admin',
            'deputy_minister',
            'supervisory_director',
            'legal_counsel',
            'labor_inspector',
            'compliance_officer'
        )
    );
-- Policies for addresses: users see addresses they manage
CREATE POLICY "Users can view own addresses" ON addresses FOR
SELECT USING (
        created_by = current_setting('app.current_user_id', true)::UUID
        OR is_verified = TRUE
        OR current_setting('app.user_role', true) IN (
            'super_admin',
            'ministry_admin',
            'deputy_minister',
            'labor_inspector'
        )
    );
-- Policies for data_lineage: audit/compliance roles
CREATE POLICY "Compliance roles can view lineage" ON data_lineage FOR
SELECT USING (
        actor_user_id = current_setting('app.current_user_id', true)::UUID
        OR current_setting('app.user_role', true) IN (
            'super_admin',
            'ministry_admin',
            'deputy_minister',
            'supervisory_director',
            'compliance_officer'
        )
    );
-- Policies for cross_portal_audit_log: compliance roles only
CREATE POLICY "Compliance roles can view audit log" ON cross_portal_audit_log FOR
SELECT USING (
        current_setting('app.user_role', true) IN (
            'super_admin',
            'ministry_admin',
            'deputy_minister',
            'supervisory_director',
            'compliance_officer',
            'legal_counsel'
        )
    );
-- Policies for permission_grants: users see their own + admins see all
CREATE POLICY "Users can view own grants" ON permission_grants FOR
SELECT USING (
        user_id = current_setting('app.current_user_id', true)::UUID
        OR current_setting('app.user_role', true) IN ('super_admin', 'ministry_admin')
    );
-- ============================================================
-- 12. COMMENTS
-- ============================================================
COMMENT ON TABLE cross_portal_notifications IS 'Unified cross-portal notification hub — Ministry, Employer, Worker, Union, Inspector';
COMMENT ON TABLE cross_portal_workflows IS 'Multi-step workflows that span across portals — orchestration engine';
COMMENT ON TABLE unified_user_identities IS 'Single source of truth for user identity across all portals';
COMMENT ON TABLE unified_registry_entries IS 'Master data governance for national registries — synced across portals';
COMMENT ON TABLE attachments IS 'Unified file/attachment registry — encrypted, virus-scanned, with retention';
COMMENT ON TABLE addresses IS 'Normalized address registry with geocoding and verification';
COMMENT ON TABLE data_lineage IS 'Track every modification — which portal/user changed what and when';
COMMENT ON TABLE cross_portal_audit_log IS 'Hash-chained audit log — immutable, for compliance';
COMMENT ON TABLE permission_grants IS 'Fine-grained permission grants with jurisdiction, scope, and time-bounded validity';
-- ============================================================
-- END OF MIGRATION
-- ============================================================