-- Add contribution_year_id to bank_transactions to allow manual year override
ALTER TABLE public.bank_transactions
ADD COLUMN contribution_year_id UUID REFERENCES public.contribution_years(id);

-- Add index for performance
CREATE INDEX idx_bank_transactions_contribution_year_id ON public.bank_transactions(contribution_year_id);
