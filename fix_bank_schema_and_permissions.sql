-- Fix Bank Transactions Schema and Permissions

-- 1. Add missing contribution_year_id column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'contribution_year_id') THEN
        ALTER TABLE public.bank_transactions
        ADD COLUMN contribution_year_id UUID REFERENCES public.contribution_years(id);
    END IF;
END $$;

-- 2. Update RLS Policy to allow Bestuur and Admin to edit
-- First drop possible old/restrictive policies
DROP POLICY IF EXISTS "Admins can manage bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Board and Admins can manage bank transactions" ON public.bank_transactions;

-- Re-create with correct Dutch roles (admin + bestuur)
CREATE POLICY "Board and Admins can manage bank transactions" ON public.bank_transactions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.vve_id = bank_transactions.vve_id
        AND profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'bestuur')
    )
);

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
