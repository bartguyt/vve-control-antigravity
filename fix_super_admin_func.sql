-- Make is_super_admin robust
-- It should check the separate app_admins table to avoid recursion and profile-id confusion.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM app_admins 
    WHERE user_id = auth.uid()
  );
$$;

-- Grant execute so RLS can use it
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;
