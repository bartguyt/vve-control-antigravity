-- Add linking columns to Bank Transactions
-- And default category to Suppliers

-- 1. Add Foreign Keys to bank_transactions
DO $$
BEGIN
    -- Link to Assignments (Opdrachten)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'linked_assignment_id') THEN
        ALTER TABLE public.bank_transactions
        ADD COLUMN linked_assignment_id UUID REFERENCES public.assignments(id);
    END IF;

    -- Link to Documents (Facturen/Offertes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'linked_document_id') THEN
        ALTER TABLE public.bank_transactions
        ADD COLUMN linked_document_id UUID REFERENCES public.documents(id);
    END IF;
    
    -- Link to Suppliers (Leveranciers) directly (if no assignment exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'linked_supplier_id') THEN
        ALTER TABLE public.bank_transactions
        ADD COLUMN linked_supplier_id UUID REFERENCES public.suppliers(id);
    END IF;
END $$;

-- 2. Add Default Financial Category to Suppliers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'default_financial_category_id') THEN
        ALTER TABLE public.suppliers
        ADD COLUMN default_financial_category_id UUID REFERENCES public.financial_categories(id);
    END IF;
END $$;

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
