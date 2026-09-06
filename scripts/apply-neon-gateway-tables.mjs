/**
 * apply-neon-gateway-tables.mjs
 * Applies the missing gateway tables to the Neon production DB.
 *
 * Scope:
 *  - cross-portal foundation tables (from 20260829_02 migration, RLS stripped)
 *  - 16 employment-contract / dispute / inspection / registry child tables
 *    derived from how the routers (contracts.js, disputes.js, inspections.js,
 *    crossPortal.js) query them via req.db.
 *
 * Safe to re-run (all CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).
 * Run: node --env-file=.env scripts/apply-neon-gateway-tables.mjs
 */
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  statement_timeout: 20000,
  max: 3,
});

const DDL = `

-- ============================================================
-- 1. CROSS-PORTAL FOUNDATION (ported from 20260829_02, RLS removed)
-- ============================================================
CREATE TABLE IF NOT EXISTS unified_registry_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registry_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    data JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    hash TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified_by UUID,
    sync_metadata JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unified_registry_entity ON unified_registry_entries (entity_type, entity_id)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cross_portal_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    initiated_by UUID,
    initiated_by_portal TEXT,
    context JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cross_portal_workflows_type ON cross_portal_workflows (workflow_type, status);
CREATE INDEX IF NOT EXISTS idx_cross_portal_workflows_status ON cross_portal_workflows (status);

CREATE TABLE IF NOT EXISTS cross_portal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID,
    recipient_role TEXT,
    recipient_type TEXT CHECK (recipient_type IN ('ministry','employer','union','worker')),
    recipient_jurisdiction JSONB,
    source_portal TEXT NOT NULL CHECK (source_portal IN ('ministry','employer','worker','union','inspector','system')),
    source_user_id UUID,
    source_entity_id UUID,
    type TEXT NOT NULL CHECK (type IN ('workflow','approval','violation','renewal','dispute','inspection','contract','system','security')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    title_ar TEXT,
    message_ar TEXT,
    action_url TEXT,
    action_required BOOLEAN DEFAULT FALSE,
    action_completed BOOLEAN DEFAULT FALSE,
    action_completed_at TIMESTAMPTZ,
    action_completed_by UUID,
    metadata JSONB DEFAULT '{}',
    related_entity_type TEXT,
    related_entity_id UUID,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    delivery_channels TEXT[] DEFAULT ARRAY['in_app'],
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMPTZ,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_recipient ON cross_portal_notifications (recipient_user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_unread ON cross_portal_notifications (recipient_user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_cross_portal_notif_type ON cross_portal_notifications (type, created_at DESC);

CREATE TABLE IF NOT EXISTS cross_portal_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT,
    entity_id UUID,
    portal TEXT,
    actor_id UUID,
    action TEXT NOT NULL,
    changes JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cross_portal_audit_entity ON cross_portal_audit_log (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS data_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    portal TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    changes JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_data_lineage_entity ON data_lineage (entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS unified_user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_user_id UUID,
    email TEXT,
    full_name TEXT,
    national_id TEXT,
    user_type TEXT,
    primary_portal TEXT,
    accessible_portals TEXT[] DEFAULT ARRAY[]::TEXT[],
    roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    jurisdiction JSONB DEFAULT '{}',
    linked_entities JSONB DEFAULT '[]',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    consolidated_permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unified_user_identity_global ON unified_user_identities (global_user_id);
CREATE INDEX IF NOT EXISTS idx_unified_user_identity_email ON unified_user_identities (email);

CREATE TABLE IF NOT EXISTS permission_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role TEXT,
    resource TEXT NOT NULL,
    actions TEXT[] DEFAULT ARRAY[]::TEXT[],
    constraints JSONB DEFAULT '{}',
    granted_by UUID,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_permission_grants_user ON permission_grants (user_id, resource);

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT,
    entity_id UUID,
    filename TEXT,
    mime_type TEXT,
    file_size BIGINT,
    file_hash TEXT,
    file_url TEXT,
    uploaded_by UUID,
    deleted_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT,
    entity_id UUID,
    address_type TEXT,
    line1 TEXT,
    line2 TEXT,
    city TEXT,
    governorate TEXT,
    district TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'YE',
    is_primary BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_entity ON addresses (entity_type, entity_id);

-- ============================================================
-- 2. IDENTITY & REGISTRY (derived from router usage)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'active',
    governorate TEXT,
    directorate TEXT,
    user_type TEXT,
    organization_id UUID,
    portal TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users (role, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    national_id TEXT,
    profession_code TEXT,
    governorate TEXT,
    nationality TEXT DEFAULT 'YE',
    entity_id UUID,
    status TEXT NOT NULL DEFAULT 'active',
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workers_profession ON workers (profession_code, governorate) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workers_national_id ON workers (national_id);

CREATE TABLE IF NOT EXISTS unions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    union_number TEXT,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    type TEXT,
    structure TEXT,
    establish_date TEXT,
    province TEXT,
    district TEXT,
    license_number TEXT,
    license_date TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_unions_license ON unions (license_number) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. CONTRACTS (employment-contract router schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    type TEXT,
    employer JSONB,
    worker JSONB,
    worker_id UUID,
    employer_entity_id UUID,
    worker_name TEXT,
    employer_name TEXT,
    profession_id UUID,
    governorate TEXT,
    directorate TEXT,
    start_date TEXT,
    end_date TEXT,
    probation_period INTEGER DEFAULT 3,
    notice_period INTEGER DEFAULT 30,
    occupation TEXT,
    occupation_code TEXT,
    isic_code TEXT,
    work_location TEXT,
    work_schedule TEXT,
    weekly_hours NUMERIC,
    working_hours JSONB,
    wages JSONB,
    benefits JSONB,
    osh_training_required BOOLEAN DEFAULT FALSE,
    medical_examination_required BOOLEAN DEFAULT FALSE,
    hazard_classification TEXT,
    ministry_approval_comments TEXT,
    ministry_approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejection_at TIMESTAMPTZ,
    rejection_by UUID,
    termination JSONB,
    termination_date TIMESTAMPTZ,
    renewal_info JSONB,
    created_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts (status);
CREATE INDEX IF NOT EXISTS idx_contracts_worker_id ON contracts (worker_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employer_entity ON contracts (employer_entity_id);
CREATE INDEX IF NOT EXISTS idx_contracts_governorate ON contracts (governorate);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts (start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts (created_at DESC);

CREATE TABLE IF NOT EXISTS contract_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    amendment_number INTEGER NOT NULL,
    type TEXT NOT NULL,
    effective_date TEXT,
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    proposed_by UUID REFERENCES users(id),
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signed_by_employer UUID REFERENCES users(id),
    signed_by_worker UUID REFERENCES users(id),
    employer_signed_at TIMESTAMPTZ,
    worker_signed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    UNIQUE (contract_id, amendment_number)
);

CREATE TABLE IF NOT EXISTS contract_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    type TEXT,
    filename TEXT,
    file_id TEXT,
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    party TEXT NOT NULL CHECK (party IN ('employer','worker','ministry_approver')),
    signed_by UUID REFERENCES users(id),
    signed_at TIMESTAMPTZ,
    signature_image TEXT,
    ip TEXT,
    UNIQUE (contract_id, party)
);

-- ============================================================
-- 4. DISPUTES (sub-tables of labor_disputes)
-- ============================================================
CREATE TABLE IF NOT EXISTS dispute_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES labor_disputes(id) ON DELETE CASCADE,
    party_type TEXT,
    person_id UUID,
    name TEXT,
    role TEXT,
    contact TEXT,
    entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispute_parties_dispute ON dispute_parties (dispute_id);

CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES labor_disputes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    file_id TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON dispute_evidence (dispute_id);

CREATE TABLE IF NOT EXISTS dispute_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES labor_disputes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('mediation','arbitration','settlement')),
    decision TEXT,
    rationale TEXT,
    compensation JSONB,
    compliance_requirements JSONB,
    implementation_deadline TEXT,
    appeal_deadline TEXT,
    arbitrator_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dispute_id)
);

CREATE TABLE IF NOT EXISTS dispute_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES labor_disputes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('filing','mediation','arbitration','note','decision','appeal','hearing','resolution')),
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outcome TEXT,
    next_action TEXT,
    next_action_date TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispute_timeline_dispute_date ON dispute_timeline (dispute_id, date ASC);

-- ============================================================
-- 5. INSPECTIONS (sub-tables of inspections)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspection_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    violation_type TEXT,
    description TEXT,
    legal_basis TEXT,
    severity TEXT,
    status TEXT NOT NULL DEFAULT 'identified',
    penalty_amount NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspection_violations_inspection ON inspection_violations (inspection_id);

CREATE TABLE IF NOT EXISTS inspection_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    type TEXT,
    filename TEXT,
    file_id TEXT,
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspection_attachments_inspection ON inspection_attachments (inspection_id);

CREATE TABLE IF NOT EXISTS inspection_witnesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    full_name TEXT,
    national_id TEXT,
    phone TEXT,
    occupation TEXT,
    statement TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_inspection_witnesses_inspection ON inspection_witnesses (inspection_id);

CREATE TABLE IF NOT EXISTS inspection_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    summary TEXT,
    findings JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '{}',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id)
);

-- ============================================================
-- 6. COMPLIANCE REVIEWS (cross-portal violation cascade)
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    violation_id UUID NOT NULL REFERENCES inspection_violations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    findings JSONB DEFAULT '{}',
    resolution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compliance_reviews_inspection ON compliance_reviews (inspection_id, status);

-- ============================================================
-- 2. POST-CREATE COLUMN ALTERS (gateway/router workflow columns)
-- ============================================================
ALTER TABLE IF EXISTS cross_portal_workflows ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS cross_portal_workflows ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS cross_portal_workflows ADD COLUMN IF NOT EXISTS current_step INTEGER;
ALTER TABLE IF EXISTS cross_portal_workflows ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE IF EXISTS unified_registry_entries ADD COLUMN IF NOT EXISTS entry_type TEXT;
ALTER TABLE IF EXISTS unified_registry_entries ADD COLUMN IF NOT EXISTS data_snapshot TEXT;
ALTER TABLE IF EXISTS unified_registry_entries ADD COLUMN IF NOT EXISTS synced_across_portals BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS unified_registry_entries ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS unified_registry_entries ADD COLUMN IF NOT EXISTS synced_portals JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS case_number TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS entity_name TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS entity_license TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS governorate TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS directorate TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS schedule JSONB;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS trigger_reason TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS complaint_id UUID;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS dispute_id UUID;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS sla_status TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS inspector UUID;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS inspector_name TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS assigned_inspector UUID;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS area_inspected JSONB;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS previous_inspection_id UUID;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS inspections ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
`;

console.log('Compiling DDL...');
const statements = DDL
  .split('\n')
  .filter((l) => !/^\s*--/.test(l))                 // strip comment lines first
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 8);                     // then split on ';'
console.log(`Loaded ${statements.length} statements.`);

let okCount = 0, skipCount = 0, failCount = 0;
const failures = [];
for (const [i, stmt] of statements.entries()) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
  process.stdout.write(`  [${String(i + 1).padStart(2)}/${statements.length}] ${preview.slice(0, 50)}... `);
  try {
    const res = await pool.query(stmt);
    if (res.command === 'CREATE TABLE') { process.stdout.write('table\n'); okCount++; }
    else if (res.command === 'CREATE INDEX') { process.stdout.write('index\n'); skipCount++; }
    else { process.stdout.write(`${res.command}\n`); okCount++; }
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('already exists')) { process.stdout.write('exists\n'); skipCount++; }
    else { process.stdout.write('FAIL\n'); failCount++; failures.push({ i, stmt: preview, error: msg.slice(0, 120) }); }
  }
}
console.log(`\nDone. Created: ${okCount}  Existing/skipped: ${skipCount}  FAILED: ${failCount}`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  [${f.i}] ${f.stmt}\n      ERROR: ${f.error}`);
}
await pool.end();