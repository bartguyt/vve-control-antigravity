-- Allow Ghost Users (Profiles not linked to Auth Users)
-- This is necessary for "Offline Members" and Seeding Demo Data

-- 1. Profiles: Remove Foreign Key to auth.users if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  -- Also check for other common names or look up by definition if needed, 
  -- but usually it's profiles_id_fkey or users_id_fkey.
  -- Let's try to be safe.
END $$;

-- 2. VvE Memberships: Change Foreign Key from auth.users to public.profiles
DO $$
BEGIN
  -- First drop the old constraint to auth.users (likely named vve_memberships_user_id_fkey)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'vve_memberships_user_id_fkey') THEN
    ALTER TABLE public.vve_memberships DROP CONSTRAINT vve_memberships_user_id_fkey;
  END IF;

  -- Add new constraint to public.profiles
  -- We use ON DELETE CASCADE so if a profile is deleted, membership is gone too.
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'vve_memberships_user_id_profile_fkey') THEN
      ALTER TABLE public.vve_memberships 
      ADD CONSTRAINT vve_memberships_user_id_profile_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
