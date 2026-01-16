-- Bookkeeping Schema

-- 1. Ledger Accounts (Grootboekrekeningen)
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vve_id UUID NOT NULL REFERENCES public.vves(id) ON DELETE CASCADE,
    code INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(vve_id, code)
);

-- 2. Financial Categories (Gebruikerslaag)
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vve_id UUID NOT NULL REFERENCES public.vves(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ledger_account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
    vat_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Journal Entries (Boekingen)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vve_id UUID NOT NULL REFERENCES public.vves(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL, -- Link to bank tx if applicable
    booking_date DATE NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- 4. Journal Entry Lines (Boekingsregels)
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    ledger_account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
    debit DECIMAL(12,2) DEFAULT 0.00,
    credit DECIMAL(12,2) DEFAULT 0.00,
    description TEXT, -- Line specific description if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_vve ON public.ledger_accounts(vve_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_vve ON public.financial_categories(vve_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_vve ON public.journal_entries(vve_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(booking_date);
CREATE INDEX IF NOT EXISTS idx_lines_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_lines_account ON public.journal_entry_lines(ledger_account_id);

-- RLS Policies (Standard VvE isolation)
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Helper policy for VvE members (simplified, assumes standard vve_memberships logic exists)
-- READ access for members
DROP POLICY IF EXISTS "Members can view ledger accounts" ON public.ledger_accounts;
CREATE POLICY "Members can view ledger accounts" ON public.ledger_accounts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vve_memberships m WHERE m.vve_id = ledger_accounts.vve_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Members can view categories" ON public.financial_categories;
CREATE POLICY "Members can view categories" ON public.financial_categories FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vve_memberships m WHERE m.vve_id = financial_categories.vve_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Members can view entries" ON public.journal_entries;
CREATE POLICY "Members can view entries" ON public.journal_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vve_memberships m WHERE m.vve_id = journal_entries.vve_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Members can view lines" ON public.journal_entry_lines;
CREATE POLICY "Members can view lines" ON public.journal_entry_lines FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.journal_entries e JOIN public.vve_memberships m ON m.vve_id = e.vve_id WHERE e.id = journal_entry_lines.journal_entry_id AND m.user_id = auth.uid())
);

-- WRITE access for Board/Admin
DROP POLICY IF EXISTS "Board can manage ledger accounts" ON public.ledger_accounts;
CREATE POLICY "Board can manage ledger accounts" ON public.ledger_accounts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vve_memberships m WHERE m.vve_id = ledger_accounts.vve_id AND m.user_id = auth.uid() AND m.role IN ('admin', 'board'))
);

DROP POLICY IF EXISTS "Board can manage categories" ON public.financial_categories;
CREATE POLICY "Board can manage categories" ON public.financial_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vve_memberships m WHERE m.vve_id = financial_categories.vve_id AND m.user_id = auth.uid() AND m.role IN ('admin', 'board'))
);

DROP POLICY IF EXISTS "Board can manage entries" ON public.journal_entries;
CREATE POLICY "Board can manage entries" ON public.journal_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vve_memberships m WHERE m.vve_id = journal_entries.vve_id AND m.user_id = auth.uid() AND m.role IN ('admin', 'board'))
);

DROP POLICY IF EXISTS "Board can manage lines" ON public.journal_entry_lines;
CREATE POLICY "Board can manage lines" ON public.journal_entry_lines FOR ALL USING (
    EXISTS (SELECT 1 FROM public.journal_entries e JOIN public.vve_memberships m ON m.vve_id = e.vve_id WHERE e.id = journal_entry_lines.journal_entry_id AND m.user_id = auth.uid() AND m.role IN ('admin', 'board'))
);

-- Function to initialize standard ledger accounts
CREATE OR REPLACE FUNCTION public.initialize_vve_ledger(target_vve_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Reserves & Result
    INSERT INTO public.ledger_accounts (vve_id, code, name, type, is_system) VALUES
    (target_vve_id, 900, 'Reservefonds groot onderhoud', 'EQUITY', true),
    (target_vve_id, 910, 'Algemene reserve gelijkdeel allen', 'EQUITY', true),
    (target_vve_id, 911, 'Algemene reserve gelijkdeel allen (excl. nrs 45-48)', 'EQUITY', true),
    (target_vve_id, 5900, 'Dotatie Reservefonds groot onderhoud', 'EXPENSE', true), -- Often handled as expense in P&L then moved to equity
    (target_vve_id, 9999, 'Exploitatieresultaat boekjaar', 'EQUITY', true)
    ON CONFLICT (vve_id, code) DO NOTHING;

    -- Banks (Liquid Assets)
    INSERT INTO public.ledger_accounts (vve_id, code, name, type, is_system) VALUES
    (target_vve_id, 1150, 'ING betaalrekening', 'ASSET', true),
    (target_vve_id, 1151, 'ING spaarrekening', 'ASSET', true)
    ON CONFLICT (vve_id, code) DO NOTHING;

    -- Receivables/Payables
    INSERT INTO public.ledger_accounts (vve_id, code, name, type, is_system) VALUES
    (target_vve_id, 1300, 'Debiteuren', 'ASSET', true),
    (target_vve_id, 1600, 'Crediteuren', 'LIABILITY', true),
    (target_vve_id, 1810, 'Vooruit betaald', 'LIABILITY', true),
    (target_vve_id, 1820, 'Nog te ontvangen', 'ASSET', true),
    (target_vve_id, 1825, 'Nog te ontvangen rente', 'ASSET', true),
    (target_vve_id, 1830, 'Nog te betalen', 'LIABILITY', true)
    ON CONFLICT (vve_id, code) DO NOTHING;

    -- Clearing / Suspense
    INSERT INTO public.ledger_accounts (vve_id, code, name, type, is_system) VALUES
    (target_vve_id, 1900, 'Kruisposten', 'ASSET', true),
    (target_vve_id, 1910, 'Vraagposten', 'ASSET', true),
    (target_vve_id, 1920, 'Tussenrekening schade uitkeringen', 'ASSET', true),
    (target_vve_id, 1940, 'Tussenrekening vve betalingen', 'ASSET', true),
    (target_vve_id, 1950, 'Tussenrekening beginbalans', 'EQUITY', true),
    (target_vve_id, 1960, 'Tussenrekening crediteuren', 'LIABILITY', true),
    (target_vve_id, 1961, 'Tussenrekening debiteuren', 'ASSET', true),
    (target_vve_id, 1962, 'Tussenrekening memoriaal', 'ASSET', true),
    (target_vve_id, 1963, 'Tussenrekening eenmalige bijdrage notaris', 'ASSET', true),
    (target_vve_id, 1965, 'Tussenrekening doorbelastingen', 'ASSET', true),
    (target_vve_id, 1966, 'Tussenrekening additionele werkzaamheden', 'ASSET', true),
    (target_vve_id, 1968, 'Tussenrekening incassokosten', 'ASSET', true),
    (target_vve_id, 1990, 'Incasso onderweg', 'ASSET', true)
    ON CONFLICT (vve_id, code) DO NOTHING;

    -- VAT
    INSERT INTO public.ledger_accounts (vve_id, code, name, type, is_system) VALUES
    (target_vve_id, 2001, 'Af te dragen btw', 'LIABILITY', true),
    (target_vve_id, 2002, 'Terug te vorderen btw', 'ASSET', true),
    (target_vve_id, 2020, 'Btw saldo', 'LIABILITY', true),
    (target_vve_id, 2021, 'Btw vorig boekjaar', 'LIABILITY', true)
    ON CONFLICT (vve_id, code) DO NOTHING;

    -- Costs (Expenses)
    INSERT INTO public.ledger_accounts (vve_id, code, name, type, is_system) VALUES
    (target_vve_id, 4000, 'Verzekeringen', 'EXPENSE', false),
    (target_vve_id, 4100, 'Elektra', 'EXPENSE', false),
    (target_vve_id, 4500, 'Administratiekosten', 'EXPENSE', false),
    (target_vve_id, 4501, 'Vergader-, porto-, kopie- en bankkosten', 'EXPENSE', false),
    (target_vve_id, 4550, 'Administratiekosten debiteurenbeheer', 'EXPENSE', false),
    (target_vve_id, 4600, 'Schoonmaakkosten', 'EXPENSE', false),
    (target_vve_id, 4810, 'Klein onderhoud', 'EXPENSE', false),
    (target_vve_id, 4812, 'Onderhoud riolering', 'EXPENSE', false),
    (target_vve_id, 4900, 'Diversen', 'EXPENSE', false)
    ON CONFLICT (vve_id, code) DO NOTHING;

    -- Revenues
    INSERT INTO public.ledger_accounts (vve_id, code, name, type, is_system) VALUES
    (target_vve_id, 8000, 'Opbrengst ledenbijdragen', 'REVENUE', true),
    (target_vve_id, 8010, 'Vergoeding ontwikkelaar', 'REVENUE', false),
    (target_vve_id, 9001, 'Ontvangen rente', 'REVENUE', false),
    (target_vve_id, 9003, 'Boeterente', 'REVENUE', true)
    ON CONFLICT (vve_id, code) DO NOTHING;

    -- Create Initial User-Friendly Categories (Mapped to Ledger Accounts)
    -- Use WHERE NOT EXISTS to avoid duplicates
    
    INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
    SELECT target_vve_id, 'Ledenbijdrage', id FROM public.ledger_accounts 
    WHERE vve_id = target_vve_id AND code = 8000
    AND NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE vve_id = target_vve_id AND name = 'Ledenbijdrage');

    INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
    SELECT target_vve_id, 'Energiekosten', id FROM public.ledger_accounts 
    WHERE vve_id = target_vve_id AND code = 4100
    AND NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE vve_id = target_vve_id AND name = 'Energiekosten');

    INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
    SELECT target_vve_id, 'Schoonmaak', id FROM public.ledger_accounts 
    WHERE vve_id = target_vve_id AND code = 4600
    AND NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE vve_id = target_vve_id AND name = 'Schoonmaak');

    INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
    SELECT target_vve_id, 'Bankkosten', id FROM public.ledger_accounts 
    WHERE vve_id = target_vve_id AND code = 4501
    AND NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE vve_id = target_vve_id AND name = 'Bankkosten');
    
    INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
    SELECT target_vve_id, 'Klein onderhoud', id FROM public.ledger_accounts 
    WHERE vve_id = target_vve_id AND code = 4810
    AND NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE vve_id = target_vve_id AND name = 'Klein onderhoud');
    
    INSERT INTO public.financial_categories (vve_id, name, ledger_account_id)
    SELECT target_vve_id, 'Verzekeringen', id FROM public.ledger_accounts 
    WHERE vve_id = target_vve_id AND code = 4000
    AND NOT EXISTS (SELECT 1 FROM public.financial_categories WHERE vve_id = target_vve_id AND name = 'Verzekeringen');

END;
$$ LANGUAGE plpgsql;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
