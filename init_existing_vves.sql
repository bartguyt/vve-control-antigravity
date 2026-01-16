-- Initialize ledger for all existing VvEs
DO $$
DECLARE
    vve RECORD;
BEGIN
    FOR vve IN SELECT id FROM public.vves LOOP
        -- Check if ledger accounts already exist to avoid duplicates if run multiple times
        IF NOT EXISTS (SELECT 1 FROM public.ledger_accounts WHERE vve_id = vve.id) THEN
            PERFORM public.initialize_vve_ledger(vve.id);
            RAISE NOTICE 'Initialized ledger for VvE %', vve.id;
        END IF;
    END LOOP;
END;
$$;
