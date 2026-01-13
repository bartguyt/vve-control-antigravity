-- INSERT INITIAL PROFILE
-- Replace YOUR_USER_ID_HERE with your actual User UID from Supabase Authentication

-- 1. Create a new VvE for yourself
with new_vve as (
  insert into public.vves (name)
  values ('Mijn Eerste VvE')
  returning id
)
-- 2. Create your Profile linked to that VvE and your User ID
insert into public.profiles (
  user_id, 
  vve_id, 
  role, 
  email,
  straat,
  lid_nummer
)
select 
  'YOUR_USER_ID_HERE'::uuid, -- <--- PASTE YOUR UUID HERE!
  id, 
  'admin', 
  'mijn.email@example.com', -- You can update this
  'Hoofdstraat',
  '001'
from new_vve;
