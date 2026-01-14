-- COMPLETE REPAIR SCRIPT FOR RLS RECURSION
-- This script drops the problematic functions with CASCADE (removing dependent policies)
-- and then immediately recreates them and the policies to restore security.

-- 1. DROP FUNCTIONS AND DEPENDENT POLICIES
DROP FUNCTION IF EXISTS get_my_vve_id() CASCADE;
DROP FUNCTION IF EXISTS get_my_role() CASCADE;

-- 2. RECREATE FUNCTIONS (SECURITY DEFINER = Bypasses RLS loop)
CREATE OR REPLACE FUNCTION get_my_vve_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT vve_id FROM profiles WHERE user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE user_id = auth.uid());
END;
$$;

-- 3. RECREATE POLICIES FOR ALL AFFECTED TABLES

-- A. PROFILES (The source of recursion)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "View members of same VvE" ON profiles
FOR SELECT USING (vve_id = get_my_vve_id());

CREATE POLICY "Insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins update vve members" ON profiles
FOR UPDATE USING (get_my_role() = 'admin' AND vve_id = get_my_vve_id());

-- B. VVES
ALTER TABLE vves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own VvE" ON vves
FOR SELECT USING (id = get_my_vve_id());

-- C. DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view documents in their VvE" ON documents
FOR SELECT USING (vve_id = get_my_vve_id());

CREATE POLICY "Admins can manage documents" ON documents
FOR ALL USING (vve_id = get_my_vve_id() AND get_my_role() = 'admin');

-- D. AGENDA / EVENTS / CATEGORIES
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view categories in their VvE" ON event_categories
FOR SELECT USING (vve_id = get_my_vve_id());

CREATE POLICY "Users can create categories in their VvE" ON event_categories
FOR INSERT WITH CHECK (vve_id = get_my_vve_id());

ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view events in their VvE" ON agenda_events
FOR SELECT USING (vve_id = get_my_vve_id());

CREATE POLICY "All members can create events" ON agenda_events
FOR INSERT WITH CHECK (vve_id = get_my_vve_id());

CREATE POLICY "Users can manage their own events or Admins manage all" ON agenda_events
FOR ALL USING (
    vve_id = get_my_vve_id() AND (
        created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR 
        get_my_role() = 'admin'
    )
);

-- E. ACTIVITY LOGS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view activities in their VvE" ON activity_logs
FOR SELECT USING (vve_id = get_my_vve_id());

CREATE POLICY "Users can insert activity logs" ON activity_logs
FOR INSERT WITH CHECK (true); -- Often needed for logging actions

-- F. BANKING (Updated to use secure functions)
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view bank connections for their VvE" ON bank_connections
FOR SELECT USING (vve_id = get_my_vve_id());

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view bank accounts for their VvE" ON bank_accounts
FOR SELECT USING (vve_id = get_my_vve_id());

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view bank transactions for their VvE" ON bank_transactions
FOR SELECT USING (vve_id = get_my_vve_id());

-- G. AGENDA EVENT CATEGORIES (Junction table)
ALTER TABLE agenda_event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view junction" ON agenda_event_categories
FOR SELECT USING (
    event_id IN (SELECT id FROM agenda_events WHERE vve_id = get_my_vve_id())
);

CREATE POLICY "Users can insert junction" ON agenda_event_categories
FOR INSERT WITH CHECK (
    event_id IN (SELECT id FROM agenda_events WHERE vve_id = get_my_vve_id())
);

CREATE POLICY "Users can delete junction" ON agenda_event_categories
FOR DELETE USING (
    event_id IN (SELECT id FROM agenda_events WHERE vve_id = get_my_vve_id())
);
