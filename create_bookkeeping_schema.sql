-- Phase 6: Bookkeeping Schema

BEGIN;

--------------------------------------------------------------------------------
-- 1. Enums & Types
--------------------------------------------------------------------------------

-- Ledger Account Types
DO $$ BEGIN
    CREATE TYPE public.ledger_account_type AS ENUM (
        'ASSET',        -- Activa (Bezittingen)
        'LIABILITY',    -- Passiva (Schulden)
        'EQUITY',       -- Eigen Vermogen (Reserves)
        'REVENUE',      -- Opbrengsten
        'EXPENSE'       -- Kosten
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Journal Status
DO $$ BEGIN
    CREATE TYPE public.journal_status AS ENUM (
        'DRAFT',
        'POSTED',
        'ARCHIVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

--------------------------------------------------------------------------------
-- 2. Ledger Accounts (Grootboekrekeningen)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. '1000', '4050'
    name TEXT NOT NULL, -- e.g. 'Bank', 'Onderhoud'
    type public.ledger_account_type NOT NULL,
    is_system BOOLEAN DEFAULT false, -- If true, cannot be deleted (e.g. 'Onverdeeld')
    parent_id UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL, -- For hierarchy
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique code per association
    CONSTRAINT "uniq_ledger_code" UNIQUE (association_id, code)
);

-- RLS: Ledger Accounts
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ledger_View" ON public.ledger_accounts FOR SELECT TO authenticated
USING ( public.has_role_in_association(association_id, 'member') OR 
        public.has_role_in_association(association_id, 'admin') OR 
        public.has_role_in_association(association_id, 'board') OR
        public.has_role_in_association(association_id, 'manager') );

CREATE POLICY "Ledger_Manage" ON public.ledger_accounts FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager') 
);

--------------------------------------------------------------------------------
-- 3. Journal Entries (Boekingen / Memoriaal)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference TEXT, -- Invoice number, etc.
    status public.journal_status DEFAULT 'DRAFT',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Journal Entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Only Admins/Board/Managers can see/edit financial entries (Sensitive info?)
-- Usually members can see Reports (Aggregated), but maybe not raw Journal Entries.
-- Let's stick to management only for now.
CREATE POLICY "Journal_Manage" ON public.journal_entries FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager') 
);

--------------------------------------------------------------------------------
-- 4. Journal Lines (Boekingregels)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.journal_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
    debit DECIMAL(12, 2) DEFAULT 0 CHECK (debit >= 0),
    credit DECIMAL(12, 2) DEFAULT 0 CHECK (credit >= 0),
    description TEXT, -- Line specific description
    
    -- Ensure user created line for same association implied? 
    -- Application logic usually handles this, but FK protects integrity.
    
    CONSTRAINT "one_side_positive" CHECK ( (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0) )
);

-- RLS: Access follows Entry
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journal_Lines_Manage" ON public.journal_lines FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.journal_entries e
        WHERE e.id = journal_lines.entry_id
        AND (
            public.is_super_admin() OR 
            public.has_role_in_association(e.association_id, 'admin') OR
            public.has_role_in_association(e.association_id, 'board') OR
            public.has_role_in_association(e.association_id, 'manager')
        )
    )
);

--------------------------------------------------------------------------------
-- 5. Functions & Triggers
--------------------------------------------------------------------------------

-- Helper: Post Journal Entry (Validates Balance)
CREATE OR REPLACE FUNCTION public.post_journal_entry(p_entry_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- As system to ensure integrity
AS $$
DECLARE
    v_total_debit DECIMAL;
    v_total_credit DECIMAL;
    v_stat public.journal_status;
BEGIN
    -- Check current status
    SELECT status INTO v_stat FROM public.journal_entries WHERE id = p_entry_id;
    
    IF v_stat = 'POSTED' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Is already POSTED');
    END IF;

    -- Calculate Totals
    SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
    INTO v_total_debit, v_total_credit
    FROM public.journal_lines
    WHERE entry_id = p_entry_id;

    -- Validate Balance (Allow small float issues? No, DECIMAL(12,2) is exact)
    IF v_total_debit <> v_total_credit THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', format('Unbalanced: Debit %s <> Credit %s', v_total_debit, v_total_credit)
        );
    END IF;

    -- Validate No Empty Entries
    IF v_total_debit = 0 THEN
         RETURN jsonb_build_object('success', false, 'message', 'Cannot post empty entry');
    END IF;

    -- Update Status
    UPDATE public.journal_entries
    SET status = 'POSTED', updated_at = NOW()
    WHERE id = p_entry_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant Execute
GRANT EXECUTE ON FUNCTION public.post_journal_entry TO authenticated;

COMMIT;
