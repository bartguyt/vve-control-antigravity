-- 1. Ensure Profile Exists for YOUR specific user
-- (Hardcoded ID from logs to ensure it works in SQL Editor without active session)
DO $$
DECLARE
    target_user_id UUID := '3efbb432-a923-446b-896e-3866fb9718b6';
    target_vve_id UUID;
BEGIN
    -- A. Insert Profile if missing
    INSERT INTO profiles (id, first_name, last_name, email)
    VALUES (
        target_user_id, 
        'Mijn', 
        'Profiel', 
        'user@example.com' -- Fallback email, update if known
    )
    ON CONFLICT (id) DO NOTHING;

    -- B. Ensure a VvE exists
    IF NOT EXISTS (SELECT 1 FROM vves) THEN
        INSERT INTO vves (id, name) VALUES (uuid_generate_v4(), 'Mijn VvE');
    END IF;

    SELECT id INTO target_vve_id FROM vves LIMIT 1;

    -- C. Link Profile to VvE
    UPDATE profiles 
    SET vve_id = target_vve_id
    WHERE id = target_user_id 
    AND vve_id IS NULL;

    -- D. Ensure Membership exists
    IF NOT EXISTS (SELECT 1 FROM vve_memberships WHERE user_id = target_user_id) THEN
        INSERT INTO vve_memberships (user_id, vve_id, role)
        VALUES (target_user_id, target_vve_id, 'admin');
    END IF;

    -- E. Ensure Sys Admin Role (Removed as user_roles table does not exist)
    -- The vve_memberships 'admin' role above is sufficient for VvE access.
    -- If app_roles or other tables are needed, they can be added later.
END $$;
