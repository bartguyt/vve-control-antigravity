-- FULL DIAGNOSTIC SCRIPT
-- Inspecting all relevant policies and function properties.

-- 1. List Policies for key tables
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('vve_memberships', 'profiles', 'agenda_events', 'event_categories', 'agenda_event_categories')
ORDER BY tablename, policyname;

-- 2. Check get_my_vve_ids properties
-- prosecdef = true means SECURITY DEFINER
SELECT proname, prosecdef, proowner::regrole, prosrc 
FROM pg_proc 
WHERE proname = 'get_my_vve_ids';

-- 3. Check table owners and RLS status
SELECT schemaname, tablename, tableowner, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('vve_memberships', 'sys_membership_cache', 'profiles', 'agenda_events');

-- 4. Check if sys_membership_cache is Table or View
SELECT table_type 
FROM information_schema.tables 
WHERE table_name = 'sys_membership_cache';
