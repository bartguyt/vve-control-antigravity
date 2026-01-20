-- Fix orphaned transaction: Unlink transaction from deleted profile
-- This transaction (€22, year 2026) is linked to profile b803cbbb-bc30-432e-a2f8-10ae5ad67a31 which no longer exists

UPDATE bank_transactions
SET linked_member_id = NULL
WHERE id = '288691e1-a5c5-4a7c-a367-4e7a486fec5b'
AND linked_member_id = 'b803cbbb-bc30-432e-a2f8-10ae5ad67a31';

-- Verify the unlink
SELECT 
    id,
    amount,
    description,
    linked_member_id,
    contribution_year_id
FROM bank_transactions
WHERE id = '288691e1-a5c5-4a7c-a367-4e7a486fec5b';
