-- Fix Foreign Key relationship for outbound_emails -> profiles

-- 1. Ensure the column exists
ALTER TABLE outbound_emails 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id);

-- 2. Explicitly add the constraint name to be sure Supabase picks it up
-- Dropping first to avoid conflicts if it exists but is broken
ALTER TABLE outbound_emails DROP CONSTRAINT IF EXISTS outbound_emails_recipient_id_fkey;

ALTER TABLE outbound_emails
ADD CONSTRAINT outbound_emails_recipient_id_fkey
FOREIGN KEY (recipient_id) REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 3. Reload schema cache (notify PostgREST)
NOTIFY pgrst, 'reload config';

-- 4. Verify RLS
ALTER TABLE outbound_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all emails" ON outbound_emails;
CREATE POLICY "Admins can view all emails"
ON outbound_emails FOR SELECT
TO authenticated
USING (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.is_super_admin = true
    )
);
