-- Banking Schema Enhancement Migration
-- Adds association_id to bank_connections and enhances transaction schema
-- for the new hexagonal architecture banking module

-- 1. Add association_id to bank_connections (if table exists)
-- This fixes the bug where sync_transactions gets the wrong connection
ALTER TABLE bank_connections
ADD COLUMN IF NOT EXISTS association_id UUID REFERENCES associations(id) ON DELETE CASCADE;

-- 2. Add updated_at to bank_connections
ALTER TABLE bank_connections
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Add account_type and balance columns to bank_accounts
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'CHECKING';

ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2);

ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS balance_date TIMESTAMPTZ;

-- 4. Add updated_at to bank_accounts (for the trigger)
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. Enhance bank_transactions with categorization and linking columns
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS linked_entity_type TEXT CHECK (
    linked_entity_type IS NULL OR
    linked_entity_type IN ('member', 'supplier', 'assignment')
);

ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS linked_entity_id UUID;

ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. Create index on association_id for bank_connections
CREATE INDEX IF NOT EXISTS idx_bank_connections_association_id
ON bank_connections(association_id);

-- 7. Create index on linked_entity for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_bank_transactions_linked
ON bank_transactions(linked_entity_type, linked_entity_id)
WHERE linked_entity_id IS NOT NULL;

-- 8. Create index on category
CREATE INDEX IF NOT EXISTS idx_bank_transactions_category
ON bank_transactions(category)
WHERE category IS NOT NULL;

-- 9. Update existing connections to link to an association
-- This is a one-time fix: for existing data, we try to infer association from accounts
UPDATE bank_connections bc
SET association_id = (
    SELECT ba.association_id
    FROM bank_accounts ba
    WHERE ba.connection_id = bc.id
    LIMIT 1
)
WHERE bc.association_id IS NULL;

-- 10. Updated_at trigger for bank_connections
CREATE OR REPLACE FUNCTION update_bank_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bank_connections_updated_at ON bank_connections;
CREATE TRIGGER set_bank_connections_updated_at
    BEFORE UPDATE ON bank_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_connections_updated_at();

-- 11. Updated_at trigger for bank_transactions
CREATE OR REPLACE FUNCTION update_bank_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER set_bank_transactions_updated_at
    BEFORE UPDATE ON bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_transactions_updated_at();

-- 12. RLS policy for bank_connections (members can view own associations' connections)
DROP POLICY IF EXISTS "Association members can view own bank connections" ON bank_connections;
CREATE POLICY "Association members can view own bank connections" ON bank_connections
FOR SELECT USING (
    association_id IN (
        SELECT association_id FROM association_memberships WHERE user_id = auth.uid()
    )
);

-- 13. RLS policy for inserting bank_connections (admin/board only)
DROP POLICY IF EXISTS "Association admins can insert bank connections" ON bank_connections;
CREATE POLICY "Association admins can insert bank connections" ON bank_connections
FOR INSERT WITH CHECK (
    association_id IN (
        SELECT association_id FROM association_memberships
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'board')
    )
);

-- 14. RLS policy for updating bank_connections (admin/board only)
DROP POLICY IF EXISTS "Association admins can update bank connections" ON bank_connections;
CREATE POLICY "Association admins can update bank connections" ON bank_connections
FOR UPDATE USING (
    association_id IN (
        SELECT association_id FROM association_memberships
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'board')
    )
);

-- Done!
SELECT 'Banking schema enhanced successfully!' as status;
