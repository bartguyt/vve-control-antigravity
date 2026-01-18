BEGIN;

-- 1. Fix missing 'date' column in journal_entries
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'date') THEN
            ALTER TABLE public.journal_entries ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
        END IF;
    END IF;
END $$;

COMMIT;
