-- Check which ID the UI is trying to use for transaction 76b8abfa-f368-404e-97c1-8cf36e9c043e
SELECT 
    bt.id,
    bt.description,
    bt.linked_member_id,
    bt.amount,
    CASE 
        WHEN p.id IS NULL THEN '❌ INVALID - Profile does not exist'
        ELSE '✅ Valid profile: ' || p.first_name || ' ' || p.last_name
    END as profile_status
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
WHERE bt.id = '76b8abfa-f368-404e-97c1-8cf36e9c043e';

-- Show all available profiles to link to
SELECT 
    id as profile_id,
    first_name || ' ' || last_name as name,
    email
FROM profiles
ORDER BY first_name;
