-- Add payment_month column to bank_transactions for monthly tracking
ALTER TABLE bank_transactions 
ADD COLUMN IF NOT EXISTS payment_month INTEGER CHECK (payment_month >= 1 AND payment_month <= 12);

COMMENT ON COLUMN bank_transactions.payment_month IS 
'Month (1-12) when payment was made, extracted from description or booking_date';

-- Update existing Ledenbijdrage transactions with payment_month from booking_date
UPDATE bank_transactions
SET payment_month = EXTRACT(MONTH FROM booking_date::date)::integer
WHERE financial_category_id IN (
    SELECT id FROM financial_categories WHERE name ILIKE 'Ledenbijdrage'
)
AND payment_month IS NULL;
