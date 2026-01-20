
-- Cleanup Ghost Data (Member Contributions linked to non-existent profiles)

-- 1. Count orphans before delete
SELECT count(*) as "Orphaned Contributions Count"
FROM member_contributions
WHERE member_id NOT IN (SELECT id FROM profiles);

-- 2. Delete Orphaned Contributions
DELETE FROM member_contributions
WHERE member_id NOT IN (SELECT id FROM profiles);

-- 3. Cleanup Orphaned Transactions Links (just in case)
UPDATE bank_transactions
SET linked_member_id = NULL
WHERE linked_member_id IS NOT NULL 
AND linked_member_id NOT IN (SELECT id FROM profiles);

-- Verification
SELECT count(*) as "Remaining Orphans"
FROM member_contributions
WHERE member_id NOT IN (SELECT id FROM profiles);
