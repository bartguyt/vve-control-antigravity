-- Repair Relationships & Restore Access
-- 1. Drop the incorrect constraint that linked user_id to profile.id
ALTER TABLE vve_memberships 
DROP CONSTRAINT IF EXISTS fk_memberships_profiles;

-- 2. Add a CORRECT constraint? 
-- Actually, vve_memberships.user_id references auth.users.id.
-- profiles.user_id references auth.users.id.
-- To allow embedding, Supabase typically detects the common parent or we can add a FK to profiles.user_id
-- BUT for now, let's just allow the data to exist.

-- 3. Restore Membership for the user
-- We need to find a VvE to add them to. 
-- If no VvE exists, create one (or just assign to the first one found).
DO $$
DECLARE
    target_vve_id UUID;
    target_user_id UUID := '3efbb432-a923-446b-896e-3866fb9718b6'; -- The User ID we know
BEGIN
    -- Get a VvE id
    SELECT id INTO target_vve_id FROM vves LIMIT 1;
    
    IF target_vve_id IS NOT NULL THEN
        -- Insert Membership
        INSERT INTO vve_memberships (user_id, vve_id, role)
        VALUES (target_user_id, target_vve_id, 'admin')
        ON CONFLICT (user_id, vve_id) DO UPDATE SET role = 'admin';
    END IF;
END $$;

-- 4. Re-verify Super Admin status just in case
UPDATE profiles
SET is_super_admin = true
WHERE user_id = '3efbb432-a923-446b-896e-3866fb9718b6';

INSERT INTO app_admins (user_id)
VALUES ('3efbb432-a923-446b-896e-3866fb9718b6')
ON CONFLICT (user_id) DO NOTHING;
