-- Restore Super Admin Access
-- This script ensures your user is in the app_admins table, which is the source of truth for Super Admin status.

-- 1. Ensure your user is in the app_admins table (Replace 'YOUR_EMAIL' if needed)
INSERT INTO app_admins (user_id)
SELECT id FROM auth.users WHERE email = 'bart@guijt.nl' -- HARDCODED for convenience, change if needed
ON CONFLICT (user_id) DO NOTHING;

-- 2. Also ensure the profile flag is set (for UI consistency in some places)
UPDATE profiles
SET is_super_admin = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'bart@guijt.nl');

-- 3. Double check the function
SELECT is_super_admin(); 
