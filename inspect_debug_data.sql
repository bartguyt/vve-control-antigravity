-- Inspect Transaction and Payment Records (Simplified)
-- No joins to members table to avoid column errors

SELECT 
    t.id as transaction_id,
    t.description,
    t.amount,
    t.booking_date,
    t.linked_member_id,
    t.contribution_year_id,
    (SELECT count(*) FROM contribution_payment_records WHERE transaction_id = t.id) as payment_records_count
FROM bank_transactions t
WHERE t.amount = 264 OR t.amount = -264
LIMIT 5;
