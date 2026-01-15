-- 1. FIX COLUMNS
-- Update Profiles with extended personal info
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS lid_nummer TEXT,
ADD COLUMN IF NOT EXISTS straat TEXT,
ADD COLUMN IF NOT EXISTS huisnummer TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS stad TEXT,
ADD COLUMN IF NOT EXISTS telefoonnummer TEXT;

-- Update Bank Transactions
ALTER TABLE public.bank_transactions
ADD COLUMN IF NOT EXISTS counterparty_iban TEXT,
ADD COLUMN IF NOT EXISTS counterparty_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'booked'; -- Fix missing status column

-- Ensure member_ibans exists
CREATE TABLE IF NOT EXISTS public.member_ibans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    iban TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, iban)
);

-- 2. FIX RLS FOR SEEDING (Profiles)
-- Allow Board/Admins to INSERT/UPDATE/DELETE profiles (for member management & seeding)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Board and Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Board and Admins can manage all profiles"
ON public.profiles FOR ALL
USING (
    -- User is admin/board in ANY VvE (simplified for now to unblock seeding)
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin', 'board')
    )
    OR
    -- Or is super admin
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
    OR
    -- Or is the user themselves
    id = auth.uid()
);

-- 3. FIX RLS FOR MEMBER_IBANS
ALTER TABLE public.member_ibans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Board and Admins can manage IBANs" ON public.member_ibans;
CREATE POLICY "Board and Admins can manage IBANs"
ON public.member_ibans FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.vve_memberships m
        WHERE m.user_id = auth.uid()
        AND m.role IN ('bestuur', 'manager', 'admin', 'board', 'audit_comm')
    )
    OR
    user_id = auth.uid()
);

-- 4. RELOAD CACHE
NOTIFY pgrst, 'reload schema';
