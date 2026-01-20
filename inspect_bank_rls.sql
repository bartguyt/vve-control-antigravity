
-- Inspect RLS Policies on bank_transactions
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'bank_transactions';
