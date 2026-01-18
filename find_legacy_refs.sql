SELECT table_name, view_definition 
FROM information_schema.views 
WHERE view_definition ILIKE '%vve_memberships%';

SELECT proname, prosrc 
FROM pg_proc 
WHERE prosrc ILIKE '%vve_memberships%';
