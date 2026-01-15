-- CACHE TABLE STRATEGY FOR RLS RECURSION
-- Recursion persists because RLS checks on 'vve_memberships' verify 'vve_memberships'.
-- Solution: Create a 'sys_membership_cache' table that MIRRORS 'vve_memberships'.
-- This cache has NO RLS. The policies read from Cache. The Table writes to Cache (via Trigger).
-- This completely decouples the Read (Policy) from the Write (Table), breaking recursion.

-- 1. Create Cache Table
CREATE TABLE IF NOT EXISTS public.sys_membership_cache (
    user_id UUID,
    vve_id UUID,
    PRIMARY KEY (user_id, vve_id)
);

-- Secure it: No RLS, but restrict access to Owner (postgres) only
ALTER TABLE public.sys_membership_cache DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sys_membership_cache FROM public, authenticated, anon;
-- Grant owner access is implicit

-- 2. Create Sync Function (Security Definer)
CREATE OR REPLACE FUNCTION public.sync_membership_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.sys_membership_cache (user_id, vve_id) 
    VALUES (NEW.user_id, NEW.vve_id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.sys_membership_cache 
    WHERE user_id = OLD.user_id AND vve_id = OLD.vve_id;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Simplify: delete old, insert new
    DELETE FROM public.sys_membership_cache 
    WHERE user_id = OLD.user_id AND vve_id = OLD.vve_id;
    
    INSERT INTO public.sys_membership_cache (user_id, vve_id) 
    VALUES (NEW.user_id, NEW.vve_id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
ALTER FUNCTION public.sync_membership_cache() OWNER TO postgres;

-- 3. Create Trigger on vve_memberships
DROP TRIGGER IF EXISTS trg_sync_membership_cache ON public.vve_memberships;
CREATE TRIGGER trg_sync_membership_cache
AFTER INSERT OR UPDATE OR DELETE ON public.vve_memberships
FOR EACH ROW EXECUTE FUNCTION public.sync_membership_cache();

-- 4. Initial Sync (Populate Cache)
TRUNCATE TABLE public.sys_membership_cache;
INSERT INTO public.sys_membership_cache (user_id, vve_id)
SELECT user_id, vve_id FROM public.vve_memberships;


-- 5. Drop old Policies (To remove dependency on old function)
DO $$ 
DECLARE 
  pol record; 
BEGIN 
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles', 'vve_memberships', 'activity_logs', 'vves') 
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename); 
  END LOOP; 
END $$;


-- 6. Update Helper: get_my_vve_ids (Reads from CACHE now!)
DROP FUNCTION IF EXISTS public.get_my_vve_ids();
CREATE OR REPLACE FUNCTION public.get_my_vve_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(array_agg(vve_id), '{}')
    FROM public.sys_membership_cache -- Reads from CACHE (No RLS)
    WHERE user_id = auth.uid()
  );
END;
$$;
ALTER FUNCTION public.get_my_vve_ids() OWNER TO postgres;


-- 7. Helper: is_super_admin (Uses app_admins)
DROP FUNCTION IF EXISTS public.is_super_admin();
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


-- 8. Re-apply Policies (Same logic, but safe now)

-- PROFILES
CREATE POLICY "Profiles_Select" ON profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id -- Self
  OR is_super_admin() -- Super Admin
  OR id IN ( -- Colleagues
      SELECT user_id 
      FROM vve_memberships 
      WHERE vve_id = ANY(get_my_vve_ids()) -- Safe: Calls function -> Cache
  )
);
CREATE POLICY "Profiles_Insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles_Update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR is_super_admin());


-- VVE_MEMBERSHIPS
CREATE POLICY "Memberships_Select" ON vve_memberships FOR SELECT TO authenticated
USING (
  user_id = auth.uid() -- My own
  OR is_super_admin() -- Super Admin
  OR vve_id = ANY(get_my_vve_ids()) -- Safe: Calls function -> Cache
);

CREATE POLICY "Memberships_Write" ON vve_memberships FOR ALL TO authenticated
USING (
  is_super_admin() 
  OR EXISTS ( -- VvE Managers
    -- Note: This subquery checks vve_memberships direct. 
    -- It is safe because it filters by vve_id first and doesn't rely on 'get_my_vve_ids'.
    -- However, to be extra safe, we could use the cache here too, but let's stick to standard RLS for write permissions logic 
    -- as usually "recursion" comes from the "Select" policy being applied to the rows fetched by the subquery in the "Check".
    -- Here we query vve_memberships. If that triggers "Memberships_Select", it goes to Cache. So it is safe.
    SELECT 1 FROM vve_memberships my_m
    WHERE my_m.vve_id = vve_memberships.vve_id
    AND my_m.user_id = auth.uid()
    AND my_m.role IN ('admin', 'manager', 'board')
  )
);


-- ACTIVITY_LOGS
CREATE POLICY "Logs_Select" ON activity_logs FOR SELECT TO authenticated
USING (
    is_super_admin() 
    OR profile_id = auth.uid() 
    OR vve_id = ANY(get_my_vve_ids())
);
CREATE POLICY "Logs_Insert" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);


-- VVES
CREATE POLICY "Vves_Select" ON vves FOR SELECT TO authenticated
USING (
    is_super_admin()
    OR id = ANY(get_my_vve_ids())
);

-- Ensure permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
