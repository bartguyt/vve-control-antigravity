-- FORCE CLEANUP & FIX
-- We use NOT EXISTS to be safe against NULLs in the profiles table which breaks NOT IN checks.

-- 1. Hard Delete of the known offender (just to be sure)
DELETE FROM vve_memberships WHERE user_id = '827d3114-bc05-43d5-8b77-fefbcbb84a85';

-- 2. General Cleanup of all orphans
DELETE FROM vve_memberships m
WHERE NOT EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = m.user_id
);

-- 3. Ensure profiles.user_id is UNIQUE
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- 4. Add the Foreign Key
ALTER TABLE vve_memberships DROP CONSTRAINT IF EXISTS fk_memberships_profiles_userid;

ALTER TABLE vve_memberships 
ADD CONSTRAINT fk_memberships_profiles_userid 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- 5. Reload Schema
NOTIFY pgrst, 'reload';
