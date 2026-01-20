
-- Check function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_my_association_ids';

-- Check RLS on association_memberships
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'association_memberships';
