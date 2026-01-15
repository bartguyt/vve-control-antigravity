-- FIX ORPHANS & RELATIONSHIP
-- We found memberships pointing to non-existent profiles. We must delete them first.

-- 1. Delete orphan memberships (Safety Cleanup)
DELETE FROM vve_memberships 
WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- 2. Ensure profiles.user_id is UNIQUE (required for FK target)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- 3. Add the SINGLE CORRECT Foreign Key
ALTER TABLE vve_memberships DROP CONSTRAINT IF EXISTS fk_memberships_profiles_userid;

ALTER TABLE vve_memberships 
ADD CONSTRAINT fk_memberships_profiles_userid 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- 4. FORCE POSTGREST SCHEMA RELOAD
NOTIFY pgrst, 'reload';
