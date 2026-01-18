-- Create Proposals & Voting Schema

BEGIN;

-- 1. ENUMS
CREATE TYPE public.meeting_status AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.proposal_status AS ENUM ('DRAFT', 'OPEN', 'ACCEPTED', 'REJECTED');
CREATE TYPE public.proposal_type AS ENUM ('NORMAL', 'SPECIAL', 'UNANIMOUS'); -- Normal (>50%), Special (>66%), Unanimous (100%)
CREATE TYPE public.vote_choice AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- 2. MEETINGS TABLE
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    status public.meeting_status DEFAULT 'PLANNED',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL, -- Can exist without meeting? Maybe.
    title TEXT NOT NULL,
    description TEXT,
    type public.proposal_type DEFAULT 'NORMAL',
    status public.proposal_status DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. VOTES TABLE
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE, -- The Unit
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- The Audit (Person)
    choice public.vote_choice NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1, -- Snapshot of weight
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(proposal_id, member_id) -- One vote per UNIT per proposal
);

-- 5. RLS POLICIES

-- Meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meetings_Select" ON public.meetings FOR SELECT TO authenticated
USING ( 
    public.has_access_to_association(association_id) 
);

CREATE POLICY "Meetings_Manage" ON public.meetings FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager')
);

-- Proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proposals_Select" ON public.proposals FOR SELECT TO authenticated
USING ( 
    public.has_access_to_association(association_id) 
);

CREATE POLICY "Proposals_Manage" ON public.proposals FOR ALL TO authenticated
USING ( 
    public.is_super_admin() OR 
    public.has_role_in_association(association_id, 'admin') OR
    public.has_role_in_association(association_id, 'board') OR
    public.has_role_in_association(association_id, 'manager')
);

-- Votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Everyone in the association can see who voted what? Transparent democracy usually implies yes.
CREATE POLICY "Votes_Select" ON public.votes FOR SELECT TO authenticated
USING ( 
    EXISTS (
        SELECT 1 FROM public.proposals p
        WHERE p.id = public.votes.proposal_id
        AND public.has_access_to_association(p.association_id)
    )
);

-- Insert: Only if you are the user linked to the member
-- AND the proposal is OPEN
CREATE POLICY "Votes_Insert" ON public.votes FOR INSERT TO authenticated
WITH CHECK (
    -- 1. Proposal is OPEN
    EXISTS (
        SELECT 1 FROM public.proposals p
        WHERE p.id = proposal_id
        AND p.status = 'OPEN'
    )
    AND
    -- 2. User owns the Member (Unit)
    EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = member_id
        AND m.profile_id = auth.uid()
    )
    -- 3. Audit trail matches
    AND user_id = auth.uid()
);

-- Users can change their vote if still OPEN?
CREATE POLICY "Votes_Update" ON public.votes FOR UPDATE TO authenticated
USING (
    user_id = auth.uid() 
    AND 
    EXISTS (
        SELECT 1 FROM public.proposals p
        WHERE p.id = proposal_id
        AND p.status = 'OPEN'
    )
);

COMMIT;

NOTIFY pgrst, 'reload schema';
