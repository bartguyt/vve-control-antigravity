-- Enable RLS on bank_connections
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view bank connections for their association" ON bank_connections;
DROP POLICY IF EXISTS "Users can insert bank connections for their association" ON bank_connections;
DROP POLICY IF EXISTS "Users can update bank connections for their association" ON bank_connections;
DROP POLICY IF EXISTS "Users can delete bank connections for their association" ON bank_connections;

-- Create comprehensive policies
-- 1. VIEW (SELECT)
CREATE POLICY "Users can view bank connections for their association"
ON bank_connections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM association_memberships
    WHERE association_memberships.association_id = bank_connections.association_id
    AND association_memberships.user_id = auth.uid()
  )
);

-- 2. INSERT
CREATE POLICY "Users can insert bank connections for their association"
ON bank_connections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM association_memberships
    WHERE association_memberships.association_id = bank_connections.association_id
    AND association_memberships.user_id = auth.uid()
  )
);

-- 3. UPDATE
CREATE POLICY "Users can update bank connections for their association"
ON bank_connections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM association_memberships
    WHERE association_memberships.association_id = bank_connections.association_id
    AND association_memberships.user_id = auth.uid()
  )
);

-- 4. DELETE
CREATE POLICY "Users can delete bank connections for their association"
ON bank_connections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM association_memberships
    WHERE association_memberships.association_id = bank_connections.association_id
    AND association_memberships.user_id = auth.uid()
  )
);

-- Also ensure bank_accounts and bank_transactions have similar policies if needed, 
-- but focusing on the reported error first.
