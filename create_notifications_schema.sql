-- Create Notifications Schema

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    association_id uuid REFERENCES public.associations(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'financial_dispute', 'system', 'reminder'
    title text NOT NULL,
    message text NOT NULL,
    priority text DEFAULT 'normal', -- 'normal', 'urgent'
    status text DEFAULT 'unread', -- 'unread', 'read', 'archived', 'converted_to_task'
    metadata jsonb, -- e.g. { "member_id": "...", "amount": 100 }
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Board members and above can view all notifications for their association
CREATE POLICY "Board can view notifications" 
ON public.notifications FOR SELECT 
USING (
    public.has_role_in_association(association_id, 'board') 
    OR public.has_role_in_association(association_id, 'admin')
    OR public.is_super_admin()
);

-- Board can update status (mark as read, etc)
CREATE POLICY "Board can update notifications" 
ON public.notifications FOR UPDATE 
USING (
    public.has_role_in_association(association_id, 'board') 
    OR public.has_role_in_association(association_id, 'admin')
    OR public.is_super_admin()
);

-- Create Admin Invites Schema (Global or Association based?)
-- Super Admin is GLOBAL. So it should not be linked to Association strictly, 
-- but users are always in an Association context generally. 
-- However, `is_super_admin` is a flag on `profiles`.

CREATE TABLE IF NOT EXISTS public.admin_invites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'super_admin',
    token uuid DEFAULT gen_random_uuid(),
    expires_at timestamptz NOT NULL,
    used boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- RLS for Invites
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can SELECT/INSERT
CREATE POLICY "Super Admins can manage invites" 
ON public.admin_invites FOR ALL 
USING (public.is_super_admin());

-- Public (Anonymous) or Authenticated users need to verify token?
-- Usually the backend handles the verification via `supabase.rpc` or similar.
-- Or we allow SELECT by token?
CREATE POLICY "Anyone can verify invite by token" 
ON public.admin_invites FOR SELECT 
USING (true); -- Simplified for token lookup (token should be unique/unguessable)

