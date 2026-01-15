-- Migration: Multi-Level Roles & Super Admin
-- Description: Transition from 1:1 User-VvE to Many-to-Many User-VvEs via vve_memberships.

-- 1. Add Super Admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- 2. Create vve_memberships table
CREATE TABLE IF NOT EXISTS vve_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vve_id UUID REFERENCES vves(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'board', 'audit_comm', 'tech_comm', 'member', 'admin')), -- maintaining 'admin' for backward compat during migration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, vve_id)
);

-- 3. Enable RLS on memberships
ALTER TABLE vve_memberships ENABLE ROW LEVEL SECURITY;

-- 4. Migrate existing data from profiles to vve_memberships
-- We assume profiles.id matches auth.users.id (standard Supabase pattern)
INSERT INTO vve_memberships (user_id, vve_id, role)
SELECT 
    user_id, 
    vve_id, 
    CASE role
        WHEN 'lid' THEN 'member'
        WHEN 'bestuur' THEN 'board'
        WHEN 'kascommissie' THEN 'audit_comm'
        WHEN 'techcommissie' THEN 'tech_comm'
        WHEN 'admin' THEN 'admin'
        ELSE 'member' -- Default fallback
    END
FROM profiles 
WHERE vve_id IS NOT NULL AND user_id IS NOT NULL
ON CONFLICT (user_id, vve_id) DO NOTHING;

-- 5. Helper function for RLS: Check if user has access to a VvE
-- Replaces get_my_vve_id() which assumed single VvE
CREATE OR REPLACE FUNCTION has_access_to_vve(target_vve_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin sees all
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = TRUE) THEN
    RETURN TRUE;
  END IF;

  -- Member check
  RETURN EXISTS (
    SELECT 1 
    FROM vve_memberships 
    WHERE user_id = auth.uid() 
      AND vve_id = target_vve_id
  );
END;
$$;

-- 6. Helper function for RLS: Check if user has specific role in a VvE
CREATE OR REPLACE FUNCTION has_role_in_vve(target_vve_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin has all roles effectively
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = TRUE) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM vve_memberships 
    WHERE user_id = auth.uid() 
      AND vve_id = target_vve_id
      AND role = required_role
  );
END;
$$;

-- 7. UPDATE RLS POLICIES
-- We need to update policies on ALL tables to use the new check.

-- VVES
DROP POLICY IF EXISTS "Users can view their own VvE" ON vves;
CREATE POLICY "Users can view their accessible VvEs" ON vves
FOR SELECT USING (has_access_to_vve(id));

-- PROFILES
-- Profiles are now "Global", but we might still want to limit visibility 
-- to people sharing *at least one* VvE? Or just keep it open for the platform?
-- For now, let's allow viewing profiles that share a VvE membership.
DROP POLICY IF EXISTS "View members of same VvE" ON profiles;
CREATE POLICY "View members of shared VvEs" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM vve_memberships my_m
    JOIN vve_memberships their_m ON my_m.vve_id = their_m.vve_id
    WHERE my_m.user_id = auth.uid() 
      AND their_m.user_id = profiles.user_id
  ) OR 
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = TRUE)
);

-- AGENDA EVENTS
DROP POLICY IF EXISTS "Users can view events in their VvE" ON agenda_events;
DROP POLICY IF EXISTS "All members can create events" ON agenda_events;
DROP POLICY IF EXISTS "Users can manage their own events or Admins manage all" ON agenda_events;

CREATE POLICY "Users can view events in their VvEs" ON agenda_events
FOR SELECT USING (has_access_to_vve(vve_id));

CREATE POLICY "Users can create events in their VvEs" ON agenda_events
FOR INSERT WITH CHECK (has_access_to_vve(vve_id));

CREATE POLICY "Manage events in accessible VvEs" ON agenda_events
FOR ALL USING (
    has_access_to_vve(vve_id) AND (
        created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR 
        has_role_in_vve(vve_id, 'admin') OR 
        has_role_in_vve(vve_id, 'board') OR
        has_role_in_vve(vve_id, 'manager')
    )
);

-- DOCUMENTS
DROP POLICY IF EXISTS "Users can view documents in their VvE" ON documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON documents;

CREATE POLICY "Users can view documents in their VvEs" ON documents
FOR SELECT USING (has_access_to_vve(vve_id));

CREATE POLICY "Admins/Managers can manage documents" ON documents
FOR ALL USING (
  has_access_to_vve(vve_id) AND (
    has_role_in_vve(vve_id, 'admin') OR 
    has_role_in_vve(vve_id, 'board') OR
    has_role_in_vve(vve_id, 'manager')
  )
);

-- ACTIVITY LOGS
DROP POLICY IF EXISTS "Users can view activities in their VvE" ON activity_logs;
CREATE POLICY "Users can view activities in their VvEs" ON activity_logs
FOR SELECT USING (has_access_to_vve(vve_id));

-- BANKING
DROP POLICY IF EXISTS "Users can view bank connections for their VvE" ON bank_connections;
CREATE POLICY "Users can view bank connections" ON bank_connections
FOR SELECT USING (has_access_to_vve(vve_id));

DROP POLICY IF EXISTS "Users can view bank accounts for their VvE" ON bank_accounts;
CREATE POLICY "Users can view bank accounts" ON bank_accounts
FOR SELECT USING (has_access_to_vve(vve_id));

DROP POLICY IF EXISTS "Users can view bank transactions for their VvE" ON bank_transactions;
CREATE POLICY "Users can view bank transactions" ON bank_transactions
FOR SELECT USING (has_access_to_vve(vve_id));

-- ACCESS TO MEMBERSHIPS TABLE ITSELF
CREATE POLICY "Users can view memberships of shared VvEs" ON vve_memberships
FOR SELECT USING (
  user_id = auth.uid() OR
  has_access_to_vve(vve_id)
);

CREATE POLICY "Super Admins manage all memberships" ON vve_memberships
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_super_admin = TRUE)
);

-- NOT dropping old columns on 'profiles' yet to ensure backward compatibility during dev
