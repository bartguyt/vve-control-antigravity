-- migration: fix_profiles_nomenclature.sql
-- Renames Dutch columns to English and ensures missing ones exist.
-- This aligns the DB schema with src/types/database.ts and frontend usage.

DO $$ 
BEGIN
    -- 1. Rename columns if they exist under Dutch names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'lid_nummer') THEN
        ALTER TABLE public.profiles RENAME COLUMN lid_nummer TO member_number;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bouwnummer') THEN
        ALTER TABLE public.profiles RENAME COLUMN bouwnummer TO building_number;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'straat') THEN
        ALTER TABLE public.profiles RENAME COLUMN straat TO street;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'huisnummer') THEN
        ALTER TABLE public.profiles RENAME COLUMN huisnummer TO house_number;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'postcode') THEN
        ALTER TABLE public.profiles RENAME COLUMN postcode TO zip_code;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stad') THEN
        ALTER TABLE public.profiles RENAME COLUMN stad TO city;
    END IF;

    -- Handle both 'telefoon' and 'telefoonnummer'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'telefoonnummer') THEN
        ALTER TABLE public.profiles RENAME COLUMN telefoonnummer TO phone_number;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'telefoon') THEN
        ALTER TABLE public.profiles RENAME COLUMN telefoon TO phone_number;
    END IF;

    -- 2. Ensure all English columns exist (in case they weren't in Dutch either)
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_number TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS building_number TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS house_number TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vve_id UUID;
    
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
