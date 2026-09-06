-- Migration 20260907_01_security_enhancements.sql — Enhanced Security Based on Audit Findings
-- Implements: security_events table, geo-blocking support, account lockout tracking, IP management

-- 1. Create security_events table for dedicated security event logging
CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical', 'emergency'
    source_ip INET,
    user_id UUID REFERENCES sector_users(id),
    email_attempted TEXT,
    details JSONB NOT NULL DEFAULT '{}',
    country_code CHAR(2),
    device_fingerprint TEXT,
    risk_score INTEGER DEFAULT 0,
    flags TEXT[],
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES sector_users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(source_ip);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved) WHERE resolved = FALSE;

-- 2. Create ip_management table for persistent IP allowlist/blocklist
CREATE TABLE IF NOT EXISTS ip_management (
    id BIGSERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    action TEXT NOT NULL CHECK (action IN ('allow', 'block')),
    reason TEXT,
    country_code CHAR(2),
    asn TEXT,
    added_by UUID REFERENCES sector_users(id),
    expires_at TIMESTAMPTZ, -- NULL = permanent
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_management_ip ON ip_management(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_management_active ON ip_management(is_active) WHERE is_active = TRUE;

-- 3. Create country_blocking table for geo-blocking management
CREATE TABLE IF NOT EXISTS country_blocking (
    id BIGSERIAL PRIMARY KEY,
    country_code CHAR(2) NOT NULL UNIQUE,
    country_name TEXT,
    action TEXT NOT NULL DEFAULT 'block' CHECK (action IN ('block', 'monitor', 'allow')),
    reason TEXT,
    added_by UUID REFERENCES sector_users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-populate with countries identified in audit
INSERT INTO country_blocking (country_code, country_name, action, reason, is_active) VALUES
    ('KR', 'South Korea', 'block', 'Suspicious activity detected in audit: 12 operations from 175.110.x.x', TRUE),
    ('CN', 'China', 'block', 'Suspicious activity detected in audit: 2 operations from 110.238.x.x', TRUE),
    ('NL', 'Netherlands', 'block', 'Cloud/VPN activity detected: 2 operations from 82.114.x.x (DigitalOcean)', TRUE)
ON CONFLICT (country_code) DO NOTHING;

-- 4. Create account_lockout table for persistent lockout tracking
CREATE TABLE IF NOT EXISTS account_lockout (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    user_id UUID REFERENCES sector_users(id),
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_failed_attempt TIMESTAMPTZ,
    last_failed_ip INET,
    unlock_by UUID REFERENCES sector_users(id),
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_lockout_email ON account_lockout(email);
CREATE INDEX IF NOT EXISTS idx_account_lockout_locked ON account_lockout(locked_until);

-- 5. Add columns to login_attempts if not exist (for enhanced tracking)
DO $$
BEGIN
    -- Add device_fingerprint if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_attempts' AND column_name='device_fingerprint') THEN
        ALTER TABLE login_attempts ADD COLUMN device_fingerprint TEXT;
    END IF;
    
    -- Add country if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_attempts' AND column_name='country') THEN
        ALTER TABLE login_attempts ADD COLUMN country CHAR(2);
    END IF;
    
    -- Add risk_score if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_attempts' AND column_name='risk_score') THEN
        ALTER TABLE login_attempts ADD COLUMN risk_score INTEGER DEFAULT 0;
    END IF;
    
    -- Add flags if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_attempts' AND column_name='flags') THEN
        ALTER TABLE login_attempts ADD COLUMN flags TEXT[];
    END IF;
END $$;

-- 6. Add updated_at trigger for security tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS update_ip_management_updated_at ON ip_management;
CREATE TRIGGER update_ip_management_updated_at
    BEFORE UPDATE ON ip_management
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_country_blocking_updated_at ON country_blocking;
CREATE TRIGGER update_country_blocking_updated_at
    BEFORE UPDATE ON country_blocking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_lockout_updated_at ON account_lockout;
CREATE TRIGGER update_account_lockout_updated_at
    BEFORE UPDATE ON account_lockout
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Create function to sync in-memory IP lists with database
CREATE OR REPLACE FUNCTION sync_ip_management()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    r RECORD;
BEGIN
    -- This function can be called periodically to sync memory with DB
    -- Implementation depends on application architecture
END $$;

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE ON security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ip_management TO authenticated;
GRANT SELECT, INSERT, UPDATE ON country_blocking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON account_lockout TO authenticated;

-- View for security dashboard
CREATE OR REPLACE VIEW security_dashboard_view AS
SELECT 
    (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
    (SELECT COUNT(*) FROM security_events WHERE severity IN ('critical', 'emergency') AND created_at > NOW() - INTERVAL '24 hours') as critical_events_24h,
    (SELECT COUNT(*) FROM account_lockout WHERE locked_until > NOW()) as currently_locked_accounts,
    (SELECT COUNT(*) FROM ip_management WHERE is_active = TRUE AND action = 'block') as blocked_ips,
    (SELECT COUNT(*) FROM ip_management WHERE is_active = TRUE AND action = 'allow') as allowed_ips,
    (SELECT COUNT(*) FROM country_blocking WHERE is_active = TRUE AND action = 'block') as blocked_countries,
    (SELECT json_agg(json_build_object('event_type', event_type, 'count', cnt)) 
     FROM (SELECT event_type, COUNT(*) as cnt 
           FROM security_events 
           WHERE created_at > NOW() - INTERVAL '24 hours' 
           GROUP BY event_type 
           ORDER BY cnt DESC 
           LIMIT 10) t) as top_events_24h;

GRANT SELECT ON security_dashboard_view TO authenticated;

-- Migration completed successfully