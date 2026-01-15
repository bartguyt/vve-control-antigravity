-- Allow authenticated users to insert into activity_logs
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;
CREATE POLICY "Users can insert activity logs"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view all logs (necessary for the Overview feed)
DROP POLICY IF EXISTS "Users can view all activity logs" ON activity_logs;
CREATE POLICY "Users can view all activity logs"
ON activity_logs
FOR SELECT
TO authenticated
USING (true);
