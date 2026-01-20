-- Auto-create member_contribution records when transactions are linked
-- This eliminates the need for the "Update Lijst" button

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION auto_create_member_contribution()
RETURNS TRIGGER AS $$
DECLARE
    v_year_record RECORD;
    v_profile_exists BOOLEAN;
    v_contribution_exists BOOLEAN;
BEGIN
    -- Only proceed if linked_member_id and contribution_year_id are set
    IF NEW.linked_member_id IS NULL OR NEW.contribution_year_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM profiles WHERE id = NEW.linked_member_id
    ) INTO v_profile_exists;

    IF NOT v_profile_exists THEN
        -- Profile doesn't exist, skip auto-creation
        RETURN NEW;
    END IF;

    -- Check if contribution already exists
    SELECT EXISTS(
        SELECT 1 FROM member_contributions 
        WHERE member_id = NEW.linked_member_id 
        AND year_id = NEW.contribution_year_id
    ) INTO v_contribution_exists;

    IF v_contribution_exists THEN
        -- Contribution already exists, nothing to do
        RETURN NEW;
    END IF;

    -- Get year details
    SELECT * INTO v_year_record
    FROM contribution_years
    WHERE id = NEW.contribution_year_id;

    IF NOT FOUND THEN
        -- Year doesn't exist, skip
        RETURN NEW;
    END IF;

    -- Get member's group assignment (if any)
    DECLARE
        v_group_id UUID;
        v_amount NUMERIC;
    BEGIN
        SELECT group_id INTO v_group_id
        FROM member_group_assignments
        WHERE member_id = NEW.linked_member_id
        LIMIT 1;

        -- Determine amount based on group or default
        IF v_group_id IS NOT NULL THEN
            SELECT amount INTO v_amount
            FROM contribution_year_amounts
            WHERE year_id = NEW.contribution_year_id
            AND group_id = v_group_id;
        END IF;

        -- Use default if no group amount found
        IF v_amount IS NULL THEN
            v_amount := v_year_record.default_amount;
        END IF;

        -- Create the member_contribution record
        INSERT INTO member_contributions (
            association_id,
            year_id,
            member_id,
            group_id,
            amount_due,
            status
        ) VALUES (
            v_year_record.association_id,
            NEW.contribution_year_id,
            NEW.linked_member_id,
            v_group_id,
            v_amount,
            'PENDING'
        )
        ON CONFLICT (year_id, member_id) DO NOTHING;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS auto_create_contribution_on_transaction ON bank_transactions;

CREATE TRIGGER auto_create_contribution_on_transaction
    AFTER INSERT OR UPDATE OF linked_member_id, contribution_year_id
    ON bank_transactions
    FOR EACH ROW
    WHEN (NEW.linked_member_id IS NOT NULL AND NEW.contribution_year_id IS NOT NULL)
    EXECUTE FUNCTION auto_create_member_contribution();

-- Step 3: Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_create_contribution_on_transaction';
