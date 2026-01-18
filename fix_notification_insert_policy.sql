-- Allow authenticated users (Admins/Board/Managers) to CREATE notifications
-- E.g. when logging a dispute or system event

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
    -- User must be part of the association
    exists (
        select 1 from association_memberships am
        where am.user_id = auth.uid()
        and am.association_id = notifications.association_id
    )
);
