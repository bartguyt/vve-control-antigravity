-- Find where amounts are actually stored
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%amount%' 
OR table_name LIKE '%contribution%';

-- Check contribution_year_amounts schema if it exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contribution_year_amounts';
