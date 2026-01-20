-- Enable RLS
ALTER TABLE contribution_payment_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "view_payment_records" ON contribution_payment_records;
DROP POLICY IF EXISTS "insert_payment_records" ON contribution_payment_records;
DROP POLICY IF EXISTS "update_payment_records" ON contribution_payment_records;
DROP POLICY IF EXISTS "delete_payment_records" ON contribution_payment_records;

-- View Policy
CREATE POLICY "view_payment_records"
ON contribution_payment_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bank_transactions 
    WHERE bank_transactions.id = contribution_payment_records.transaction_id
    AND bank_transactions.association_id IN (
      SELECT association_id FROM association_memberships 
      WHERE user_id = auth.uid()
    )
  )
);

-- Insert Policy
CREATE POLICY "insert_payment_records"
ON contribution_payment_records FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bank_transactions 
    WHERE bank_transactions.id = contribution_payment_records.transaction_id
    AND bank_transactions.association_id IN (
      SELECT association_id FROM association_memberships 
      WHERE user_id = auth.uid()
    )
  )
);

-- Update Policy
CREATE POLICY "update_payment_records"
ON contribution_payment_records FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bank_transactions 
    WHERE bank_transactions.id = contribution_payment_records.transaction_id
    AND bank_transactions.association_id IN (
      SELECT association_id FROM association_memberships 
      WHERE user_id = auth.uid()
    )
  )
);

-- Delete Policy
CREATE POLICY "delete_payment_records"
ON contribution_payment_records FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bank_transactions 
    WHERE bank_transactions.id = contribution_payment_records.transaction_id
    AND bank_transactions.association_id IN (
      SELECT association_id FROM association_memberships 
      WHERE user_id = auth.uid()
    )
  )
);
