
-- Debug: Check if member_contributions exist for the year
-- Replace with your actual year ID
SELECT 
    mc.id,
    mc.member_id,
    p.first_name || ' ' || p.last_name as member_name,
    mc.amount_due,
    mc.amount_paid,
    mc.status,
    mc.group_id,
    cg.name as group_name,
    cg.monthly_amount as group_monthly_amount
FROM member_contributions mc
LEFT JOIN profiles p ON p.id = mc.member_id
LEFT JOIN contribution_groups cg ON cg.id = mc.group_id
WHERE mc.year_id = '1095a96a-cb18-4001-9ef2-9d829b60654d' -- Replace with actual year ID
ORDER BY member_name;

-- Check transactions for this year
SELECT 
    bt.id,
    bt.amount,
    bt.description,
    bt.linked_member_id,
    p.first_name || ' ' || p.last_name as member_name,
    bt.contribution_year_id
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
WHERE bt.contribution_year_id = '1095a96a-cb18-4001-9ef2-9d829b60654d'
AND bt.linked_member_id IS NOT NULL
ORDER BY member_name;
