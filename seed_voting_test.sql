-- SEED VOTING TEST DATA
-- Finds the first association the user is part of and adds a meeting + proposal

DO $$
DECLARE
    v_association_id UUID;
    v_meeting_id UUID;
    v_member_id UUID;
BEGIN
    -- 1. Get an Association ID (Assumption: User is running this, or we fallback to one)
    SELECT id INTO v_association_id
    FROM public.associations
    LIMIT 1;

    IF v_association_id IS NULL THEN
        RAISE NOTICE 'No associations found to seed.';
        RETURN;
    END IF;

    -- 2. Create a Meeting
    INSERT INTO public.meetings (association_id, date, name, description, status)
    VALUES (
        v_association_id, 
        NOW() + INTERVAL '7 days', 
        'ALV ' || to_char(NOW(), 'YYYY'), 
        'General Assembly to discuss maintenance.',
        'ACTIVE'
    )
    RETURNING id INTO v_meeting_id;

    -- 3. Create a Proposal
    INSERT INTO public.proposals (association_id, meeting_id, title, description, type, status)
    VALUES (
        v_association_id,
        v_meeting_id,
        'Schilderwerk Kozijnen',
        'Het voorstel is om de kozijnen aan de voorzijde te laten schilderen door Schildersbedrijf Jansen voor €5.000.',
        'NORMAL',
        'OPEN'
    );

    RAISE NOTICE 'Created Meeting % and Proposal in Association %', v_meeting_id, v_association_id;
END $$;
