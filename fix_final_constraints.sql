-- FIX FINAL CONSTRAINTS & RESTORE ACCESS
-- The user_id in vve_memberships refers to auth.users(id), NOT profiles(id).
-- These constraints are incorrect and must be removed to allow the valid user (whose profile id != auth id) to join.

ALTER TABLE vve_memberships DROP CONSTRAINT IF EXISTS fk_memberships_profiles;
ALTER TABLE vve_memberships DROP CONSTRAINT IF EXISTS vve_memberships_user_id_profile_fkey;

-- Now we can safely restore the membership for your account
DO $$
DECLARE
    target_vve_id UUID;
    target_user_id UUID := '3efbb432-a923-446b-896e-3866fb9718b6'; -- Your Auth ID
BEGIN
    SELECT id INTO target_vve_id FROM vves LIMIT 1;
    
    IF target_vve_id IS NOT NULL THEN
        INSERT INTO vve_memberships (user_id, vve_id, role)
        VALUES (target_user_id, target_vve_id, 'admin')
        ON CONFLICT (user_id, vve_id) DO UPDATE SET role = 'admin';
    END IF;
END $$;

-- Verify Super Admin one last time
UPDATE profiles SET is_super_admin = true WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';
INSERT INTO app_admins (user_id) VALUES ('3efbb432-a923-446b-896e-3866fb9718b6') ON CONFLICT (user_id) DO NOTHING;
