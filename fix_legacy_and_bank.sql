-- FIX LEGACY FUNCTIONS AND BANK POLICIES
-- Drops old functions with CASCADE to remove broken policies.
-- Recreates bank table policies with correct 'association' naming and safe logic.

BEGIN;

-- 1. Drop Legacy Functions (CASCADE will drop dependent policies on agenda, docs, maintenance, bank_accounts etc)
DROP FUNCTION IF EXISTS public.has_role_in_vve(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_access_to_vve(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role(uuid) CASCADE;

-- 2. Create Replacement Functions (v2)
-- has_role_in_association
CREATE OR REPLACE FUNCTION public.has_role_in_association(target_association_id uuid, required_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.association_memberships 
    WHERE user_id = auth.uid() AND association_id = target_association_id AND role = required_role
  );
END;
$$;

-- has_access_to_association
CREATE OR REPLACE FUNCTION public.has_access_to_association(target_association_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.association_memberships 
    WHERE user_id = auth.uid() AND association_id = target_association_id
  );
END;
$$;

-- get_my_role_in_association
CREATE OR REPLACE FUNCTION public.get_my_role_in_association(look_association_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role::text FROM public.association_memberships 
    WHERE user_id = auth.uid() AND association_id = look_association_id LIMIT 1
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role_in_association TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_access_to_association TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role_in_association TO authenticated, service_role;

-- 3. FIX BANK TABLES POLICIES
-- Dropping legacy functions likely dropped the bank policies too (via CASCADE), but let's be sure.

-- BANK_ACCOUNTS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can view bank accounts" ON public.bank_accounts;

CREATE POLICY "BankAccounts_Select" ON public.bank_accounts FOR SELECT TO authenticated
USING ( public.has_access_to_association(association_id) );

CREATE POLICY "BankAccounts_Manage" ON public.bank_accounts FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') 
);

-- BANK_CONNECTIONS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can delete bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Admins can insert bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Admins can update bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Users can view bank connections" ON public.bank_connections;

CREATE POLICY "BankConnections_Select" ON public.bank_connections FOR SELECT TO authenticated
USING ( public.has_access_to_association(association_id) );

CREATE POLICY "BankConnections_Manage" ON public.bank_connections FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') 
);

-- 4. RESTORE OTHER POLICIES (That might have been dropped by CASCADE)
-- Agenda Events
DROP POLICY IF EXISTS "Manage events in accessible VvEs" ON public.agenda_events;
DROP POLICY IF EXISTS "Agenda_Manage" ON public.agenda_events;
CREATE POLICY "Agenda_Manage" ON public.agenda_events FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager')
);

-- Documents
DROP POLICY IF EXISTS "Admins/Managers can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Documents_Manage" ON public.documents;
CREATE POLICY "Documents_Manage" ON public.documents FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'manager')
);

-- Maintenance Tasks
DROP POLICY IF EXISTS "Tech Comm and Board can manage tasks" ON public.maintenance_tasks;
DROP POLICY IF EXISTS "Maintenance_Manage" ON public.maintenance_tasks;
CREATE POLICY "Maintenance_Manage" ON public.maintenance_tasks FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager') OR
    public.has_role_in_association(association_id, 'tech_comm')
);

COMMIT;

NOTIFY pgrst, 'reload schema';
