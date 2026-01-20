-- Enable RLS on all tables
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- BANK CONNECTIONS
DROP POLICY IF EXISTS "Users can view bank connections for their association" ON bank_connections;
DROP POLICY IF EXISTS "Users can insert bank connections for their association" ON bank_connections;
DROP POLICY IF EXISTS "Users can update bank connections for their association" ON bank_connections;
DROP POLICY IF EXISTS "Users can delete bank connections for their association" ON bank_connections;

CREATE POLICY "Users can view bank connections for their association"
ON bank_connections FOR SELECT USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_connections.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert bank connections for their association"
ON bank_connections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_connections.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update bank connections for their association"
ON bank_connections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_connections.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete bank connections for their association"
ON bank_connections FOR DELETE USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_connections.association_id AND user_id = auth.uid())
);

-- BANK ACCOUNTS
DROP POLICY IF EXISTS "Users can view bank accounts for their association" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert bank accounts for their association" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update bank accounts for their association" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete bank accounts for their association" ON bank_accounts;

CREATE POLICY "Users can view bank accounts for their association"
ON bank_accounts FOR SELECT USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_accounts.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert bank accounts for their association"
ON bank_accounts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_accounts.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update bank accounts for their association"
ON bank_accounts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_accounts.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete bank accounts for their association"
ON bank_accounts FOR DELETE USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_accounts.association_id AND user_id = auth.uid())
);

-- BANK TRANSACTIONS
DROP POLICY IF EXISTS "Users can view bank transactions for their association" ON bank_transactions;
DROP POLICY IF EXISTS "Users can insert bank transactions for their association" ON bank_transactions;
DROP POLICY IF EXISTS "Users can update bank transactions for their association" ON bank_transactions;
DROP POLICY IF EXISTS "Users can delete bank transactions for their association" ON bank_transactions;

CREATE POLICY "Users can view bank transactions for their association"
ON bank_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_transactions.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert bank transactions for their association"
ON bank_transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_transactions.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update bank transactions for their association"
ON bank_transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_transactions.association_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete bank transactions for their association"
ON bank_transactions FOR DELETE USING (
  EXISTS (SELECT 1 FROM association_memberships WHERE association_id = bank_transactions.association_id AND user_id = auth.uid())
);
