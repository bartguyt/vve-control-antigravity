-- Check how many transactions each member should have for 2026
-- This helps distribute the transactions correctly

WITH transaction_summary AS (
    SELECT 
        COUNT(*) as total_transactions,
        SUM(amount::numeric) as total_amount,
        COUNT(*) / 5 as per_member_count  -- 5 members
    FROM bank_transactions
    WHERE contribution_year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043'
)
SELECT * FROM transaction_summary;

-- Show all members who should receive transactions
SELECT 
    p.id,
    p.first_name || ' ' || p.last_name as member_name,
    p.email
FROM profiles p
WHERE p.id IN (
    SELECT DISTINCT mc.member_id 
    FROM member_contributions mc
    WHERE mc.year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043'
)
ORDER BY p.first_name;

-- Current distribution (all to Bart)
SELECT 
    p.first_name || ' ' || p.last_name as member_name,
    COUNT(*) as transaction_count,
    SUM(bt.amount::numeric) as total_amount
FROM bank_transactions bt
JOIN profiles p ON p.id = bt.linked_member_id
WHERE bt.contribution_year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043'
GROUP BY p.id, p.first_name, p.last_name;
