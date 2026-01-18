-- EMERGENCY FIX RLS
-- Purpose: Break infinite recursion by temporarily simplifying policies to specific user-only access.
-- This will resolve the 500 errors but temporarily limit visibility of other users' data.

BEGIN;

-- 1. Drop existing policies on problematic tables
DROP POLICY IF EXISTS "Memberships_Select" ON public.association_memberships;
DROP POLICY IF EXISTS "Memberships_Manage" ON public.association_memberships;
DROP POLICY IF EXISTS "Profiles_Select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Update" ON public.profiles;

-- 2. Create SIMPLE, NON-RECURSIVE policies
-- Association Memberships: User can only see THEIR OWN memberships.
-- No references to 'is_super_admin' or 'get_my_association_ids' (which might be broken)
CREATE POLICY "Memberships_Select_Simple" ON public.association_memberships
FOR SELECT TO authenticated
USING ( user_id = auth.uid() );

CREATE POLICY "Memberships_Manage_Simple" ON public.association_memberships
FOR ALL TO authenticated
USING ( user_id = auth.uid() ); -- Ideally restrict this more but for now allow self-manage

-- Profiles: User can only see THEIR OWN profile.
CREATE POLICY "Profiles_Select_Simple" ON public.profiles
FOR SELECT TO authenticated
USING ( id = auth.uid() );

CREATE POLICY "Profiles_Update_Simple" ON public.profiles
FOR UPDATE TO authenticated
USING ( id = auth.uid() );

-- 3. Associations: Allow seeing ANY association for now (low risk info) to prevent joining errors
DROP POLICY IF EXISTS "Associations_Select" ON public.associations;
CREATE POLICY "Associations_Select_Public" ON public.associations
FOR SELECT TO authenticated
USING ( true );

COMMIT;

NOTIFY pgrst, 'reload schema';
