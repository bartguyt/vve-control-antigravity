-- FIX RLS Policies and Helper Function
-- The issue is that we migrated to 'user_id' linking to auth.users, but policies were checking 'id'.

-- 1. Fix the helper function to use user_id
create or replace function public.get_my_vve_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select vve_id from profiles where user_id = auth.uid();
$$;

-- 2. Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view bank connections for their VvE" ON public.bank_connections;
DROP POLICY IF EXISTS "Admins can insert bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Admins can update bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Admins can delete bank connections" ON public.bank_connections;

DROP POLICY IF EXISTS "Users can view bank accounts for their VvE" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;

DROP POLICY IF EXISTS "Users can view bank transactions for their VvE" ON public.bank_transactions;
DROP POLICY IF EXISTS "Admins can manage bank transactions" ON public.bank_transactions;

-- 3. Recreate Policies using CORRECT user_id check

-- bank_connections
CREATE POLICY "Users can view bank connections for their VvE"
    ON public.bank_connections FOR SELECT
    USING (vve_id = get_my_vve_id());

CREATE POLICY "Admins can insert bank connections"
    ON public.bank_connections FOR INSERT
    WITH CHECK (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can update bank connections"
    ON public.bank_connections FOR UPDATE
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can delete bank connections"
    ON public.bank_connections FOR DELETE
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- bank_accounts
CREATE POLICY "Users can view bank accounts for their VvE"
    ON public.bank_accounts FOR SELECT
    USING (vve_id = get_my_vve_id());

CREATE POLICY "Admins can manage bank accounts"
    ON public.bank_accounts FOR ALL
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- bank_transactions
CREATE POLICY "Users can view bank transactions for their VvE"
    ON public.bank_transactions FOR SELECT
    USING (vve_id = get_my_vve_id());

CREATE POLICY "Admins can manage bank transactions"
    ON public.bank_transactions FOR ALL
    USING (vve_id IN (
        SELECT vve_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    ));
