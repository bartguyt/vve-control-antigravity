-- Simulate User Query with RLS
-- We set the config to impersonate the user '3efbb...' 
-- This mimics exactly what the API does.

BEGIN;
  -- 1. Switch to authenticated role
  SET LOCAL role TO authenticated;

  -- 2. Set the User ID (claim.sub)
  SELECT set_config('request.jwt.claim.sub', '3efbb432-a923-446b-896e-3866fb9718b6', true);

  -- 3. Run the query exactly as the app does
  -- (We can't do the full embedding in raw SQL easily without JSON magic, 
  -- but we can check the main table access first)
  
  PRINT '--- PROFILES CHECK ---';
  SELECT id, user_id, email, is_super_admin 
  FROM profiles 
  WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';

  PRINT '--- MEMBERSHIPS CHECK ---';
  SELECT * 
  FROM vve_memberships 
  WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';

ROLLBACK;
