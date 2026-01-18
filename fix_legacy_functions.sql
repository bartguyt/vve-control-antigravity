-- FIX LEGACY FUNCTIONS
-- Replaces functions that still reference 'vve_memberships' with 'association_memberships'
-- and updates their names to match the new 'association' nomenclature.

BEGIN;

-- 1. Drop old functions
DROP FUNCTION IF EXISTS public.has_role_in_vve(uuid, text);
DROP FUNCTION IF EXISTS public.has_access_to_vve(uuid);
DROP FUNCTION IF EXISTS public.get_my_role(uuid);

-- 2. Create replacements with new naming
-- has_role_in_association
CREATE OR REPLACE FUNCTION public.has_role_in_association(target_association_id uuid, required_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin check
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.association_memberships 
    WHERE user_id = auth.uid() 
      AND association_id = target_association_id
      AND role = required_role
  );
END;
$$;

-- has_access_to_association
CREATE OR REPLACE FUNCTION public.has_access_to_association(target_association_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin check
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.association_memberships 
    WHERE user_id = auth.uid() 
      AND association_id = target_association_id
  );
END;
$$;

-- get_my_role_in_association
CREATE OR REPLACE FUNCTION public.get_my_role_in_association(look_association_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role::text
    FROM public.association_memberships 
    WHERE user_id = auth.uid() 
    AND association_id = look_association_id
    LIMIT 1
  );
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role_in_association TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_access_to_association TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role_in_association TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in_association TO service_role;
GRANT EXECUTE ON FUNCTION public.has_access_to_association TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role_in_association TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
