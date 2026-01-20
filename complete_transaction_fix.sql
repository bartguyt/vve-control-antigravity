-- COMPLETE FIX: Clean orphans, fix FK, then bulk relink
-- This script does everything in the correct order

-- Step 1: First, set ALL orphaned linked_member_id to NULL
-- (Any linked_member_id that doesn't exist in profiles table)
UPDATE bank_transactions
SET linked_member_id = NULL
WHERE linked_member_id IS NOT NULL
AND linked_member_id NOT IN (SELECT id FROM profiles);

-- Verify cleanup
SELECT COUNT(*) as orphaned_links_cleaned
FROM bank_transactions
WHERE linked_member_id IS NULL;

-- Step 2: Drop the incorrect foreign key constraint
ALTER TABLE bank_transactions
DROP CONSTRAINT IF EXISTS bank_transactions_linked_member_id_fkey;

-- Step 3: Add the correct foreign key constraint to profiles table
ALTER TABLE bank_transactions
ADD CONSTRAINT bank_transactions_linked_member_id_fkey 
FOREIGN KEY (linked_member_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Step 4: Verify the new constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'bank_transactions'
AND kcu.column_name = 'linked_member_id';

-- Step 5: Now bulk link all 2026 transactions to Bart
UPDATE bank_transactions
SET linked_member_id = '7c9a45d7-1e84-4301-a5b1-776c6e5f1556'
WHERE contribution_year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043' -- 2026
AND linked_member_id IS NULL;

-- Step 6: Verify the bulk link
SELECT 
    COUNT(*) as total_linked_to_bart,
    SUM(amount::numeric) as total_amount
FROM bank_transactions
WHERE contribution_year_id = '0e9fc3e3-e901-4358-a7eb-9ad3e6960043'
AND linked_member_id = '7c9a45d7-1e84-4301-a5b1-776c6e5f1556';

-- Step 7: Show sample linked transactions
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
ORDER BY bt.booking_date
LIMIT 10;
