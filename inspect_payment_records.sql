
-- Inspect contribution_payment_records schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contribution_payment_records';

-- Check if we have records linked to our recent debug transactions
SELECT count(*) as "Total Payment Records" FROM contribution_payment_records;
