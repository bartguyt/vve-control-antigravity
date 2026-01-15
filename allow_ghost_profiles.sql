-- ENABLE GHOST USERS
-- We drop the constraint that forces every profile to have a matching auth.user.
-- This allows us to create "Ghost Profiles" for members (or seed data) that haven't signed up yet.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- We still want uniqueness on user_id inside profiles (already exists, but good to ensure)
-- ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
