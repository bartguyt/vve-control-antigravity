-- Fix Profiles RLS to use user_id instead of id
-- This is necessary because the active profile has a UUID id that differs from the Auth User ID
-- but is correctly linked via the `user_id` column.

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles_Select" ON profiles;
DROP POLICY IF EXISTS "Profiles_Update" ON profiles;
DROP POLICY IF EXISTS "Profiles_Insert" ON profiles; -- usually public or limited
DROP POLICY IF EXISTS "View members of shared VvEs" ON profiles;

-- Re-create Select Policy
CREATE POLICY "Profiles_Select" ON profiles
FOR SELECT USING (
    -- User can see their own profile
    auth.uid() = user_id 
    OR 
    -- Super Admin can see all
    is_super_admin() 
    OR 
    -- Users can see profiles of members in their VvEs
    user_id IN (
        SELECT m.user_id 
        FROM vve_memberships m
        WHERE m.vve_id IN (
            SELECT my_m.vve_id 
            FROM vve_memberships my_m 
            WHERE my_m.user_id = auth.uid()
        )
    )
);

-- Re-create Update Policy
CREATE POLICY "Profiles_Update" ON profiles
FOR UPDATE USING (
    -- User can update their own profile
    auth.uid() = user_id 
    OR 
    -- Super Admin can update any
    is_super_admin()
);

-- Re-create Insert Policy (Self-registration)
CREATE POLICY "Profiles_Insert" ON profiles
FOR INSERT WITH CHECK (
    -- Can insert if linking to own auth id
    auth.uid() = user_id
    OR
    is_super_admin()
);

-- Ensure RLS is on
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
