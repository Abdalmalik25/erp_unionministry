-- Migration: 20260824_01_profession_standards_linking.sql
-- Adding profession-applicability linking and evaluation standards

-- ============================================================
-- 1. CREATE profession_applicability bridge table
-- ============================================================
-- This table links professions to enterprises/activities,
-- defining which standards apply to which facilities.

CREATE TABLE IF NOT EXISTS profession_applicability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profession_id UUID NOT NULL REFERENCES professions(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  
  -- Standard applicability
  standard_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  is_primary BOOLEAN DEFAULT false,
  
-- Risk and frequency settings
  risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  inspection_frequency VARCHAR(20) NOT NULL DEFAULT 'annual',
  
-- Status tracking
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMPTZ DEFAULT now(),
  effective_to TIMESTAMPTZ,
  
-- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  
-- Constraint: unique profession-enterprise-activity-standard combination
  CONSTRAINT uq_profession_applicability_unique UNIQUE (profession_id, enterprise_id, activity_id, standard_version)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profession_applicability_profession ON profession_applicability(profession_id);
CREATE INDEX IF NOT EXISTS idx_profession_applicability_enterprise ON profession_applicability(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_profession_applicability_activity ON profession_applicability(activity_id);
CREATE INDEX IF NOT EXISTS idx_profession_applicability_active ON profession_applicability(is_active, effective_from, effective_to);

-- ============================================================
-- 2. ADD profession linkage to evaluation_certificates
-- ============================================================
-- This links each evaluation certificate to the profession
-- it was assessed against, with standard version tracking.

ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS profession_id UUID REFERENCES professions(id) ON DELETE SET NULL;
ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS standard_version VARCHAR(20) DEFAULT 'v1.0';
ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS assessed_against_standards BOOLEAN DEFAULT false;
ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS evaluation_criteria JSONB DEFAULT '{}';

-- Create index for profession lookups
CREATE INDEX IF NOT EXISTS idx_evaluation_certificates_profession ON evaluation_certificates(profession_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_certificates_standard ON evaluation_certificates(standard_version);

-- ============================================================
-- 3. ADD performance standards tracking to professions
-- ============================================================
-- These fields track which version of performance standards
-- are applied to each profession, enabling versioned evaluation.

ALTER TABLE professions ADD COLUMN IF NOT EXISTS performance_standards_version VARCHAR(20) DEFAULT 'v1.0';
ALTER TABLE professions ADD COLUMN IF NOT EXISTS standards_effective_from TIMESTAMPTZ;
ALTER TABLE professions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for active profession queries
CREATE INDEX IF NOT EXISTS idx_professions_active ON professions(is_active, performance_standards_version);

-- ============================================================
-- 4. MIGRATE EXISTING DATA (optional - safe default values)
-- ============================================================
-- Set default standards version for existing professions
UPDATE professions SET performance_standards_version = 'v1.0' WHERE performance_standards_version IS NULL;

-- Set default standard version for existing evaluation certificates
UPDATE evaluation_certificates SET standard_version = 'v1.0' WHERE standard_version IS NULL;

-- Mark existing evaluations as assessed against basic standards
UPDATE evaluation_certificates SET assessed_against_standards = true WHERE assessed_against_standards IS NULL;

-- ============================================================
-- 5. ROLLBACK SCRIPT (if needed)
-- ============================================================
-- Drop the new columns and table in reverse order

DROP INDEX IF EXISTS idx_professions_active;
ALTER TABLE professions DROP COLUMN IF EXISTS is_active;
ALTER TABLE professions DROP COLUMN IF EXISTS standards_effective_from;
ALTER TABLE professions DROP COLUMN IF EXISTS performance_standards_version;

DROP INDEX IF EXISTS idx_evaluation_certificates_standard;
DROP INDEX IF EXISTS idx_evaluation_certificates_profession;
ALTER TABLE evaluation_certificates DROP COLUMN IF EXISTS evaluation_criteria;
ALTER TABLE evaluation_certificates DROP COLUMN IF EXISTS assessed_against_standards;
ALTER TABLE evaluation_certificates DROP COLUMN IF EXISTS standard_version;
ALTER TABLE evaluation_certificates DROP COLUMN IF EXISTS profession_id;

DROP INDEX IF EXISTS idx_profession_applicability_active;
DROP INDEX IF EXISTS idx_profession_applicability_profession;
DROP INDEX IF EXISTS idx_profession_applicability_enterprise;
DROP INDEX IF EXISTS idx_profession_applicability_activity;
DROP TABLE IF EXISTS profession_applicability;