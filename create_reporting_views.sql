-- Reporting Views

-- 1. Balance Sheet View (Balans)
-- Snapshot at a specific date.
-- Assets = Liabilities + Equity
-- Code range hint: Assets (1xxx), Liabilities (1xxx/2xxx), Equity (0xxx/9xxx except 9999?)
-- Actually we use the 'type' column in ledger_accounts.

CREATE OR REPLACE VIEW public.vw_balance_sheet AS
SELECT 
    la.vve_id,
    la.id AS ledger_account_id,
    la.code,
    la.name,
    la.type,
    COALESCE(SUM(jel.debit) - SUM(jel.credit), 0) AS balance -- Standard debit-normal for Assets?
FROM public.ledger_accounts la
LEFT JOIN public.journal_entry_lines jel ON jel.ledger_account_id = la.id
LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id
WHERE 
    je.status = 'POSTED' OR je.status IS NULL -- Include posted entries (lines might exist without posted entry?)
GROUP BY la.vve_id, la.id, la.code, la.name, la.type;

-- Note: The above view gives the *current* total balance. 
-- To get balance at a specific date, we need a function, not just a simple view, 
-- or we filter the view in the application logic by joining again. 
-- For performance/simplicity in Supabase, let's make a function.

CREATE OR REPLACE FUNCTION public.get_balance_sheet(
    target_vve_id UUID, 
    at_date DATE
)
RETURNS TABLE (
    ledger_account_id UUID,
    code INTEGER,
    name TEXT,
    type TEXT,
    balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.id,
        la.code,
        la.name,
        la.type,
        -- Calculate balance based on account type normal
        -- ASSET/EXPENSE: Debit - Credit
        -- LIABILITY/EQUITY/REVENUE: Credit - Debit
        CASE 
            WHEN la.type IN ('ASSET', 'EXPENSE') THEN COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
            ELSE COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
        END AS balance
    FROM public.ledger_accounts la
    LEFT JOIN public.journal_entry_lines jel ON jel.ledger_account_id = la.id
    LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE 
        la.vve_id = target_vve_id
        AND (je.booking_date <= at_date OR je.id IS NULL)
        AND (je.status = 'POSTED' OR je.id IS NULL)
        AND la.type IN ('ASSET', 'LIABILITY', 'EQUITY')
    GROUP BY la.id, la.code, la.name, la.type
    ORDER BY la.code;
END;
$$ LANGUAGE plpgsql;


-- 2. Profit & Loss Function (Winst- & Verliesrekening)
-- Period range (start_date to end_date)
-- Shows Revenue and Expenses

CREATE OR REPLACE FUNCTION public.get_profit_loss(
    target_vve_id UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    ledger_account_id UUID,
    code INTEGER,
    name TEXT,
    type TEXT,
    amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.id,
        la.code,
        la.name,
        la.type,
        -- P&L is usually Credit - Debit for Revenue, Debit - Credit for Expense
        CASE 
            WHEN la.type = 'REVENUE' THEN COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)
            ELSE COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)
        END AS amount
    FROM public.ledger_accounts la
    LEFT JOIN public.journal_entry_lines jel ON jel.ledger_account_id = la.id
    LEFT JOIN public.journal_entries je ON jel.journal_entry_id = je.id
    WHERE 
        la.vve_id = target_vve_id
        AND je.booking_date BETWEEN start_date AND end_date
        AND je.status = 'POSTED'
        AND la.type IN ('REVENUE', 'EXPENSE')
    GROUP BY la.id, la.code, la.name, la.type
    ORDER BY la.code;
END;
$$ LANGUAGE plpgsql;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
