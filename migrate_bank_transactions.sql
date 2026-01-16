-- Migration: Link Bank Transactions to Financial Categories

-- 1. Add column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'financial_category_id') THEN
        ALTER TABLE public.bank_transactions
        ADD COLUMN financial_category_id UUID REFERENCES public.financial_categories(id);
    END IF;
END $$;

-- 2. Create missing categories for existing VvEs
-- 'Boete' -> 9003 Boeterente
INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
SELECT l.vve_id, 'Boete', l.id 
FROM public.ledger_accounts l
WHERE l.code = 9003 
AND NOT EXISTS (
    SELECT 1 FROM public.financial_categories fc WHERE fc.vve_id = l.vve_id AND fc.name = 'Boete'
);

-- 'Diversen' (was 'overig') -> 4900 Diversen
INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
SELECT l.vve_id, 'Diversen', l.id 
FROM public.ledger_accounts l
WHERE l.code = 4900 
AND NOT EXISTS (
    SELECT 1 FROM public.financial_categories fc WHERE fc.vve_id = l.vve_id AND fc.name = 'Diversen'
);

-- 'Eenmalige bijdrage' -> 8000 Opbrengst ledenbijdragen
INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
SELECT l.vve_id, 'Eenmalige bijdrage', l.id 
FROM public.ledger_accounts l
WHERE l.code = 8000 
AND NOT EXISTS (
    SELECT 1 FROM public.financial_categories fc WHERE fc.vve_id = l.vve_id AND fc.name = 'Eenmalige bijdrage'
);

-- 3. Migrate Data (Only if 'category' column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'category') THEN
        
        -- Map 'ledenbijdrage' -> 'Ledenbijdrage'
        UPDATE public.bank_transactions bt
        SET financial_category_id = fc.id
        FROM public.financial_categories fc
        WHERE bt.vve_id = fc.vve_id
          AND fc.name = 'Ledenbijdrage'
          AND LOWER(bt.category) = 'ledenbijdrage';

        -- Map 'boete' -> 'Boete'
        UPDATE public.bank_transactions bt
        SET financial_category_id = fc.id
        FROM public.financial_categories fc
        WHERE bt.vve_id = fc.vve_id
          AND fc.name = 'Boete'
          AND LOWER(bt.category) = 'boete';

        -- Map 'overig' -> 'Diversen'
        UPDATE public.bank_transactions bt
        SET financial_category_id = fc.id
        FROM public.financial_categories fc
        WHERE bt.vve_id = fc.vve_id
          AND fc.name = 'Diversen'
          AND LOWER(bt.category) = 'overig';

        -- Map 'eenmalig' -> 'Eenmalige bijdrage'
        UPDATE public.bank_transactions bt
        SET financial_category_id = fc.id
        FROM public.financial_categories fc
        WHERE bt.vve_id = fc.vve_id
          AND fc.name = 'Eenmalige bijdrage'
          AND LOWER(bt.category) = 'eenmalig';
          
        RAISE NOTICE 'Data migration completed from category column.';
    ELSE
        RAISE NOTICE 'Column category does not exist. Skipping data migration.';
    END IF;
END $$;
  
-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
