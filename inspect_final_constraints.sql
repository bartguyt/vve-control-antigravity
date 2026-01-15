SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE c.conrelid = 'vve_memberships'::regclass
AND n.nspname = 'public';
