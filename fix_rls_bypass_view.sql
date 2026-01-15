-- BYPASS VIEW FIX FOR RLS RECURSION (REORDERED)
-- Recursion happens because checking "My VvEs" triggers RLS on vve_memberships, which checks "My VvEs".
-- Solution: Create a privileged View (`sys_vve_memberships`) owned by postgres. 
-- The helper function `get_my_vve_ids` queries this View. 
-- Because the View owner (postgres) has BYPASSRLS, the recursion stops there.

-- 1. Drop old Policies FIRST (Critical to remove dependencies on functions)
DO $$ 
DECLARE 
  pol record; 
BEGIN 
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'vve_memberships', 'activity_logs', 'vves') 
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename); 
  END LOOP; 
END $$;


-- 2. Create Bypass View
CREATE OR REPLACE VIEW public.sys_vve_memberships AS 
SELECT * FROM public.vve_memberships;

-- Secure the View: Owned by postgres, NO access to public
ALTER VIEW public.sys_vve_memberships OWNER TO postgres;
REVOKE ALL ON public.sys_vve_memberships FROM public, authenticated, anon;
GRANT SELECT ON public.sys_vve_memberships TO postgres;


-- 3. Update Helper: get_my_vve_ids (Uses Bypass View)
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
    FROM sys_vve_memberships -- Queries the VIEW, bypassing RLS
    WHERE user_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.get_my_vve_ids() OWNER TO postgres;


-- 4. Update Helper: is_super_admin (Uses app_admins)
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


-- 5. Re-apply Policies (Now safe because functions are updated)

-- PROFILES
CREATE POLICY "Profiles_Select" ON profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id -- Self
  OR is_super_admin() -- Super Admin
  OR id IN ( -- Colleagues
      SELECT user_id 
      FROM vve_memberships 
      WHERE vve_id = ANY(get_my_vve_ids()) -- Safe now
  )
);
CREATE POLICY "Profiles_Insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles_Update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR is_super_admin());


-- VVE_MEMBERSHIPS
CREATE POLICY "Memberships_Select" ON vve_memberships FOR SELECT TO authenticated
USING (
  user_id = auth.uid() -- My own
  OR is_super_admin() -- Super Admin
  OR vve_id = ANY(get_my_vve_ids()) -- Safe now
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

-- Ensure permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
