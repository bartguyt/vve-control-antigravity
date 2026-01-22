-- Banking Data Persistence Schema
-- Run this in Supabase SQL Editor

-- 0. Clean up any partial tables from previous attempts
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;

-- 1. Create bank_accounts table
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID REFERENCES associations(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
    external_account_uid TEXT NOT NULL,  -- Enable Banking account UID
    name TEXT NOT NULL,
    iban TEXT,
    bic TEXT,
    currency TEXT DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(association_id, external_account_uid)
);

-- 2. Create bank_transactions table
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
    external_reference TEXT NOT NULL,  -- entry_reference from API
    booking_date DATE NOT NULL,
    value_date DATE,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    credit_debit TEXT CHECK (credit_debit IN ('CRDT', 'DBIT')),
    counterparty_name TEXT,
    counterparty_iban TEXT,
    description TEXT,
    status TEXT DEFAULT 'BOOK',
    raw_data JSONB,  -- Full API response for debugging
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bank_account_id, external_reference)  -- Prevent duplicates
);

-- 3. Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for bank_accounts
CREATE POLICY "Association members can view own bank accounts" ON bank_accounts
FOR SELECT USING (
    association_id IN (SELECT association_id FROM association_memberships WHERE user_id = auth.uid())
);

CREATE POLICY "Association admins can insert bank accounts" ON bank_accounts
FOR INSERT WITH CHECK (
    association_id IN (
        SELECT association_id FROM association_memberships 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'board')
    )
);

CREATE POLICY "Association admins can update bank accounts" ON bank_accounts
FOR UPDATE USING (
    association_id IN (
        SELECT association_id FROM association_memberships 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'board')
    )
);

-- 5. RLS Policies for bank_transactions
CREATE POLICY "Association members can view own transactions" ON bank_transactions
FOR SELECT USING (
    bank_account_id IN (
        SELECT ba.id FROM bank_accounts ba
        WHERE ba.association_id IN (SELECT association_id FROM association_memberships WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Service can insert transactions" ON bank_transactions
FOR INSERT WITH CHECK (true);

-- 6. Indexes for performance
CREATE INDEX idx_bank_accounts_association_id ON bank_accounts(association_id);
CREATE INDEX idx_bank_transactions_account_id ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_booking_date ON bank_transactions(booking_date);

-- 7. Updated_at trigger for bank_accounts
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Done!
SELECT 'Banking schema created successfully!' as status;
