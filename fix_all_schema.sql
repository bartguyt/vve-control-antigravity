-- Fix 1: Add INSERT policy for activity_logs
-- Enable RLS just in case
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Enable insert for authenticated users"
ON activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix 2: Add preferences column for the Tagging UI setting
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
