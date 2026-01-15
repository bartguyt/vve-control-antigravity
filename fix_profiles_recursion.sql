-- FIX INFINITE RECURSION IN PROFILES POLICY
-- The error "infinite recursion detected in policy for relation profiles" happens because:
-- 1. "View members of shared VvEs" policy on 'profiles' selects from 'vve_memberships'.
-- 2. AND it checks if user is super_admin by selecting from 'profiles' (SELF-REFERENCE RECURSION).
-- 3. 'vve_memberships' policies might also check 'profiles' for super_admin status (MUTUAL RECURSION).

-- SOLUTION:
-- Create a SECURITY DEFINER function to check is_super_admin status. 
-- This bypasses RLS on the 'profiles' table for that specific check.

-- 1. Create Helper Function
CREATE OR REPLACE FUNCTION public.am_i_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()), 
    FALSE
  );
$$;

-- 2. Update Profiles Policy to use the helper
DROP POLICY IF EXISTS "View members of shared VvEs" ON profiles;
CREATE POLICY "View members of shared VvEs" ON profiles
FOR SELECT USING (
  am_i_super_admin() OR -- Use helper (No RLS trigger)
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM vve_memberships my_m
    JOIN vve_memberships their_m ON my_m.vve_id = their_m.vve_id
    WHERE my_m.user_id = auth.uid() 
      AND their_m.user_id = profiles.user_id
  )
);

-- 3. Update VvE Memberships Policy to use the helper (to be safe/consistent)
DROP POLICY IF EXISTS "Super Admins manage all memberships" ON vve_memberships;
CREATE POLICY "Super Admins manage all memberships" ON vve_memberships
FOR ALL USING (
    am_i_super_admin()
);

-- 4. Update the other helper functions to use this new safe check too
CREATE OR REPLACE FUNCTION has_access_to_vve(target_vve_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin sees all (Safe check)
  IF am_i_super_admin() THEN
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

CREATE OR REPLACE FUNCTION has_role_in_vve(target_vve_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admin has all roles effectively (Safe check)
  IF am_i_super_admin() THEN
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
