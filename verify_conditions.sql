-- Verify Linking Conditions
-- 1. List transactions linked to members & years
-- 2. Check if a corresponding member_contribution record exists
-- 3. Compare Transaction Sum vs Stored Amount

WITH linked_transactions AS (
    SELECT 
        bt.linked_member_id,
        bt.contribution_year_id,
        SUM(bt.amount) as actual_sum
    FROM bank_transactions bt
    LEFT JOIN financial_categories fc ON bt.financial_category_id = fc.id
    WHERE 
        bt.linked_member_id IS NOT NULL 
        AND bt.contribution_year_id IS NOT NULL
        AND fc.name ILIKE '%Ledenbijdrage%'
    GROUP BY bt.linked_member_id, bt.contribution_year_id
)
SELECT 
    m.first_name,
    m.last_name,
    lt.actual_sum,
    CASE WHEN mc.id IS NULL THEN 'MISSING RECORD' ELSE 'OK' END as record_status,
    mc.amount_paid as stored_amount,
    mc.amount_due as target_amount,
    lt.contribution_year_id
FROM linked_transactions lt
JOIN members m ON lt.linked_member_id = m.id
LEFT JOIN member_contributions mc 
    ON lt.linked_member_id = mc.member_id 
    AND lt.contribution_year_id = mc.year_id;
