-- Create contribution_payment_records table for tracking individual month payments
CREATE TABLE IF NOT EXISTS contribution_payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
    
    -- Link to transaction
    transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
    
    -- Link to member & year
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    contribution_year_id UUID NOT NULL REFERENCES contribution_years(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_month INTEGER CHECK (payment_month >= 1 AND payment_month <= 12),
    amount DECIMAL(10,2) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one transaction can only have one record per month
    UNIQUE(transaction_id, payment_month)
);

-- Add indexes for performance
CREATE INDEX idx_payment_records_member_year ON contribution_payment_records(member_id, contribution_year_id);
CREATE INDEX idx_payment_records_transaction ON contribution_payment_records(transaction_id);
CREATE INDEX idx_payment_records_association ON contribution_payment_records(association_id);

-- Add comments
COMMENT ON TABLE contribution_payment_records IS 'Tracks individual month payments from bank transactions, allowing one transaction to cover multiple months';
COMMENT ON COLUMN contribution_payment_records.payment_month IS 'Month (1-12) when payment was made, or NULL for overflow/unassigned amounts';
COMMENT ON COLUMN contribution_payment_records.amount IS 'Amount allocated to this specific month or overflow amount';

-- RLS Policies
ALTER TABLE contribution_payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment records for their association"
    ON contribution_payment_records FOR SELECT
    USING (
        association_id IN (
            SELECT association_id 
            FROM members 
            WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage payment records for their association"
    ON contribution_payment_records FOR ALL
    USING (
        association_id IN (
            SELECT association_id 
            FROM members 
            WHERE profile_id = auth.uid()
        )
    );

