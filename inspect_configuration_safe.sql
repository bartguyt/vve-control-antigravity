-- SAFE Configuration Inspection
-- Using SELECT * to avoid "column does not exist" errors

-- 1. Years (Check default_amount)
SELECT * FROM contribution_years;

-- 2. Groups
SELECT * FROM contribution_groups;

-- 3. Group Amounts
SELECT * FROM contribution_year_amounts;

-- 4. Assignments (Just first 5 to check structure)
SELECT * FROM member_group_assignments LIMIT 5;

-- 5. Member structure (limit 1 to see columns)
SELECT * FROM members LIMIT 1;
