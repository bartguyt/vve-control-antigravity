-- FIX MISSING PROFILES
-- The 406 error indicates no row was found.
-- This likely means the user exists in Auth, but has no record in 'public.profiles'.

-- 1. Insert missing profiles for any user in auth.users
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
    id, 
    email, 
    'lid'::app_role, -- Default role
    now(), 
    now()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Verify results
SELECT count(*) as fixed_profiles 
FROM public.profiles 
WHERE created_at > (now() - interval '1 minute');
