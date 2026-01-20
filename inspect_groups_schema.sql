-- Check the actual schema of contribution_groups
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contribution_groups';
