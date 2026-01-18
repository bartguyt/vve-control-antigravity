-- RENAME BANK COLUMNS AND FIX POLICIES
-- Renames vve_id -> association_id for bank tables
-- Re-runs the policy fix from previous step

BEGIN;

-- 1. Rename Columns (Safe if not exists check? No, let's just do it)
-- We use DO block to avoid errors if already renamed (though unlikely given error)

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='bank_accounts' AND column_name='vve_id') THEN
    ALTER TABLE public.bank_accounts RENAME COLUMN vve_id TO association_id;
  END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='bank_connections' AND column_name='vve_id') THEN
    ALTER TABLE public.bank_connections RENAME COLUMN vve_id TO association_id;
  END IF;
  
  -- Check bank_transactions too
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='bank_transactions' AND column_name='vve_id') THEN
    ALTER TABLE public.bank_transactions RENAME COLUMN vve_id TO association_id;
  END IF;
END $$;


-- 2. Drop Legacy Functions (CASCADE)
DROP FUNCTION IF EXISTS public.has_role_in_vve(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_access_to_vve(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role(uuid) CASCADE;

-- 3. Recreate New Functions (v2)
CREATE OR REPLACE FUNCTION public.has_role_in_association(target_association_id uuid, required_role text)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_super_admin() THEN RETURN TRUE; END IF;
  RETURN EXISTS (SELECT 1 FROM public.association_memberships WHERE user_id = auth.uid() AND association_id = target_association_id AND role = required_role);
END; $$;

CREATE OR REPLACE FUNCTION public.has_access_to_association(target_association_id uuid)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_super_admin() THEN RETURN TRUE; END IF;
  RETURN EXISTS (SELECT 1 FROM public.association_memberships WHERE user_id = auth.uid() AND association_id = target_association_id);
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_role_in_association(look_association_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT role::text FROM public.association_memberships WHERE user_id = auth.uid() AND association_id = look_association_id LIMIT 1);
END; $$;

GRANT EXECUTE ON FUNCTION public.has_role_in_association TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_access_to_association TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role_in_association TO authenticated, service_role;


-- 4. FIX POLICIES (Now columns are definitely named correctly)

-- BANK_ACCOUNTS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "BankAccounts_Select" ON public.bank_accounts;
DROP POLICY IF EXISTS "BankAccounts_Manage" ON public.bank_accounts;

CREATE POLICY "BankAccounts_Select" ON public.bank_accounts FOR SELECT TO authenticated
USING ( public.has_access_to_association(association_id) );

CREATE POLICY "BankAccounts_Manage" ON public.bank_accounts FOR ALL TO authenticated
USING ( public.is_super_admin() OR public.has_role_in_association(association_id, 'admin') );


-- BANK_CONNECTIONS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can delete bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Admins can insert bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Admins can update bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Users can view bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "BankConnections_Select" ON public.bank_connections;
DROP POLICY IF EXISTS "BankConnections_Manage" ON public.bank_connections;

CREATE POLICY "BankConnections_Select" ON public.bank_connections FOR SELECT TO authenticated
USING ( public.has_access_to_association(association_id) );

CREATE POLICY "BankConnections_Manage" ON public.bank_connections FOR ALL TO authenticated
USING ( public.is_super_admin() OR public.has_role_in_association(association_id, 'admin') );


-- RESTORE OTHER POLICIES (Agenda, Docs, Maintenance)
-- Agenda
DROP POLICY IF EXISTS "Agenda_Manage" ON public.agenda_events;
CREATE POLICY "Agenda_Manage" ON public.agenda_events FOR ALL TO authenticated
USING ( public.is_super_admin() OR public.has_role_in_association(association_id, 'admin') OR public.has_role_in_association(association_id, 'board') OR public.has_role_in_association(association_id, 'manager'));

-- Documents
DROP POLICY IF EXISTS "Documents_Manage" ON public.documents;
CREATE POLICY "Documents_Manage" ON public.documents FOR ALL TO authenticated
USING ( public.is_super_admin() OR public.has_role_in_association(association_id, 'admin') OR public.has_role_in_association(association_id, 'manager'));

-- Maintenance
DROP POLICY IF EXISTS "Maintenance_Manage" ON public.maintenance_tasks;
CREATE POLICY "Maintenance_Manage" ON public.maintenance_tasks FOR ALL TO authenticated
USING ( public.is_super_admin() OR public.has_role_in_association(association_id, 'admin') OR public.has_role_in_association(association_id, 'board') OR public.has_role_in_association(association_id, 'manager') OR public.has_role_in_association(association_id, 'tech_comm'));

COMMIT;

NOTIFY pgrst, 'reload schema';
