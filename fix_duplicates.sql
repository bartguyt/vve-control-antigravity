-- Fix Duplicates
-- 1. Identify valid profile (ID starts with 7c9a...)
-- 2. Identify ghost profile (ID starts with 3efbb... which matches auth user id, but has NULL user_id column)

-- Delete the ghost profile
DELETE FROM profiles 
WHERE id = '3efbb432-a923-446b-896e-3866fb9718b6';

-- Verify valid profile has is_super_admin = true
UPDATE profiles
SET is_super_admin = true
WHERE id = '7c9a45d7-1e84-4301-a5b1-776c6e5f1556';

-- Ensure app_admins has the correct user_id (which is 3efbb..., the Auth ID)
INSERT INTO app_admins (user_id)
VALUES ('3efbb432-a923-446b-896e-3866fb9718b6')
ON CONFLICT (user_id) DO NOTHING;
