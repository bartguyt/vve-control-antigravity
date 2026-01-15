-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vve_id UUID NOT NULL REFERENCES public.vves(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL, -- Link to quote/invoice
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('concept', 'sent', 'accepted', 'completed', 'paid', 'refused')),
    amount DECIMAL(10, 2), -- Monetary value
    scheduled_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Helper function for timestamps
CREATE OR REPLACE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Policies

-- 1. Read: All members of the VvE can see assignments (Transparancy)
CREATE POLICY "Leden kunnen opdrachten zien"
ON public.assignments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.vve_id = assignments.vve_id
        AND m.user_id = auth.uid()
    )
);

-- 2. Write: Only Board, Managers, Admins can manage assignments
CREATE POLICY "Bestuur kan opdrachten beheren_insert"
ON public.assignments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.vve_id = vve_id
        AND m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin', 'tech_comm')
    )
);

CREATE POLICY "Bestuur kan opdrachten beheren_update"
ON public.assignments
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.vve_id = vve_id
        AND m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin', 'tech_comm')
    )
);

CREATE POLICY "Bestuur kan opdrachten beheren_delete"
ON public.assignments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.vve_id = vve_id
        AND m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin', 'tech_comm')
    )
);
