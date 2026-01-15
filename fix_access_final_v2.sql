-- FINAL ACCESS FIX V2
-- This script repairs the caching layer and standardizes RLS policies.
-- Correction: sys_membership_cache only has user_id and vve_id.

-- 1. POPULATE MEMBERSHIP CACHE
DO $$
BEGIN
    -- Only run if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sys_membership_cache') THEN
        -- Clear for this user
        DELETE FROM sys_membership_cache WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';
        
        -- Insert fresh data from vve_memberships (WITHOUT ROLE)
        INSERT INTO sys_membership_cache (user_id, vve_id)
        SELECT user_id, vve_id
        FROM vve_memberships
        WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';
    END IF;
END $$;

-- 2. CLEAN UP VVE_MEMBERSHIPS POLICIES
-- Remove all conflicting old/new policies
DROP POLICY IF EXISTS "Memberships_Select" ON vve_memberships;
DROP POLICY IF EXISTS "Memberships_Modify" ON vve_memberships;
DROP POLICY IF EXISTS "Memberships_Delete" ON vve_memberships;
DROP POLICY IF EXISTS "Super Admins manage all memberships" ON vve_memberships;
DROP POLICY IF EXISTS "Users can view memberships of shared VvEs" ON vve_memberships;

-- 3. RE-CREATE CLEAN POLICIES FOR MEMBERSHIPS
-- Select: Can see own memberships OR if Super Admin
CREATE POLICY "Memberships_Select" ON vve_memberships
FOR SELECT USING (
    auth.uid() = user_id 
    OR is_super_admin()
);

-- Insert/Update/Delete: Super Admin only (for now, to be safe)
CREATE POLICY "Memberships_Admin" ON vve_memberships
FOR ALL USING (
    is_super_admin()
);

-- 4. ENSURE PROFILES RLS IS CORRECT (Self-View)
DROP POLICY IF EXISTS "Profiles_Select" ON profiles;
CREATE POLICY "Profiles_Select" ON profiles
FOR SELECT USING (
    auth.uid() = user_id 
    OR is_super_admin()
    OR 
    -- Users can see profiles of members in their VvEs (via cache)
    user_id IN (
        SELECT m.user_id 
        FROM vve_memberships m
        WHERE m.vve_id IN (
            SELECT c.vve_id 
            FROM sys_membership_cache c 
            WHERE c.user_id = auth.uid()
        )
    )
);

-- 5. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
