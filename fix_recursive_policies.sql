-- Fix for infinite recursion in RLS policies (CORS/502 Error)

-- 0. Drop existing functions to avoid return type conflict errors
DROP FUNCTION IF EXISTS get_my_vve_id();
DROP FUNCTION IF EXISTS get_my_role();

-- 1. Create a secure helper to get the current user's VvE ID without triggering RLS
CREATE OR REPLACE FUNCTION get_my_vve_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- bypassing RLS for this function
SET search_path = public -- prevent hijacking
AS $$
BEGIN
  RETURN (SELECT vve_id FROM profiles WHERE user_id = auth.uid());
END;
$$;

-- 2. Create a secure helper to get the current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE user_id = auth.uid());
END;
$$;

-- 3. Drop potentially recursive policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view members of same VvE" ON profiles;

-- 4. Re-create safe policies using the functions
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "View own profile" ON profiles
FOR SELECT USING (
  auth.uid() = user_id
);

-- Allow users to view profiles in their VvE (using the secure function)
CREATE POLICY "View members of same VvE" ON profiles
FOR SELECT USING (
  vve_id = get_my_vve_id()
);

-- Allow users to insert their own profile
CREATE POLICY "Insert own profile" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Allow users to update their own profile
CREATE POLICY "Update own profile" ON profiles
FOR UPDATE USING (
  auth.uid() = user_id
);

-- Allow admins to update any profile in their VvE
CREATE POLICY "Admins update all in VvE" ON profiles
FOR UPDATE USING (
  get_my_role() = 'admin' AND vve_id = get_my_vve_id()
);
