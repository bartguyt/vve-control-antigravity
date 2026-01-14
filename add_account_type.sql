-- Add account_type column to bank_accounts
ALTER TABLE public.bank_accounts 
ADD COLUMN account_type TEXT DEFAULT 'PAYMENT'; -- 'PAYMENT' or 'SAVINGS'

-- Optional: You could make it an ENUM, but TEXT is flexible for now.
