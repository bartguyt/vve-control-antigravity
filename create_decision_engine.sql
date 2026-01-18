-- DECISION ENGINE
-- Logic to calculate proposal results based on Association Rules

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_proposal_result(p_proposal_id UUID)
RETURNS TABLE (
    total_votes INTEGER,
    for_votes INTEGER,
    against_votes INTEGER,
    abstain_votes INTEGER,
    total_weight INTEGER,
    for_weight INTEGER,
    against_weight INTEGER,
    abstain_weight INTEGER,
    quorum_reached BOOLEAN,
    is_accepted BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assoc_id UUID;
    v_strategy TEXT;
    v_quorum_pct INTEGER;
    v_total_members INTEGER;
    v_total_fraction INTEGER;
    
    -- Vote Counts
    v_count_total INTEGER := 0;
    v_count_for INTEGER := 0;
    v_count_against INTEGER := 0;
    v_count_abstain INTEGER := 0;
    
    -- Weight Counts
    v_weight_total INTEGER := 0;
    v_weight_for INTEGER := 0;
    v_weight_against INTEGER := 0;
    v_weight_abstain INTEGER := 0;
    
    -- Quorum Calc
    v_present_pct FLOAT;
    v_is_quorum BOOLEAN := TRUE;
    v_is_accepted BOOLEAN := FALSE;
BEGIN
    -- 1. Get Association Settings
    SELECT 
        a.id, a.voting_strategy, a.quorum_percentage
    INTO 
        v_assoc_id, v_strategy, v_quorum_pct
    FROM public.proposals p
    JOIN public.associations a ON a.id = p.association_id
    WHERE p.id = p_proposal_id;

    -- 2. Get Total Possible (for Quorum)
    SELECT COUNT(*), COALESCE(SUM(fraction), 0)
    INTO v_total_members, v_total_fraction
    FROM public.members
    WHERE association_id = v_assoc_id;

    -- 3. Tally Votes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE choice = 'FOR'),
        COUNT(*) FILTER (WHERE choice = 'AGAINST'),
        COUNT(*) FILTER (WHERE choice = 'ABSTAIN'),
        COALESCE(SUM(weight), 0),
        COALESCE(SUM(weight) FILTER (WHERE choice = 'FOR'), 0),
        COALESCE(SUM(weight) FILTER (WHERE choice = 'AGAINST'), 0),
        COALESCE(SUM(weight) FILTER (WHERE choice = 'ABSTAIN'), 0)
    INTO 
        v_count_total, v_count_for, v_count_against, v_count_abstain,
        v_weight_total, v_weight_for, v_weight_against, v_weight_abstain
    FROM public.votes
    WHERE proposal_id = p_proposal_id;

    -- 4. Check Quorum
    -- Quorum is based on Attendance (Votes Cast / Total Members)
    -- Strategy impacts whether we count Heads or Fraction for Quorum too? 
    -- Usually Quorum is "Capital Present" (Fraction) or "Heads Present" depending on bylaws.
    -- Let's match the strategy.
    
    IF v_total_members = 0 THEN
        v_present_pct := 0;
    ELSIF v_strategy = 'HEAD' THEN
        v_present_pct := (v_count_total::float / v_total_members::float) * 100;
    ELSE -- FRACTION
        IF v_total_fraction = 0 THEN 
             v_present_pct := 0;
        ELSE
             v_present_pct := (v_weight_total::float / v_total_fraction::float) * 100;
        END IF;
    END IF;
    
    v_is_quorum := v_present_pct >= v_quorum_pct;

    -- 5. Determine Result (Simple Majority > 50% of CAST VOTES excluding abstain?)
    -- Or > 50% of present? 
    -- Model Regulations: "Volstrekte meerderheid van de uitgebrachte stemmen". 
    -- Abstain usually doesn't count as a vote.
    
    IF v_strategy = 'HEAD' THEN
        -- Majority of (For + Against)
        IF (v_count_for + v_count_against) > 0 THEN
            v_is_accepted := v_count_for > (v_count_for + v_count_against) / 2.0;
        ELSE 
            v_is_accepted := FALSE;
        END IF;
    ELSE
        -- Majority of Weights (For + Against)
        IF (v_weight_for + v_weight_against) > 0 THEN
             v_is_accepted := v_weight_for > (v_weight_for + v_weight_against) / 2.0;
        ELSE
             v_is_accepted := FALSE;
        END IF;
    END IF;

    -- If no quorum, proposal fails? Or is it "Invalid"?
    -- For this function, let's just return what we calculated. 
    -- Application logic can decide to auto-reject or flag "No Quorum".

    RETURN QUERY SELECT 
        v_count_total, v_count_for, v_count_against, v_count_abstain,
        v_weight_total, v_weight_for, v_weight_against, v_weight_abstain,
        v_is_quorum,
        v_is_accepted;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.calculate_proposal_result(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_proposal_result(UUID) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
