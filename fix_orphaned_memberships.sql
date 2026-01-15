-- FIX ORPHANED MEMBERSHIPS AND APPLY FK
-- The error 23503 indicates that some memberships point to users who don't have a profile.
-- We must clean these up before we can verify the link.

-- 1. Delete orphaned memberships (user_id not in profiles)
DELETE FROM public.vve_memberships
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- 2. Now try to add the constraint again
DO $$
BEGIN
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
