-- Rename columns in 'profiles' table to English
ALTER TABLE profiles RENAME COLUMN lid_nummer TO member_number;
ALTER TABLE profiles RENAME COLUMN bouwnummer TO building_number;
ALTER TABLE profiles RENAME COLUMN straat TO street;
ALTER TABLE profiles RENAME COLUMN huisnummer TO house_number;
ALTER TABLE profiles RENAME COLUMN postcode TO zip_code;
ALTER TABLE profiles RENAME COLUMN stad TO city;
ALTER TABLE profiles RENAME COLUMN telefoonnummer TO phone_number;

-- Rename membership roles from 'lid' to 'member'
UPDATE vve_memberships SET role = 'member' WHERE role = 'lid';

-- Note: If 'role' is an enum type, you may need:
-- ALTER TYPE app_role RENAME VALUE 'lid' TO 'member';

-- Update RLS policies if they reference these columns directly (unlikely to be hardcoded in SQL names, but good to check)
-- Usually policies use column names. If they do, postgres handles rename automatically in standard views/triggers, 
-- but let's be sure.
