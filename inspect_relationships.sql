SELECT 
    conname, 
    conrelid::regclass as table_name, 
    confrelid::regclass as foreign_table_name, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE 
    (conrelid = 'vve_memberships'::regclass AND confrelid = 'profiles'::regclass)
    OR 
    (conrelid = 'profiles'::regclass AND confrelid = 'vve_memberships'::regclass);
