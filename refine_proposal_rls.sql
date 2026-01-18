-- Split Proposals_Manage into granular policies to enforce Deletion rules

BEGIN;

-- Drop the old blanket policy
DROP POLICY IF EXISTS "Proposals_Manage" ON public.proposals;

-- 1. INSERT / UPDATE: Admins/Board/Managers can do this freely
CREATE POLICY "Proposals_Modify" ON public.proposals FOR INSERT TO authenticated
WITH CHECK ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager')
);

CREATE POLICY "Proposals_Update" ON public.proposals FOR UPDATE TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager')
);

-- 2. DELETE: Super Admin (Always) OR Manager (If NO VOTES)
CREATE POLICY "Proposals_Delete" ON public.proposals FOR DELETE TO authenticated
USING ( 
    -- Case A: Super Admin
    public.is_super_admin() 
    OR 
    (
        -- Case B: Association Admin/Manager AND No Votes exist
        (
            public.has_role_in_association(association_id, 'admin') OR
            public.has_role_in_association(association_id, 'board') OR
            public.has_role_in_association(association_id, 'manager')
        )
        AND 
        NOT EXISTS (
            SELECT 1 FROM public.votes 
            WHERE votes.proposal_id = public.proposals.id
        )
    )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
