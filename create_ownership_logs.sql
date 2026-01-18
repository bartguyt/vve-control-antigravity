-- OWNERSHIP TRANSFER LOGS
-- Tracks history of Unit ownership

BEGIN;

-- 1. Create Log Table
CREATE TABLE IF NOT EXISTS public.ownership_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    previous_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    new_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    transfer_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS for Logs
ALTER TABLE public.ownership_logs ENABLE ROW LEVEL SECURITY;

-- View: Admins, Board, and the users involved (prev/new)
DROP POLICY IF EXISTS "Logs_Select" ON public.ownership_logs;
CREATE POLICY "Logs_Select" ON public.ownership_logs FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    -- Admin/Board of the association this member belongs to
    EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = ownership_logs.member_id
        AND (
            public.has_role_in_association(m.association_id, 'admin') OR
            public.has_role_in_association(m.association_id, 'board') OR
            public.has_role_in_association(m.association_id, 'manager')
        )
    ) OR
    -- The users themselves
    previous_profile_id = auth.uid() OR
    new_profile_id = auth.uid()
);

-- Manage: Only Admins/Board/Manager
DROP POLICY IF EXISTS "Logs_Manage" ON public.ownership_logs;
CREATE POLICY "Logs_Manage" ON public.ownership_logs FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = ownership_logs.member_id
        AND (
            public.has_role_in_association(m.association_id, 'admin') OR
            public.has_role_in_association(m.association_id, 'board') OR
            public.has_role_in_association(m.association_id, 'manager')
        )
    )
);

-- 3. Helper Function for Atomic Transfer
CREATE OR REPLACE FUNCTION public.transfer_unit_ownership(
    p_member_id UUID,
    p_new_profile_id UUID,
    p_notes TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prev_profile_id UUID;
    v_association_id UUID;
    v_executer UUID;
BEGIN
    v_executer := auth.uid();

    -- Get current state
    -- Get current state
    SELECT profile_id, association_id INTO v_prev_profile_id, v_association_id
    FROM public.members
    WHERE id = p_member_id;

    IF NOT FOUND THEN
       RAISE EXCEPTION 'Member % not found in database.', p_member_id;
    END IF;
    
    -- Check permissions (Must be Admin/Board of this Association OR the Current Owner)
    IF NOT public.is_super_admin() 
       AND v_prev_profile_id IS DISTINCT FROM v_executer -- Allow Self-Transfer
       AND NOT EXISTS (
        SELECT 1 FROM public.association_memberships
        WHERE user_id = v_executer 
        AND association_id = v_association_id
        AND role IN ('admin', 'board', 'manager')
    ) THEN
        RAISE EXCEPTION 'Not authorized. Executer: %, PrevOwner: %, Assoc: %, Super: %, Role Found: %', 
            v_executer, 
            v_prev_profile_id,
            v_association_id, 
            public.is_super_admin(),
            (SELECT role FROM public.association_memberships WHERE user_id = v_executer AND association_id = v_association_id LIMIT 1);
    END IF;

    -- Update Member
    UPDATE public.members
    SET profile_id = p_new_profile_id,
        updated_at = now()
    WHERE id = p_member_id;

    -- Log it
    INSERT INTO public.ownership_logs (
        member_id, previous_profile_id, new_profile_id, notes, created_by
    ) VALUES (
        p_member_id, v_prev_profile_id, p_new_profile_id, p_notes, v_executer
    );
END;
$$;

-- Grant
GRANT EXECUTE ON FUNCTION public.transfer_unit_ownership(UUID, UUID, TEXT) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
