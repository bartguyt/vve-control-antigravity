-- Status Check
-- 1. Profile
SELECT id, user_id, email, is_super_admin 
FROM profiles 
WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';

-- 2. Memberships
SELECT * 
FROM vve_memberships 
WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';

-- 3. App Admins
SELECT * 
FROM app_admins 
WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';

-- 4. VvEs check
SELECT count(*) as vve_count FROM vves;
