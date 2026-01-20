
-- Check for orphaned transactions (linked to non-existent members)
SELECT 
    COUNT(*) as orphaned_count,
    array_agg(linked_member_id) as orphaned_ids
FROM bank_transactions bt
LEFT JOIN profiles p ON bt.linked_member_id = p.id
WHERE bt.linked_member_id IS NOT NULL 
AND p.id IS NULL;

-- Cleanup script (commented out until verified)
-- UPDATE bank_transactions 
-- SET linked_member_id = NULL 
-- WHERE linked_member_id IS NOT NULL 
-- AND linked_member_id NOT IN (SELECT id FROM profiles);
