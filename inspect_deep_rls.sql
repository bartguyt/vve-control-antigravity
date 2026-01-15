-- Deep Inspection of Dependencies

-- 1. Check vve_memberships Policies (Potential recursion source)
SELECT polname, pg_get_expr(polqual, polrelid) as definition
FROM pg_policy
WHERE polrelid = 'vve_memberships'::regclass;

-- 2. Check app_admins Policies & Grants
SELECT polname, pg_get_expr(polqual, polrelid) as definition
FROM pg_policy
WHERE polrelid = 'app_admins'::regclass;

-- 3. Check is_super_admin definition to ensure it was updated
SELECT pg_get_functiondef('public.is_super_admin'::regproc);

-- 4. Check if app_admins has RLS enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'app_admins';
