-- Outbound Emails Queue
-- Since we don't have a direct SMTP connection in the frontend, 
-- we store emails here. A dedicated Edge Function or Trigger would pick these up and send them via Resend/SendGrid.

CREATE TABLE IF NOT EXISTS public.outbound_emails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    association_id uuid REFERENCES public.associations(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at timestamptz,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.outbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board can view and create emails" 
ON public.outbound_emails FOR ALL 
USING (
    public.has_role_in_association(association_id, 'board') 
    OR public.has_role_in_association(association_id, 'admin')
    OR public.is_super_admin()
);
