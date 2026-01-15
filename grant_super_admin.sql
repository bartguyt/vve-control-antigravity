-- GRANT SUPER ADMIN
-- Updates specific user to be super admin.
-- Idempotent: safe to run multiple times.

UPDATE public.profiles
SET is_super_admin = TRUE
WHERE id = '3efbb432-a923-446b-896e-3866fb9718b6';

-- Verify
SELECT id, email, is_super_admin FROM public.profiles WHERE id = '3efbb432-a923-446b-896e-3866fb9718b6';
