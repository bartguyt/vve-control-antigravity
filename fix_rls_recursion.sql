-- FIX RLS INFINITE RECURSION
-- Logic: The 'get_my_association_ids' function MUST be SECURITY DEFINER and owned by postgres to bypass RLS.
-- If it runs as the user, querying 'association_memberships' triggers the policy, calling the function, causing a loop.

BEGIN;

-- 1. Drop the problematic function and policies
DROP POLICY IF EXISTS "Memberships_Select" ON public.association_memberships;
DROP POLICY IF EXISTS "Memberships_Write" ON public.association_memberships;
-- Drop dependent policies on OTHER tables just in case (though we are replacing the function signature same-same)
-- Actually, let's drop the function with CASCADE to be sure we clean up old references
DROP FUNCTION IF EXISTS public.get_my_association_ids() CASCADE;

-- 2. Recreate Function with Explicit Security
CREATE OR REPLACE FUNCTION public.get_my_association_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs as Owner
SET search_path = public -- Critical: Prevents search_path hijacking
AS $$
DECLARE
    result UUID[];
BEGIN
    SELECT COALESCE(array_agg(association_id), '{}')
    INTO result
    FROM public.association_memberships
    WHERE user_id = auth.uid();
    
    RETURN result;
END;
$$;

-- Critical: Ensure Owner is Postgres (Superuser/BypassRLS)
ALTER FUNCTION public.get_my_association_ids() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_association_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_association_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_association_ids() TO service_role;


-- 3. Recreate Policies for ASSOCIATION_MEMBERSHIPS
-- Note: usage of the function inside the policy for the SAME table requires the bypass.

ALTER TABLE public.association_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memberships_Select" ON public.association_memberships
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_super_admin()
  -- The function call below is safe ONLY IF get_my_association_ids() bypasses RLS
  OR association_id = ANY(public.get_my_association_ids())
);

CREATE POLICY "Memberships_Manage" ON public.association_memberships
FOR ALL TO authenticated
USING (
  is_super_admin() 
  OR EXISTS (
    SELECT 1 FROM public.association_memberships my_m
    WHERE my_m.association_id = public.association_memberships.association_id
    AND my_m.user_id = auth.uid()
    AND my_m.role IN ('admin', 'manager', 'board')
  )
);

-- 4. Re-apply policies for other tables that might have been dropped by CASCADE
-- (If CASCADE dropped them, we need to restore them. CASCADE on function drops policies using it)

-- PROFILES
DROP POLICY IF EXISTS "Profiles_Select" ON public.profiles;
CREATE POLICY "Profiles_Select" ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id 
  OR is_super_admin()
  OR id IN (
      SELECT user_id 
      FROM public.association_memberships 
      WHERE association_id = ANY(public.get_my_association_ids())
  )
);

-- MEMBERS (New Table)
DROP POLICY IF EXISTS "Members_Select" ON public.members;
CREATE POLICY "Members_Select" ON public.members FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR association_id = ANY(public.get_my_association_ids())
);

-- ACTIVITY LOGS
DROP POLICY IF EXISTS "Logs_Select" ON public.activity_logs;
CREATE POLICY "Logs_Select" ON public.activity_logs FOR SELECT TO authenticated
USING (
    is_super_admin() 
    OR profile_id = auth.uid() 
    OR association_id = ANY(public.get_my_association_ids())
);

-- ASSOCIATIONS
DROP POLICY IF EXISTS "Associations_Select" ON public.associations;
CREATE POLICY "Associations_Select" ON public.associations FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR id = ANY(public.get_my_association_ids())
);

-- OTHER TABLES (Feature tables)
-- We'll use a DO block to re-apply the standard pattern for feature tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['agenda_events', 'event_categories', 'assignments', 'documents', 'maintenance_tasks', 'suppliers', 'bank_transactions'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Select_%I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Select_%I" ON %I FOR SELECT TO authenticated USING (association_id = ANY(public.get_my_association_ids()) OR is_super_admin())', tbl, tbl);
  END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
