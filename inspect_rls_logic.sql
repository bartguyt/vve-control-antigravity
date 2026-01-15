-- Inspect is_super_admin function
SELECT pg_get_functiondef('public.is_super_admin'::regproc);

-- Inspect policies on profiles
SELECT polname, pg_get_expr(polqual, polrelid) as definition
FROM pg_policy
WHERE polrelid = 'profiles'::regclass;
