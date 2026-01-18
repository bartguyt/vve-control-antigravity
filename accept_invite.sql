-- Accept Admin Invite Function

CREATE OR REPLACE FUNCTION public.accept_admin_invite(invite_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invite_record RECORD;
    user_email TEXT;
    user_profile_id UUID;
BEGIN
    -- 1. Get current user email and ID
    user_email := auth.email();
    
    IF user_email IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Find valid invite
    SELECT * INTO invite_record
    FROM admin_invites
    WHERE token = invite_token
      AND used = FALSE
      AND expires_at > NOW();

    IF invite_record IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invite token';
    END IF;

    -- 3. Verify email match
    -- We require the authenticated user's email to match the invite email.
    -- Assuming case-insensitive match just in case.
    IF LOWER(invite_record.email) != LOWER(user_email) THEN
        RAISE EXCEPTION 'Invite email does not match current user';
    END IF;

    -- 4. Update Profile
    UPDATE profiles
    SET is_super_admin = TRUE
    WHERE user_id = auth.uid()
    RETURNING id INTO user_profile_id;

    IF user_profile_id IS NULL THEN
        -- Maybe profile doesn't exist yet? (Should exist if user is logged in)
        -- If allow_ghost_profiles is on, maybe we need to create it?
        -- For now, assume profile exists.
        RAISE EXCEPTION 'Profile not found for user';
    END IF;

    -- 5. Mark invite as used
    UPDATE admin_invites
    SET used = TRUE
    WHERE id = invite_record.id;

    RETURN jsonb_build_object('success', true, 'role', 'super_admin');
END;
$$;
