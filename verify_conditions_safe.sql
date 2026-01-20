-- Verify Linking Conditions (Safe)
-- Removed reference to m.first_name/last_name as columns might differ
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
    lt.linked_member_id,
    lt.actual_sum,
    CASE WHEN mc.id IS NULL THEN 'MISSING RECORD' ELSE 'OK' END as record_status,
    mc.amount_paid as stored_amount,
    mc.amount_due as target_amount,
    lt.contribution_year_id
FROM linked_transactions lt
LEFT JOIN member_contributions mc 
    ON lt.linked_member_id = mc.member_id 
    AND lt.contribution_year_id = mc.year_id;
