-- Function to seed default Dutch VvE ledger accounts

CREATE OR REPLACE FUNCTION public.seed_default_ledger(p_association_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Assets (1xxx)
    INSERT INTO public.ledger_accounts (association_id, code, name, type, is_system) VALUES
    (p_association_id, '1000', 'Bankrekening', 'ASSET', true),
    (p_association_id, '1010', 'Spaarrekening', 'ASSET', true),
    (p_association_id, '1100', 'Debiteuren (Achterstanden)', 'ASSET', true),
    (p_association_id, '1200', 'Kas', 'ASSET', false)
    ON CONFLICT (association_id, code) DO NOTHING;

    -- Liabilities / Equity (2xxx, 0xxx)
    INSERT INTO public.ledger_accounts (association_id, code, name, type, is_system) VALUES
    (p_association_id, '2000', 'Crediteuren (Nog te betalen)', 'LIABILITY', true),
    (p_association_id, '0500', 'Algemene Reserve', 'EQUITY', true),
    (p_association_id, '0600', 'Bestemmingsreserve Groot Onderhoud', 'EQUITY', true)
    ON CONFLICT (association_id, code) DO NOTHING;

    -- Revenue (8xxx) -> Dutch VvE often uses 8 for revenue, 4 for cost, or vice versa.
    -- Modelreglement usually:
    -- 8000: Opbrengsten Ledenbijdragen
    INSERT INTO public.ledger_accounts (association_id, code, name, type, is_system) VALUES
    (p_association_id, '8000', 'Ledenbijdragen Exploitatie', 'REVENUE', true),
    (p_association_id, '8010', 'Ledenbijdragen Reservefonds', 'REVENUE', true),
    (p_association_id, '8100', 'Overige Opbrengsten', 'REVENUE', false)
    ON CONFLICT (association_id, code) DO NOTHING;

    -- Expenses (4xxx)
    INSERT INTO public.ledger_accounts (association_id, code, name, type, is_system) VALUES
    (p_association_id, '4000', 'Klein Dagelijks Onderhoud', 'EXPENSE', false),
    (p_association_id, '4100', 'Groot Onderhoud (Dotatie)', 'EXPENSE', false),
    (p_association_id, '4200', 'Verzekeringen', 'EXPENSE', false),
    (p_association_id, '4300', 'Elektra en Gas', 'EXPENSE', false),
    (p_association_id, '4400', 'Water', 'EXPENSE', false),
    (p_association_id, '4500', 'Administratiekosten', 'EXPENSE', false),
    (p_association_id, '4600', 'Bankkosten', 'EXPENSE', false),
    (p_association_id, '4900', 'Algemene Kosten', 'EXPENSE', false)
    ON CONFLICT (association_id, code) DO NOTHING;

END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_ledger TO authenticated;

-- Trigger to auto-seed on Association Creation?
-- Or just manual call. Manual is safer for now.
