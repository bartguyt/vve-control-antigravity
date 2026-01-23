-- Add missing transaction fields that BankAccountPage expects

-- Add creditor and debtor fields (more specific than generic counterparty)
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS creditor_name TEXT,
ADD COLUMN IF NOT EXISTS debtor_name TEXT,
ADD COLUMN IF NOT EXISTS creditor_iban TEXT,
ADD COLUMN IF NOT EXISTS debtor_iban TEXT;

-- Add association_id for direct filtering (avoids join through bank_accounts)
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS association_id UUID REFERENCES associations(id);

-- Add financial categorization fields
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS financial_category_id UUID REFERENCES financial_categories(id),
ADD COLUMN IF NOT EXISTS contribution_year_id UUID REFERENCES contribution_years(id);

-- Add linked member field
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS linked_member_id UUID REFERENCES profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_association_id ON bank_transactions(association_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_financial_category_id ON bank_transactions(financial_category_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_linked_member_id ON bank_transactions(linked_member_id);

COMMENT ON COLUMN bank_transactions.creditor_name IS 'Name of the creditor (for CRDT transactions)';
COMMENT ON COLUMN bank_transactions.debtor_name IS 'Name of the debtor (for DBIT transactions)';
COMMENT ON COLUMN bank_transactions.association_id IS 'Direct reference to association for easier querying';
