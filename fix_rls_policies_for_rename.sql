-- FIX RLS POLICIES & MISSING RENAMES (V4 - Comprehensive)

-- 1. Helper Functions (Drop CASCADE to clean up dependent policies)
DROP FUNCTION IF EXISTS public.get_my_vve_ids() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_association_ids() CASCADE;

CREATE OR REPLACE FUNCTION public.get_my_association_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(array_agg(association_id), '{}')
    FROM association_memberships
    WHERE user_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.get_my_association_ids() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_admins WHERE user_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.is_super_admin() OWNER TO postgres;


-- 2. HANDLE ALL POTENTIAL MISSING COLUMN RENAMES
-- We check every table that should have 'association_id'.
DO $$
BEGIN
  -- agenda_events
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'agenda_events' AND column_name = 'vve_id') THEN
    ALTER TABLE agenda_events RENAME COLUMN vve_id TO association_id;
  END IF;

  -- event_categories
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'event_categories' AND column_name = 'vve_id') THEN
    ALTER TABLE event_categories RENAME COLUMN vve_id TO association_id;
  END IF;
  
  -- activity_logs
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'vve_id') THEN
    ALTER TABLE activity_logs RENAME COLUMN vve_id TO association_id;
  END IF;

  -- maintenance_tasks
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_tasks' AND column_name = 'vve_id') THEN
    ALTER TABLE maintenance_tasks RENAME COLUMN vve_id TO association_id;
  END IF;

  -- assignments
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'vve_id') THEN
    ALTER TABLE assignments RENAME COLUMN vve_id TO association_id;
  END IF;

  -- documents
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'vve_id') THEN
    ALTER TABLE documents RENAME COLUMN vve_id TO association_id;
  END IF;

  -- suppliers
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'vve_id') THEN
    ALTER TABLE suppliers RENAME COLUMN vve_id TO association_id;
  END IF;

  -- bank_transactions
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'vve_id') THEN
    ALTER TABLE bank_transactions RENAME COLUMN vve_id TO association_id;
  END IF;

   -- postings (journal_entries might use vve_id?)
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'vve_id') THEN
    ALTER TABLE journal_entries RENAME COLUMN vve_id TO association_id;
  END IF;
  
  -- ledger_accounts
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ledger_accounts' AND column_name = 'vve_id') THEN
    ALTER TABLE ledger_accounts RENAME COLUMN vve_id TO association_id;
  END IF;

END $$;


-- 3. Recreate Policies for Core Tables

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles_Select" ON profiles;
CREATE POLICY "Profiles_Select" ON profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id 
  OR is_super_admin()
  OR id IN (
      SELECT user_id 
      FROM association_memberships 
      WHERE association_id = ANY(get_my_association_ids())
  )
);
DROP POLICY IF EXISTS "Profiles_Insert" ON profiles;
CREATE POLICY "Profiles_Insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles_Update" ON profiles;
CREATE POLICY "Profiles_Update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR is_super_admin());

-- ASSOCIATION_MEMBERSHIPS
ALTER TABLE association_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Memberships_Select" ON association_memberships;
CREATE POLICY "Memberships_Select" ON association_memberships FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_super_admin()
  OR association_id = ANY(get_my_association_ids())
);
DROP POLICY IF EXISTS "Memberships_Write" ON association_memberships;
CREATE POLICY "Memberships_Write" ON association_memberships FOR ALL TO authenticated
USING (
  is_super_admin() 
  OR EXISTS (
    SELECT 1 FROM association_memberships my_m
    WHERE my_m.association_id = association_memberships.association_id
    AND my_m.user_id = auth.uid()
    AND my_m.role IN ('admin', 'manager', 'board')
  )
);

-- ASSOCIATIONS
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Associations_Select" ON associations;
CREATE POLICY "Associations_Select" ON associations FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR id = ANY(get_my_association_ids())
);

-- ACTIVITY_LOGS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Logs_Select" ON activity_logs;
CREATE POLICY "Logs_Select" ON activity_logs FOR SELECT TO authenticated
USING (
    is_super_admin() 
    OR profile_id = auth.uid() 
    OR association_id = ANY(get_my_association_ids())
);
DROP POLICY IF EXISTS "Logs_Insert" ON activity_logs;
CREATE POLICY "Logs_Insert" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);


-- 4. Recreate Policies for Feature Tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['agenda_events', 'event_categories', 'assignments', 'documents', 'maintenance_tasks', 'suppliers', 'bank_transactions'])
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    
    -- Drop old policies
    EXECUTE format('DROP POLICY IF EXISTS "Select_%I" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_Select" ON %I', tbl, tbl);
    
    -- Create new Select policy
    EXECUTE format('CREATE POLICY "Select_%I" ON %I FOR SELECT TO authenticated USING (association_id = ANY(get_my_association_ids()) OR is_super_admin())', tbl, tbl);
    
    -- Create new Write policy
    -- Only for admin/board
    EXECUTE format('DROP POLICY IF EXISTS "Write_%I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Write_%I" ON %I FOR ALL TO authenticated USING (
      is_super_admin() OR 
      EXISTS (
        SELECT 1 FROM association_memberships m 
        WHERE m.association_id = %I.association_id 
        AND m.user_id = auth.uid() 
        AND m.role IN (''admin'', ''board'', ''manager'', ''tech_comm'')
      )
    )', tbl, tbl, tbl);

  END LOOP;
END $$;

-- 5. Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
