-- Verify Data Model for Linked Transactions (Fixed)
-- Using created_at for sorting as updated_at might be missing

WITH target_tx AS (
    SELECT * FROM bank_transactions 
    WHERE linked_member_id IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 5
)
SELECT 
    tx.description,
    tx.amount,
    tx.booking_date,
    fc.name as category,
    tx.contribution_year_id,
    -- Check 2: Are there payment records?
    (SELECT count(*) FROM contribution_payment_records WHERE transaction_id = tx.id) as records_count,
    -- Check 3: Is the Member Contribution Total updated?
    mc.amount_paid as total_paid_on_member_card,
    mc.status as member_status,
    mc.amount_due as expected_amount
FROM target_tx tx
LEFT JOIN financial_categories fc ON tx.financial_category_id = fc.id
LEFT JOIN member_contributions mc ON 
    mc.member_id = tx.linked_member_id AND 
    mc.year_id = tx.contribution_year_id;
