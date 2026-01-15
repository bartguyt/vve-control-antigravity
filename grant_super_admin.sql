-- Make sure your own user is a Super Admin
-- Replace the email address below with your own login email!

UPDATE profiles
SET is_super_admin = true
WHERE email = 'bart@guijt.nl'; -- of jouw emailadres

-- Optional: Verify it worked
SELECT id, email, is_super_admin FROM profiles WHERE is_super_admin = true;
