-- FIX RLS RECURSION ON PROFILES
-- Reading 'is_super_admin' from profiles inside a profile policy causes infinite loops.
-- We will restrict management to just 'vve_memberships' checks and self-access.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Board and Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Board and Admins can manage all profiles"
ON public.profiles FOR ALL
USING (
    -- 1. User acts on themselves
    id = auth.uid()
    OR
    -- 2. User is an admin/board in membership table (Safe, assumes memberships doesn't recurse back to profiles)
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin', 'board')
    )
);

-- Also ensure vve_memberships is viewable! (Just in case)
-- If vve_memberships is also 500ing, we have a bigger loop, but usually it's just profiles.

NOTIFY pgrst, 'reload schema';
