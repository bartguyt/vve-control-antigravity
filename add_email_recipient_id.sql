-- Add recipient_id to outbound_emails
ALTER TABLE public.outbound_emails 
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
