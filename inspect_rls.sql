SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename IN ('association_memberships', 'profiles');

SELECT
    p.proname,
    p.prosrc,
    p.prosecdef,
    pg_get_function_arguments(p.oid) as arguments
FROM
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE
    n.nspname = 'public'
    AND p.proname IN ('get_my_association_ids', 'is_super_admin');
