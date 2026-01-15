-- FIX AUXILIARY TABLES RLS
-- The RLS policies on 'profiles' and 'vve_memberships' rely on these tables.
-- If they are locked down (RLS enabled but no policies), the main queries fail silently.

-- 1. SYS_MEMBERSHIP_CACHE
ALTER TABLE sys_membership_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own cache" ON sys_membership_cache;
CREATE POLICY "Users can read own cache" ON sys_membership_cache
FOR SELECT USING (
    user_id = auth.uid()
);

-- Allow system to write to it (if we had a trigger, but we populate manually for now)
-- We grant SELECT to authenticated users
GRANT SELECT ON sys_membership_cache TO authenticated;


-- 2. APP_ADMINS
-- is_super_admin() is SECURITY DEFINER so it should bypass this, but for debugging/dashboard access:
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read own entry" ON app_admins;
CREATE POLICY "Admins can read own entry" ON app_admins
FOR SELECT USING (
    user_id = auth.uid()
);

GRANT SELECT ON app_admins TO authenticated;
