-- Migration 20260825_13_global_identity.sql — الهوية العالمية وسلامة المفاتيح
-- Implements: Global Identity, PK enforcement, Tenant Isolation

-- 1. Add global_id to organizational_entities (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='global_id') THEN
    ALTER TABLE organizational_entities ADD COLUMN global_id UUID UNIQUE;
    -- Add index for fast lookup
    CREATE INDEX IF NOT EXISTS idx_entities_global_id ON organizational_entities(global_id);
  END IF;
END $$;

-- 2. Add global_id to members table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='global_id') THEN
    ALTER TABLE members ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_members_global_id ON members(global_id);
  END IF;
END $$;

-- 3. Add global_id to legal_entities table (for commercial establishments)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_entities' AND column_name='global_id') THEN
    ALTER TABLE legal_entities ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_legal_entities_global_id ON legal_entities(global_id);
  END IF;
END $$;

-- 4. Add global_id to board_members table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='board_members' AND column_name='global_id') THEN
    ALTER TABLE board_members ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_board_members_global_id ON board_members(global_id);
  END IF;
END $$;

-- 5. Add global_id to elections table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='elections' AND column_name='global_id') THEN
    ALTER TABLE elections ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_elections_global_id ON elections(global_id);
  END IF;
END $$;

-- 6. Add global_id to activities table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='global_id') THEN
    ALTER TABLE activities ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_activities_global_id ON activities(global_id);
  END IF;
END $$;

-- 7. Add global_id to documents table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='global_id') THEN
    ALTER TABLE documents ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_documents_global_id ON documents(global_id);
  END IF;
END $$;

-- 8. Add global_id to violations table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='violations' AND column_name='global_id') THEN
    ALTER TABLE violations ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_violations_global_id ON violations(global_id);
  END IF;
END $$;

-- 9. Add global_id to service_requests table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_requests' AND column_name='global_id') THEN
    ALTER TABLE service_requests ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_service_requests_global_id ON service_requests(global_id);
  END IF;
END $$;

-- 10. Add global_id to licenses table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='global_id') THEN
    ALTER TABLE licenses ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_licenses_global_id ON licenses(global_id);
  END IF;
END $$;

-- 11. Add global_id to profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='global_id') THEN
    ALTER TABLE profiles ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_profiles_global_id ON profiles(global_id);
  END IF;
END $$;

-- 12. Add global_id to payments_signatures table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments_signatures') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments_signatures' AND column_name='global_id') THEN
      ALTER TABLE payments_signatures ADD COLUMN global_id UUID UNIQUE;
      CREATE INDEX IF NOT EXISTS idx_payments_signatures_global_id ON payments_signatures(global_id);
    END IF;
  END IF;
END $$;

-- 13. Ensure all tables have Primary Keys (enforce if missing)
DO $$
DECLARE
  tbl_name TEXT;
  has_pk BOOLEAN;
BEGIN
  FOR tbl_name IN
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'TABLE'
  LOOP
    -- Check if table has a primary key
    SELECT INTO has_pk EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = tbl_name
      AND constraint_type = 'PRIMARY KEY'
    );
    
    IF NOT has_pk THEN
      -- Try to add PK based on existing id column
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'id' AND data_type = 'uuid') THEN
        EXECUTE 'ALTER TABLE ' || tbl_name || ' ADD PRIMARY KEY (id)';
        RAISE NOTICE 'Added PK to %', tbl_name;
      ELSE
        RAISE NOTICE 'Cannot add PK to %: no id column', tbl_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 14. Add tenant_id for multi-tenancy isolation to all critical tables
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  FOR tbl_name IN
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'TABLE'
    LOOP
      -- Add tenant_id column if not exists
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'tenant_id') THEN
        ALTER TABLE tbl_name ADD COLUMN tenant_id UUID;
        -- Add index for tenant-based queries
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || tbl_name || '_tenant ON ' || tbl_name || '(tenant_id)';
        RAISE NOTICE 'Added tenant_id to %', tbl_name;
      END IF;
    END LOOP;
END $$;

-- 15. Add constraint to prevent null tenant_id in critical operation tables
DO $$
BEGIN
  -- organizational_entities must have tenant_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='tenant_id') THEN
    ALTER TABLE organizational_entities ADD CONSTRAINT chk_org_tenant_id CHECK (tenant_id IS NOT NULL);
  END IF;
  
  -- members must have tenant_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='tenant_id') THEN
    ALTER TABLE members ADD CONSTRAINT chk_member_tenant_id CHECK (tenant_id IS NOT NULL);
  END IF;
  
  -- legal_entities must have tenant_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_entities' AND column_name='tenant_id') THEN
    ALTER TABLE legal_entities ADD CONSTRAINT chk_legal_tenant_id CHECK (tenant_id IS NOT NULL);
  END IF;
END $$;

RAISE NOTICE 'Migration 13 completed: Global Identity and Key Integrity implemented';