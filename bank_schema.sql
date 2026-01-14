-- Bank Integration Schema

-- Table: bank_connections (Stores the link to GoCardless/Nordigen)
CREATE TABLE public.bank_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vve_id UUID REFERENCES public.vves(id) NOT NULL,
    requisition_id TEXT NOT NULL, -- ID from GoCardless
    status TEXT DEFAULT 'INITIATED', -- INITIATED, LINKED, EXPIRED
    provider_name TEXT, -- e.g. "Sandbox Bank"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: bank_accounts (Stores linked accounts)
CREATE TABLE public.bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE NOT NULL,
    vve_id UUID REFERENCES public.vves(id) NOT NULL,
    external_id TEXT NOT NULL, -- ID from GoCardless
    iban TEXT,
    name TEXT,
    currency TEXT DEFAULT 'EUR',
    balance_amount DECIMAL(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: bank_transactions (Stores fetched transactions)
CREATE TABLE public.bank_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
    vve_id UUID REFERENCES public.vves(id) NOT NULL,
    external_id TEXT NOT NULL, -- Transaction ID from GoCardless
    booking_date DATE NOT NULL,
    value_date DATE,
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    description TEXT,
    debtor_name TEXT, -- Counterparty name
    creditor_name TEXT,
    transaction_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, external_id)
);

-- RLS Policies

-- bank_connections
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank connections for their VvE"
    ON public.bank_connections FOR SELECT
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can insert bank connections"
    ON public.bank_connections FOR INSERT
    WITH CHECK (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can update bank connections"
    ON public.bank_connections FOR UPDATE
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can delete bank connections"
    ON public.bank_connections FOR DELETE
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank accounts for their VvE"
    ON public.bank_accounts FOR SELECT
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage bank accounts"
    ON public.bank_accounts FOR ALL
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- bank_transactions
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank transactions for their VvE"
    ON public.bank_transactions FOR SELECT
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage bank transactions"
    ON public.bank_transactions FOR ALL
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));
