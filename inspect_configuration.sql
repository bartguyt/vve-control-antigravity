-- Inspect Configuration Data for Contribution Logic (Fixed)

-- 1. Check Contribution Years
SELECT id as year_id, year, default_amount, base_rate_name FROM contribution_years;

-- 2. Check Contribution Groups and Amounts
SELECT 
    g.id as group_id, 
    g.name as group_name, 
    cya.year_id, 
    cya.amount 
FROM contribution_groups g
LEFT JOIN contribution_year_amounts cya ON g.id = cya.group_id;

-- 3. Check Financial Categories (specifically 'Ledenbijdrage')
SELECT id as category_id, name FROM financial_categories WHERE name ILIKE '%Ledenbijdrage%';

-- 4. Check Member Assignments (for the specific member from previous debug)
-- Replace with the member ID that was linked to the transaction
WITH target_member AS (
    SELECT id, email FROM members LIMIT 5
)
SELECT 
    tm.id as member_id, 
    tm.email, 
    mga.group_id 
FROM target_member tm
LEFT JOIN member_group_assignments mga ON tm.id = mga.member_id;

-- 5. Check the Transaction again to see what it links to
SELECT 
    t.id, 
    t.amount, 
    t.contribution_year_id, 
    t.linked_member_id,
    fc.name as category_name
FROM bank_transactions t
LEFT JOIN financial_categories fc ON t.financial_category_id = fc.id
WHERE t.amount = 264 OR t.amount = -264
LIMIT 1;
