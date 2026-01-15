-- MIGRATION: TASKS MODULE
-- Description: Adds maintenance_tasks table and RLS policies.

-- 1. Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vve_id UUID REFERENCES public.vves(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('open', 'scheduled', 'completed', 'cancelled')) DEFAULT 'open',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Internal assignment
    created_by UUID REFERENCES public.profiles(id) DEFAULT auth.uid(), -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- READ: All members of the VvE can see tasks (Transparency)
DROP POLICY IF EXISTS "Users can view tasks in their VvEs" ON maintenance_tasks;
CREATE POLICY "Users can view tasks in their VvEs" ON maintenance_tasks
FOR SELECT USING (has_access_to_vve(vve_id));

-- WRITE: Only Tech Comm, Board, Manager, Admin can manage
DROP POLICY IF EXISTS "Tech Comm and Board can manage tasks" ON maintenance_tasks;
CREATE POLICY "Tech Comm and Board can manage tasks" ON maintenance_tasks
FOR ALL USING (
    has_access_to_vve(vve_id) AND (
        has_role_in_vve(vve_id, 'tech_comm') OR
        has_role_in_vve(vve_id, 'board') OR
        has_role_in_vve(vve_id, 'manager') OR
        has_role_in_vve(vve_id, 'admin')
    )
);

-- 4. Triggers
-- Add updated_at trigger if generic function exists, or inline it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_maintenance_tasks_updated_at ON maintenance_tasks;
CREATE TRIGGER update_maintenance_tasks_updated_at
    BEFORE UPDATE ON maintenance_tasks
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
