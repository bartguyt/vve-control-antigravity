-- Add profile_id column referencing public.profiles
ALTER TABLE public.activity_logs 
ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill profile_id based on user_id
UPDATE public.activity_logs 
SET profile_id = (
    SELECT id FROM public.profiles 
    WHERE profiles.user_id = activity_logs.user_id
    LIMIT 1
);

-- Now safely remove user_id column
ALTER TABLE public.activity_logs DROP COLUMN user_id;

-- RLS Policy Update (since we removed user_id, we might need to adjust if any policy used it)
-- The policy "Users can view activities in their VvE" uses vve_id, which is fine.
-- "Users can manage their own events" was for agenda, not activity_logs.
-- activity_logs is generally insert-only for users.

-- Re-create policy just to be safe if we had one using user_id
DROP POLICY IF EXISTS "Users can view activities in their VvE" ON public.activity_logs;
CREATE POLICY "Users can view activities in their VvE"
    ON public.activity_logs FOR SELECT
    USING (vve_id = get_my_vve_id());
