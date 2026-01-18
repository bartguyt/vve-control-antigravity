-- Enable Realtime for notifications table
-- This allows the frontend to receive instant updates when notifications change

-- First, check if the publication exists
DO $$
BEGIN
    -- Enable realtime for the notifications table
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
    WHEN duplicate_object THEN
        -- Table already added to publication
        NULL;
END $$;

-- Verify the setup
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'notifications';
