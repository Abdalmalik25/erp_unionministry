-- Migration 20260825_13_final — الهوية العالمية وسلامة المفاتيح (تنفيذي أخير)
-- THIS MIGRATION MUST BE RUN AGAINST NEON POSTGRESQL
-- It adds global_id and tenant_id to all critical tables if missing.

-- 1. Add global_id and tenant_id to organizational_entities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='global_id') THEN
    ALTER TABLE organizational_entities ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_entities_global_id ON organizational_entities(global_id);
    RAISE NOTICE 'Added global_id to organizational_entities';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizational_entities' AND column_name='tenant_id') THEN
    ALTER TABLE organizational_entities ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to organizational_entities';
  END IF;
END $$;

-- 2. Add global_id and tenant_id to members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='global_id') THEN
    ALTER TABLE members ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_members_global_id ON members(global_id);
    RAISE NOTICE 'Added global_id to members';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='tenant_id') THEN
    ALTER TABLE members ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to members';
  END IF;
END $$;

-- 3. Add global_id and tenant_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='global_id') THEN
    ALTER TABLE profiles ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_profiles_global_id ON profiles(global_id);
    RAISE NOTICE 'Added global_id to profiles';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tenant_id') THEN
    ALTER TABLE profiles ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to profiles';
  END IF;
END $$;

-- 4. Add global_id and tenant_id to legal_entities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_entities' AND column_name='global_id') THEN
    ALTER TABLE legal_entities ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_legal_entities_global_id ON legal_entities(global_id);
    RAISE NOTICE 'Added global_id to legal_entities';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_entities' AND column_name='tenant_id') THEN
    ALTER TABLE legal_entities ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to legal_entities';
  END IF;
END $$;

-- 5. Add global_id and tenant_id to board_members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='board_members' AND column_name='global_id') THEN
    ALTER TABLE board_members ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_board_members_global_id ON board_members(global_id);
    RAISE NOTICE 'Added global_id to board_members';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='board_members' AND column_name='tenant_id') THEN
    ALTER TABLE board_members ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to board_members';
  END IF;
END $$;

-- 6. Add global_id and tenant_id to elections
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='elections' AND column_name='global_id') THEN
    ALTER TABLE elections ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_elections_global_id ON elections(global_id);
    RAISE NOTICE 'Added global_id to elections';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='elections' AND column_name='tenant_id') THEN
    ALTER TABLE elections ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to elections';
  END IF;
END $$;

-- 7. Add global_id and tenant_id to activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='global_id') THEN
    ALTER TABLE activities ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_activities_global_id ON activities(global_id);
    RAISE NOTICE 'Added global_id to activities';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activities' AND column_name='tenant_id') THEN
    ALTER TABLE activities ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to activities';
  END IF;
END $$;

-- 8. Add global_id and tenant_id to documents
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='global_id') THEN
    ALTER TABLE documents ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_documents_global_id ON documents(global_id);
    RAISE NOTICE 'Added global_id to documents';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='tenant_id') THEN
    ALTER TABLE documents ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to documents';
  END IF;
END $$;

-- 9. Add global_id and tenant_id to licenses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='global_id') THEN
    ALTER TABLE licenses ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_licenses_global_id ON licenses(global_id);
    RAISE NOTICE 'Added global_id to licenses';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='tenant_id') THEN
    ALTER TABLE licenses ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to licenses';
  END IF;
END $$;

-- 10. Add global_id and tenant_id to service_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_requests' AND column_name='global_id') THEN
    ALTER TABLE service_requests ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_service_requests_global_id ON service_requests(global_id);
    RAISE NOTICE 'Added global_id to service_requests';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_requests' AND column_name='tenant_id') THEN
    ALTER TABLE service_requests ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to service_requests';
  END IF;
END $$;

-- 11. Add global_id and tenant_id to violations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='violations' AND column_name='global_id') THEN
    ALTER TABLE violations ADD COLUMN global_id UUID UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_violations_global_id ON violations(global_id);
    RAISE NOTICE 'Added global_id to violations';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='violations' AND column_name='tenant_id') THEN
    ALTER TABLE violations ADD COLUMN tenant_id UUID NOT NULL;
    RAISE NOTICE 'Added tenant_id to violations';
  END IF;
END $$;

RAISE NOTICE 'Migration 13 Final executed. Global Identity and Tenant Isolation applied.';