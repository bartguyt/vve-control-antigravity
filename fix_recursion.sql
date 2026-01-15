-- Fix infinite recursion on profiles and memberships
-- 1. Create a secure function to check super admin status that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users in same VvE" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable by self or same VvE members" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- 3. Create clean, non-recursive policies for profiles
-- View: Self, Super Admin, or Same VvE
CREATE POLICY "Profiles viewable by self, super admin, or VvE colleagues"
ON profiles FOR SELECT
USING (
  auth.uid() = id -- Self
  OR
  is_super_admin() -- Super Admin (via secure function)
  OR
  EXISTS ( -- Same VvE Membership
    SELECT 1 FROM vve_memberships my_m
    JOIN vve_memberships their_m ON my_m.vve_id = their_m.vve_id
    WHERE my_m.user_id = auth.uid()
    AND their_m.user_id = profiles.id
  )
);

-- Insert: Self (during signup)
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Update: Self or Super Admin
CREATE POLICY "Users can update own profile or Super Admin"
ON profiles FOR UPDATE
USING (auth.uid() = id OR is_super_admin());

-- 4. Fix vve_memberships policies
DROP POLICY IF EXISTS "Memberships viewable by self or VvE colleagues" ON vve_memberships;
DROP POLICY IF EXISTS "Memberships viewable by self or same vve" ON vve_memberships;
DROP POLICY IF EXISTS "Enable read access for all users" ON vve_memberships;

CREATE POLICY "Memberships viewable by relevant users"
ON vve_memberships FOR SELECT
USING (
  user_id = auth.uid() -- My own memberships
  OR
  is_super_admin() -- Super Admin
  OR
  EXISTS ( -- Colleagues in my VvEs (e.g. searching for members)
    SELECT 1 FROM vve_memberships my_m
    WHERE my_m.vve_id = vve_memberships.vve_id
    AND my_m.user_id = auth.uid()
  )
);

CREATE POLICY "Memberships manage by super admin or VvE manager"
ON vve_memberships FOR ALL
USING (
    is_super_admin()
    OR
    EXISTS (
        SELECT 1 FROM vve_memberships my_m
        WHERE my_m.vve_id = vve_memberships.vve_id
        AND my_m.user_id = auth.uid()
        AND my_m.role IN ('admin', 'manager', 'board')
    )
);

-- 5. Fix vves table policies just in case
DROP POLICY IF EXISTS "VvEs viewable by members" ON vves;

CREATE POLICY "VvEs viewable by members and super admin"
ON vves FOR SELECT
USING (
  is_super_admin()
  OR
  EXISTS (
    SELECT 1 FROM vve_memberships m
    WHERE m.vve_id = id
    AND m.user_id = auth.uid()
  )
);
