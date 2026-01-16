-- migration: add_transaction_category.sql
-- Adds a category column to bank_transactions to allow better reconciliation logic.

ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add a comment for clarity
COMMENT ON COLUMN public.bank_transactions.category IS 'Category of the transaction, e.g., "ledenbijdrage", "boete", "overig".';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
