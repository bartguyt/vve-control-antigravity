SELECT polname, pg_get_expr(polqual, polrelid) as definition
FROM pg_policy
WHERE polrelid = 'profiles'::regclass;
