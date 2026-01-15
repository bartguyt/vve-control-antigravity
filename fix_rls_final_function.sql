-- FINAL RLS FIX: SECURE FUNCTIONS FOR WRITE POLICIES
-- Problem: 'Memberships_Write' policy uses a raw subquery on 'vve_memberships'.
-- This triggers RLS on itself -> Infinite Recursion.
-- Solution: Encapsulate the role check in a SECURITY DEFINER function.
-- This creates a "Firewall": The policy asks the Function. The Function (as admin) reads the Table. RLS is bypassed.

-- 1. Create Safe Role Checker Function
CREATE OR REPLACE FUNCTION public.get_my_role(look_vve_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Returns the role of the current user for the given VvE
  -- Returns NULL if no membership exists
  RETURN (
    SELECT role 
    FROM vve_memberships 
    WHERE user_id = auth.uid() 
    AND vve_id = look_vve_id
    LIMIT 1
  );
END;
$$;
ALTER FUNCTION public.get_my_role(UUID) OWNER TO postgres;


-- 2. Update Policies on vve_memberships
-- Drop the problematic 'ALL' policy
DROP POLICY IF EXISTS "Memberships_Write" ON vve_memberships;
DROP POLICY IF EXISTS "Memberships_Select" ON vve_memberships;


-- Re-create Select (Safe, uses Cache)
CREATE POLICY "Memberships_Select" ON vve_memberships FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_super_admin()
  OR vve_id = ANY(get_my_vve_ids())
);

-- Re-create Write (Safe, uses new Function)
-- We split into Insert/Update/Delete for clarity, but logic is similar.

-- UPDATE/DELETE: Only Admin/Manager/Board of THAT VvE can modify
CREATE POLICY "Memberships_Modify" ON vve_memberships FOR UPDATE TO authenticated
USING (
  is_super_admin() 
  OR get_my_role(vve_id) IN ('admin', 'manager', 'board') -- Safe function call
);

CREATE POLICY "Memberships_Delete" ON vve_memberships FOR DELETE TO authenticated
USING (
  is_super_admin() 
  OR get_my_role(vve_id) IN ('admin', 'manager', 'board')
);

-- INSERT: Usually invites. For now, allow Admins/Managers to insert for their VvEs.
CREATE POLICY "Memberships_Insert" ON vve_memberships FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin() 
  OR get_my_role(vve_id) IN ('admin', 'manager', 'board')
);


-- 3. Cleanup Legacy Policies on Agenda (just in case they use unsafe functions)
-- We'll replace the raw queries with our safe cache/role functions
DROP POLICY IF EXISTS "Manage events in accessible VvEs" ON agenda_events;
DROP POLICY IF EXISTS "Users can view events in their VvEs" ON agenda_events;
DROP POLICY IF EXISTS "Users can create events in their VvEs" ON agenda_events;

-- New Agenda Policies
CREATE POLICY "Agenda_Select" ON agenda_events FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR vve_id = ANY(get_my_vve_ids()) -- Safe Cache check
);

CREATE POLICY "Agenda_Modify" ON agenda_events FOR ALL TO authenticated
USING (
  is_super_admin()
  OR get_my_role(vve_id) IN ('admin', 'manager', 'board', 'tech_comm', 'audit_comm') 
);

-- Same for Categories
DROP POLICY IF EXISTS "Users can view categories in their VvE" ON event_categories;
DROP POLICY IF EXISTS "Users can create categories in their VvE" ON event_categories;

CREATE POLICY "Categories_Select" ON event_categories FOR SELECT TO authenticated
USING (
  vve_id = ANY(get_my_vve_ids())
);

CREATE POLICY "Categories_Modify" ON event_categories FOR ALL TO authenticated
USING (
  is_super_admin()
  OR get_my_role(vve_id) IN ('admin', 'manager', 'board')
);

-- Clean permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
