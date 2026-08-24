-- RLS Policies Enforcement Script for Neon PostgreSQL
-- Run this in the Neon SQL Editor after Migration 13.

-- Enable RLS on critical tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizational_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Ministry sees all
CREATE POLICY "Ministry sees all entities"
  ON organizational_entities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

CREATE POLICY "Ministry sees all members"
  ON members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

CREATE POLICY "Ministry sees all elections"
  ON elections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

CREATE POLICY "Ministry sees all activities"
  ON activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ministry','auditor','viewer')
  ));

-- Policy: Organization sees own
CREATE POLICY "Organization sees own entity"
  ON organizational_entities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'organization' AND p.entity_id = entity_id
  ));

CREATE POLICY "Organization sees own members"
  ON members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'organization' AND p.entity_id = members.entity_id
  ));

-- Policy: Ministry can insert entities
CREATE POLICY "Ministry can insert entities"
  ON organizational_entities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

-- Policy: Ministry can update entities
CREATE POLICY "Ministry can update entities"
  ON organizational_entities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

-- Policy: Users see own notifications
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Ministry can read all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ministry'
  ));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

RAISE NOTICE 'RLS Policies applied successfully.';