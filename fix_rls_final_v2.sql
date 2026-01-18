-- FIX RLS INFINITE RECURSION (FINAL V2)
-- Diagnosis: Circular dependency between policies on 'profiles' and 'association_memberships'
-- via 'is_super_admin()' and 'get_my_association_ids()'.
-- Solution: Both helper functions MUST be SECURITY DEFINER to bypass RLS policies when they run.

BEGIN;

-- 1. Drop Functions (CASCADE to remove dependent policies automatically)
DROP FUNCTION IF EXISTS public.get_my_association_ids() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;

-- 2. Recreate is_super_admin() as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the current user has is_super_admin flag in profiles
    -- Runs as postgres (owner), so it ignores profiles RLS
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_super_admin = true
    );
END;
$$;
ALTER FUNCTION public.is_super_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;


-- 3. Recreate get_my_association_ids() as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_association_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result UUID[];
BEGIN
    -- Runs as postgres (owner), so it ignores association_memberships RLS
    SELECT COALESCE(array_agg(association_id), '{}')
    INTO result
    FROM public.association_memberships
    WHERE user_id = auth.uid();
    
    RETURN result;
END;
$$;
ALTER FUNCTION public.get_my_association_ids() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_association_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_association_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_association_ids() TO service_role;


-- 4. Recreate Policies for ASSOCIATION_MEMBERSHIPS
ALTER TABLE public.association_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memberships_Select" ON public.association_memberships
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin() -- Trusted call (safe)
  OR association_id = ANY(public.get_my_association_ids()) -- Trusted call (safe)
);

CREATE POLICY "Memberships_Manage" ON public.association_memberships
FOR ALL TO authenticated
USING (
  public.is_super_admin() 
  OR EXISTS (
    -- Manual check here since we are inside the policy
    -- But since this is FOR ALL (Update/Delete/Insert), we need to be careful.
    -- However, checking 'association_memberships' for role is recursive if we are not careful?
    -- No, "EXISTS (Select ...)" is standard. 
    -- The internal select *might* trigger RLS? 
    -- Yes! SELECT on association_memberships triggers its SELECT policy.
    -- Which calls get_my_association_ids (Safe).
    SELECT 1 FROM public.association_memberships my_m
    WHERE my_m.association_id = public.association_memberships.association_id
    AND my_m.user_id = auth.uid()
    AND my_m.role IN ('admin', 'manager', 'board')
  )
);


-- 5. Recreate Policies for PROFILES
DROP POLICY IF EXISTS "Profiles_Select" ON public.profiles;
-- Also check for dependent policies if any
CREATE POLICY "Profiles_Select" ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id 
  OR public.is_super_admin() -- Safe
  OR id IN (
      -- Is this subquery safe?
      -- SELECT from association_memberships triggers ITS policy.
      -- ITS policy calls get_my_association_ids (Safe).
      -- So this should be safe.
      SELECT user_id 
      FROM public.association_memberships 
      WHERE association_id = ANY(public.get_my_association_ids()) 
  )
);

-- Manage Policy for Profiles (Often missing)
CREATE POLICY "Profiles_Update" ON public.profiles FOR UPDATE TO authenticated
USING ( auth.uid() = id OR public.is_super_admin() );


-- 6. Recreate Policies for ASSOCIATIONS
DROP POLICY IF EXISTS "Associations_Select" ON public.associations;
CREATE POLICY "Associations_Select" ON public.associations FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR id = ANY(public.get_my_association_ids())
);


-- 7. Recreate Policies for MEMBERS
DROP POLICY IF EXISTS "Members_Select" ON public.members;
CREATE POLICY "Members_Select" ON public.members FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR association_id = ANY(public.get_my_association_ids())
);

-- 8. Recreate Policies for ACTIVITY_LOGS
DROP POLICY IF EXISTS "Logs_Select" ON public.activity_logs;
CREATE POLICY "Logs_Select" ON public.activity_logs FOR SELECT TO authenticated
USING (
    public.is_super_admin() 
    OR profile_id = auth.uid() 
    OR association_id = ANY(public.get_my_association_ids())
);


-- 9. Recreate Feature Policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['agenda_events', 'event_categories', 'assignments', 'documents', 'maintenance_tasks', 'suppliers', 'bank_transactions'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Select_%I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Select_%I" ON %I FOR SELECT TO authenticated USING (association_id = ANY(public.get_my_association_ids()) OR public.is_super_admin())', tbl, tbl);
  END LOOP;
END $$;


COMMIT;

NOTIFY pgrst, 'reload schema';
