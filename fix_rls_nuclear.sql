-- NUCLEAR FIX FOR RLS RECURSION
-- Strategy: Isolate "Super Admin" status and "My VvEs" lookup to break specific recursion loops.
-- ORDER IS CRITICAL: Policies depend on functions, so we must DROP POLICIES FIRST before updating functions.

-- 1. Create a dedicated table for App Admins (Breaks Super Admin recursion)
CREATE TABLE IF NOT EXISTS app_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users (needed for is_super_admin check if not security definer, but we'll use security definer anyway)
DROP POLICY IF EXISTS "Public read access to app_admins" ON app_admins;
CREATE POLICY "Public read access to app_admins" ON app_admins FOR SELECT TO authenticated USING (true);


-- 2. Sync existing super admins
INSERT INTO app_admins (user_id)
SELECT id FROM profiles WHERE is_super_admin = true
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO app_admins (user_id)
SELECT id FROM profiles WHERE email = 'bart@guijt.nl'
ON CONFLICT (user_id) DO NOTHING;


-- 3. Clean up old Policies (CRITICAL: MUST BE DONE BEFORE DROPPING FUNCTIONS)
DO $$ 
DECLARE 
  pol record; 
BEGIN 
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'vve_memberships', 'activity_logs', 'vves') 
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename); 
  END LOOP; 
END $$;


-- 4.a Helper: is_super_admin (SECURITY DEFINER to avoid RLS on app_admins/profiles)
-- PLPGSQL prevents inlining optimization
DROP FUNCTION IF EXISTS public.is_super_admin();
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_admins WHERE user_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.is_super_admin() OWNER TO postgres;


-- 4.b Helper: get_my_vve_ids (SECURITY DEFINER to avoid RLS on vve_memberships RECURSION)
-- PLPGSQL prevents inlining optimization
DROP FUNCTION IF EXISTS public.get_my_vve_ids();
CREATE OR REPLACE FUNCTION public.get_my_vve_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(array_agg(vve_id), '{}')
    FROM vve_memberships
    WHERE user_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.get_my_vve_ids() OWNER TO postgres;


-- 5. Re-apply robust structure Policies

-- PROFILES
CREATE POLICY "Profiles_Select" ON profiles FOR SELECT
USING (
  auth.uid() = id -- Self
  OR is_super_admin() -- Super Admin
  OR id IN ( -- Colleagues (Safe: queries vve_memberships which uses get_my_vve_ids)
      SELECT user_id 
      FROM vve_memberships 
      WHERE vve_id = ANY(get_my_vve_ids())
  )
);
CREATE POLICY "Profiles_Insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles_Update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_super_admin());


-- VVE_MEMBERSHIPS
CREATE POLICY "Memberships_Select" ON vve_memberships FOR SELECT
USING (
  user_id = auth.uid() -- My own
  OR is_super_admin() -- Super Admin
  OR vve_id = ANY(get_my_vve_ids()) -- Members of my VvEs (Safe: uses function, calls no tables in policy check itself)
);

CREATE POLICY "Memberships_Write" ON vve_memberships FOR ALL
USING (
  is_super_admin() 
  OR EXISTS ( -- VvE Managers
    SELECT 1 FROM vve_memberships my_m
    WHERE my_m.vve_id = vve_memberships.vve_id
    AND my_m.user_id = auth.uid()
    AND my_m.role IN ('admin', 'manager', 'board')
  )
);


-- ACTIVITY_LOGS
CREATE POLICY "Logs_Select" ON activity_logs FOR SELECT
USING (
    is_super_admin() 
    OR profile_id = auth.uid() 
    OR vve_id = ANY(get_my_vve_ids()) -- Logs of my VvEs
);
CREATE POLICY "Logs_Insert" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = profile_id);


-- VVES
CREATE POLICY "Vves_Select" ON vves FOR SELECT
USING (
    is_super_admin()
    OR id = ANY(get_my_vve_ids()) -- My VvEs
);

-- Fix Grant Issues if any hiding
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
