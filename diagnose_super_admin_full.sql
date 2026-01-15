-- Comprehensive Super Admin Diagnostic
-- Run this in Supabase SQL Editor

-- 1. Check Auth User ID
SELECT id AS auth_id, email, last_sign_in_at 
FROM auth.users 
WHERE email = 'bartguyt@gmail.com' OR email = 'bart@guijt.nl';

-- 2. Check Profiles linked to this email
SELECT id AS profile_id, user_id, email, is_super_admin, created_at 
FROM profiles 
WHERE email = 'bartguyt@gmail.com' OR email = 'bart@guijt.nl';

-- 3. Check App Admins table
SELECT * FROM app_admins;

-- 4. Check Function Result (Simulating check for the user)
-- Note: We can't easily "impersonate" in a raw script without set_config, 
-- but we can check if the user_id exists in app_admins manually.
