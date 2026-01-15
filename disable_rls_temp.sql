-- NUCLEAR OPTION: DISABLE RLS TEMPORARILY
-- This will confirm if RLS is the blocker.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE vve_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE sys_membership_cache DISABLE ROW LEVEL SECURITY;

-- If this works, we know the query is fine, but the policies are wrong.
