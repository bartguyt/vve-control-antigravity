-- Fix maintenance_tasks RLS policies to allow INSERT
-- The existing policy only allows SELECT, UPDATE, DELETE but not INSERT for regular users

-- Drop the old policy
DROP POLICY IF EXISTS "Tech Comm and Board can manage tasks" ON public.maintenance_tasks;

-- Create separate policies for better control
-- SELECT: All members can view
DROP POLICY IF EXISTS "Users can view tasks in their VvEs" ON public.maintenance_tasks;
CREATE POLICY "Users can view tasks in their VvEs" 
ON public.maintenance_tasks
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM association_memberships am
        WHERE am.user_id = auth.uid()
        AND am.association_id = maintenance_tasks.association_id
    )
);

-- INSERT: Tech Comm, Board, Manager, Admin can create
CREATE POLICY "Authorized users can create tasks" 
ON public.maintenance_tasks
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM association_memberships am
        WHERE am.user_id = auth.uid()
        AND am.association_id = maintenance_tasks.association_id
        AND am.role IN ('tech_comm', 'board', 'manager', 'admin')
    )
);

-- UPDATE: Tech Comm, Board, Manager, Admin can update
CREATE POLICY "Authorized users can update tasks" 
ON public.maintenance_tasks
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM association_memberships am
        WHERE am.user_id = auth.uid()
        AND am.association_id = maintenance_tasks.association_id
        AND am.role IN ('tech_comm', 'board', 'manager', 'admin')
    )
);

-- DELETE: Tech Comm, Board, Manager, Admin can delete
CREATE POLICY "Authorized users can delete tasks" 
ON public.maintenance_tasks
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM association_memberships am
        WHERE am.user_id = auth.uid()
        AND am.association_id = maintenance_tasks.association_id
        AND am.role IN ('tech_comm', 'board', 'manager', 'admin')
    )
);
