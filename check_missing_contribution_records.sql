
-- 1. Identify the years for the IDs found in the JSON (Corrected: removed 'name' column)
SELECT id, year FROM contribution_years 
WHERE id IN ('1095a96a-cb18-4001-9ef2-9d829b60654d', '0e9fc3e3-e901-4358-a7eb-9ad3e6960043');

-- 2. Check if a member_contribution record exists for the members in the JSON for those years
-- Member 1 (from tx 1): b803cbbb-bc30-432e-a2f8-10ae5ad67a31
-- Member 2 (from tx 2,3): 50133fb1-b366-4d3f-8a27-83abf4986efa

SELECT * FROM member_contributions 
WHERE (member_id = 'b803cbbb-bc30-432e-a2f8-10ae5ad67a31' AND year_id = '1095a96a-cb18-4001-9ef2-9d829b60654d')
   OR (member_id = '50133fb1-b366-4d3f-8a27-83abf4986efa' AND year_id = '1095a96a-cb18-4001-9ef2-9d829b60654d')
   OR (member_id = '50133fb1-b366-4d3f-8a27-83abf4986efa' AND year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043');
