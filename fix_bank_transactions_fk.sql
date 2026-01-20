-- Fix bank_transactions foreign key: should reference profiles, not members
-- Current (wrong): bank_transactions.linked_member_id -> members.id
-- Correct: bank_transactions.linked_member_id -> profiles.id

-- Step 1: Drop the incorrect foreign key constraint
ALTER TABLE bank_transactions
DROP CONSTRAINT IF EXISTS bank_transactions_linked_member_id_fkey;

-- Step 2: Add the correct foreign key constraint to profiles table
ALTER TABLE bank_transactions
ADD CONSTRAINT bank_transactions_linked_member_id_fkey 
FOREIGN KEY (linked_member_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Step 3: Verify the constraint
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
