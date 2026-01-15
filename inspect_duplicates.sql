-- Inspect duplicates for specific email
SELECT id, user_id, email, is_super_admin, created_at
FROM profiles
WHERE email = 'bartguyt@gmail.com' OR email = 'bart@guijt.nl';
