-- MIGRATION: Split profiles into members (UNITS) and profiles (PERSONS)

-- 1. Create 'members' table (The Unit/Apartment)
CREATE TABLE IF NOT EXISTS public.members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    
    -- Link to the current owner (Profile)
    -- This is nullable because a unit might be empty or in transition? 
    -- Or if we want to support history, maybe this is just 'current_resident'?
    -- Let's stick to 'profile_id' as the owner/primary contact.
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Unit details (Moved from profiles)
    member_number TEXT, -- E.g. "12" or "A-1"
    building_number TEXT,
    street TEXT,
    house_number TEXT,
    zip_code TEXT,
    city TEXT,
    
    -- Voting & Financials
    fraction INTEGER DEFAULT 1, -- Voting weight / Cost split fraction
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Migrate Data from 'profiles' to 'members'
-- We create a member entry for every profile that has an association_id
INSERT INTO public.members (
    association_id,
    profile_id,
    member_number,
    building_number,
    street,
    house_number,
    zip_code,
    city,
    created_at,
    updated_at
)
SELECT 
    association_id,
    id, -- The profile_id
    member_number,
    building_number,
    street,
    house_number,
    zip_code,
    city,
    created_at,
    updated_at
FROM public.profiles
WHERE association_id IS NOT NULL;

-- 3. Validation / Future Cleanup (Commented out for safety first)
-- After verifying migration, we would run:
/*
ALTER TABLE public.profiles 
    DROP COLUMN association_id,
    DROP COLUMN member_number,
    DROP COLUMN building_number,
    DROP COLUMN street,
    DROP COLUMN house_number,
    DROP COLUMN zip_code,
    DROP COLUMN city;
*/

-- 4. Enable RLS on 'members'
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Policy: Select
-- Visible to:
-- 1. Super Admin
-- 2. Members of the SAME association (Colleague check)
-- 3. The owner themselves (redundant if 2 covers it, but explicit is good)
CREATE POLICY "Members_Select" ON public.members FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR association_id = ANY(get_my_association_ids())
);

-- Policy: Insert/Update/Delete
-- Managed by Admins/Board of that Association or Super Admin
CREATE POLICY "Members_Manage" ON public.members FOR ALL TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM association_memberships m
    WHERE m.association_id = members.association_id
    AND m.user_id = auth.uid()
    AND m.role IN ('admin', 'manager', 'board')
  )
);

-- 5. Fix relationships
-- We might need to update any foreign keys that pointed to 'profiles' but really meant 'members'.
-- Candidate: 'member_contributions'? 'votes'?
-- Let's look at `member_contributions`. Usually contributions are per UNIT.
-- If `member_contributions` has `profile_id`, it should probably change to `member_id`.
-- For now, we will leave other tables as is to avoid breaking changes in one go. 
-- We can link via `members.profile_id` temporarily.

NOTIFY pgrst, 'reload schema';
