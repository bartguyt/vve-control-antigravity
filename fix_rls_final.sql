-- FINAL FIX FOR RLS RECURSION
-- Approach: 
-- 1. Ensure table owner (postgres) actually bypasses RLS by disabling FORCE RLS.
-- 2. Scope policies strictly TO authenticated role, so they don't apply to postgres even if it didn't bypass (though it should).

-- 1. Ensure NO FORCE RLS (allows owners/superusers to bypass)
ALTER TABLE vve_memberships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app_admins NO FORCE ROW LEVEL SECURITY;
ALTER TABLE activity_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE vves NO FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start clean
DO $$ 
DECLARE 
  pol record; 
BEGIN 
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'vve_memberships', 'activity_logs', 'vves') 
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename); 
  END LOOP; 
END $$;

-- 3. Re-define Helper Functions (Ensure they are correct)
-- is_super_admin
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

-- get_my_vve_ids
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


-- 4. Apply Policies SCOPED TO authenticated

-- PROFILES
CREATE POLICY "Profiles_Select" ON profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id -- Self
  OR is_super_admin() -- Super Admin
  OR id IN ( -- Colleagues
      SELECT user_id 
      FROM vve_memberships 
      WHERE vve_id = ANY(get_my_vve_ids())
  )
);
CREATE POLICY "Profiles_Insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles_Update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR is_super_admin());


-- VVE_MEMBERSHIPS
CREATE POLICY "Memberships_Select" ON vve_memberships FOR SELECT TO authenticated
USING (
  user_id = auth.uid() -- My own
  OR is_super_admin() -- Super Admin
  OR vve_id = ANY(get_my_vve_ids()) -- Members of my VvEs
);

CREATE POLICY "Memberships_Write" ON vve_memberships FOR ALL TO authenticated
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
CREATE POLICY "Logs_Select" ON activity_logs FOR SELECT TO authenticated
USING (
    is_super_admin() 
    OR profile_id = auth.uid() 
    OR vve_id = ANY(get_my_vve_ids())
);
CREATE POLICY "Logs_Insert" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);


-- VVES
CREATE POLICY "Vves_Select" ON vves FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR id = ANY(get_my_vve_ids())
);

-- Grant access just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
