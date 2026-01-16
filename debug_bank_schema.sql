-- Inspect if column exists and what the column definition is
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'bank_transactions';

-- Check RLS policies for bank_transactions
SELECT * FROM pg_policies WHERE tablename = 'bank_transactions';
