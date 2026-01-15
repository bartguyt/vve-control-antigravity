-- FIX RELATIONSHIP: PROFILES -> VVE_MEMBERSHIPS
-- The PostgREST API (Supabase) returns 400 Bad Request because it cannot find a relationship
-- between 'profiles' and 'vve_memberships'.
-- Currently, vve_memberships references auth.users, but not 'profiles'.
-- We add an explicit FK to 'profiles' to enable the embedding.

DO $$
BEGIN
    -- Check if constraint exists effectively (naming convention usually)
    -- Or just try to add it.
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_memberships_profiles' 
        AND table_name = 'vve_memberships'
    ) THEN
        ALTER TABLE public.vve_memberships
        ADD CONSTRAINT fk_memberships_profiles
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;
