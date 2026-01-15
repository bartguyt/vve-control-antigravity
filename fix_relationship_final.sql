-- FIX RELATIONSHIP & RELOAD SCHEMA

-- 1. Ensure profiles.user_id is UNIQUE (required for it to be a target of a FK)
-- It likely is, but let's be safe.
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
-- (This might fail if it already exists, which is fine)

-- 2. Add the SINGLE CORRECT Foreign Key
-- This tells PostgREST explicitly: "Memberships belong to Profiles via local user_id"
ALTER TABLE vve_memberships DROP CONSTRAINT IF EXISTS fk_memberships_profiles_userid;

ALTER TABLE vve_memberships 
ADD CONSTRAINT fk_memberships_profiles_userid 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- 3. FORCE POSTGREST SCHEMA RELOAD
-- This clears the "Ambiguous relationship" cache
NOTIFY pgrst, 'reload';
