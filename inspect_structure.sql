-- Inspect member_contributions definition and triggers
SELECT 
    table_name, 
    view_definition 
FROM information_schema.views 
WHERE table_name = 'member_contributions';

-- Check if it is a base table
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_name = 'member_contributions';

-- Check triggers on contribution_payment_records
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'contribution_payment_records';
