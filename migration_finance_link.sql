-- Create member_ibans table
CREATE TABLE IF NOT EXISTS public.member_ibans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    iban TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, iban)
);

-- Alter bank_transactions to add linked_member_id
ALTER TABLE public.bank_transactions
ADD COLUMN IF NOT EXISTS linked_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable RLS on member_ibans
ALTER TABLE public.member_ibans ENABLE ROW LEVEL SECURITY;

-- Policies for member_ibans

-- 1. View:
--    - Board/Admins/Managers/AuditComm can view ALL ibans (to link transactions)
--    - Users can view their OWN ibans
CREATE POLICY "Board and Audit can view all IBANs"
ON public.member_ibans FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin', 'audit_comm')
    )
    OR
    user_id = auth.uid()
);

-- 2. Manage:
--    - Board/Admins/Managers can manage all
--    - Users can manage their own (maybe? let's allow it for now)
CREATE POLICY "Board and Admins can manage IBANs"
ON public.member_ibans FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin')
    )
    OR
    user_id = auth.uid()
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
