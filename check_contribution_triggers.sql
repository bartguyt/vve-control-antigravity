-- Check if there's a trigger that auto-creates member_contributions
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('bank_transactions', 'member_contributions')
ORDER BY event_object_table, trigger_name;

-- Check if there's a function that handles this
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%contribution%'
ORDER BY routine_name;
