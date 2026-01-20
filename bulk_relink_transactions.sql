-- BULK RE-LINK TRANSACTIONS TO BART GUIJT
-- Since all transactions are unlinked, we need to re-link them to valid members
-- This script links all 2026 transactions to Bart Guijt as a starting point
-- You can then manually adjust specific transactions if needed

-- First, verify Bart's profile_id
SELECT id, first_name, last_name, email 
FROM profiles 
WHERE email = 'bartguyt@gmail.com';

-- Expected result: 7c9a45d7-1e84-4301-a5b1-776c6e5f1556

-- Link all 2026 transactions to Bart (as a bulk operation)
UPDATE bank_transactions
SET linked_member_id = '7c9a45d7-1e84-4301-a5b1-776c6e5f1556'
WHERE contribution_year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043' -- 2026
AND linked_member_id IS NULL;

-- Verify the update
SELECT 
    COUNT(*) as total_linked,
    SUM(amount::numeric) as total_amount
FROM bank_transactions
WHERE contribution_year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043'
AND linked_member_id = '7c9a45d7-1e84-4301-a5b1-776c6e5f1556';

-- Show all linked transactions for verification
SELECT 
    bt.id,
    bt.amount,
    bt.description,
    p.first_name || ' ' || p.last_name as member_name,
    cy.year
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
WHERE bt.contribution_year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043'
AND bt.linked_member_id IS NOT NULL
ORDER BY bt.booking_date;
