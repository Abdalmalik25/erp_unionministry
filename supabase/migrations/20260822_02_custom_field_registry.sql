-- Migration: 20260822_02_custom_field_registry.sql
-- Hybrid Typed Extensibility Architecture
--
-- Core business fields stay as REAL columns (profession_id, status, dates...).
-- User-defined / extensible fields are stored as typed values inside a
-- `custom_data JSONB` column on the record, and DESCRIBED centrally in a
-- `custom_field_definitions` metadata registry (NOT an EAV value store).
--
-- This transforms the legacy, unused EAV-style `dynamic_fields` table into the
-- canonical metadata registry. No parallel system is created.
-- Values never live in the registry; they live in each record's custom_data.

-- 1) Transform legacy table only if it still exists (idempotent / re-runnable).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dynamic_fields') THEN
    ALTER TABLE dynamic_fields RENAME TO custom_field_definitions;
    ALTER TABLE custom_field_definitions RENAME COLUMN field_name TO field_key;
    ALTER TABLE custom_field_definitions RENAME COLUMN field_type TO data_type;
    ALTER TABLE custom_field_definitions DROP COLUMN IF EXISTS field_value;
    ALTER TABLE custom_field_definitions ALTER COLUMN entity_id DROP NOT NULL;
  END IF;
END $$;

-- 2) Extend the registry with typed metadata (idempotent guards).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='entity_type') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'organizational_entity';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='label') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN label TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='description') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='required') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN required BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='default_value') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN default_value JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='options') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN options JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='validation_rules') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN validation_rules JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='reference_entity') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN reference_entity TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='visible_in_form') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN visible_in_form BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='visible_in_list') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN visible_in_list BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='searchable') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN searchable BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='filterable') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN filterable BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='sortable') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN sortable BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='reportable') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN reportable BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='printable') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN printable BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='importable') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN importable BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='exportable') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN exportable BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='scope') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN scope TEXT NOT NULL DEFAULT 'global';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='active') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='custom_field_definitions' AND column_name='display_order') THEN
    ALTER TABLE custom_field_definitions ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill label from field_key for any pre-existing rows (expected none).
UPDATE custom_field_definitions SET label = field_key WHERE label IS NULL OR label = '';

-- 3) Constraints (guarded; the table starts empty so these are safe).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_cfd_entity_key') THEN
    ALTER TABLE custom_field_definitions ADD CONSTRAINT uq_cfd_entity_key UNIQUE (entity_type, field_key);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_cfd_datatype') THEN
    ALTER TABLE custom_field_definitions ADD CONSTRAINT ck_cfd_datatype
      CHECK (data_type IN ('text','textarea','integer','decimal','boolean','date','datetime','time','select','multiselect','reference','currency','percentage','email','phone','url','file'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_cfd_scope') THEN
    ALTER TABLE custom_field_definitions ADD CONSTRAINT ck_cfd_scope CHECK (scope IN ('global','entity'));
  END IF;
END $$;

DROP INDEX IF EXISTS idx_cfd_entity_active;
CREATE INDEX IF NOT EXISTS idx_cfd_entity_active ON custom_field_definitions(entity_type, active);

-- 4) Extensible value storage: custom_data JSONB ONLY on justified entities.
ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
DROP INDEX IF EXISTS idx_ec_custom_data;
CREATE INDEX IF NOT EXISTS idx_ec_custom_data ON evaluation_certificates USING GIN (custom_data) WHERE custom_data IS NOT NULL;

ALTER TABLE organizational_entities ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}'::jsonb;
DROP INDEX IF EXISTS idx_oe_custom_data;
CREATE INDEX IF NOT EXISTS idx_oe_custom_data ON organizational_entities USING GIN (custom_data) WHERE custom_data IS NOT NULL;
