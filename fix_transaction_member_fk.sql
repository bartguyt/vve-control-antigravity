-- Inspect current constraints (for verification, though we know the name)
-- We will just drop and recreate correctly to be sure.

-- Drop the incorrect constraint
ALTER TABLE bank_transactions
DROP CONSTRAINT IF EXISTS bank_transactions_linked_member_id_fkey;

-- Add the correct constraint pointing to 'members' table
-- Assuming 'members' table has primary key 'id'
ALTER TABLE bank_transactions
ADD CONSTRAINT bank_transactions_linked_member_id_fkey
FOREIGN KEY (linked_member_id)
REFERENCES members(id)
ON DELETE SET NULL; -- If member is deleted, keep transaction but unlink
