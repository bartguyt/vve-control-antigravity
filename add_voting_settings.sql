-- Add Voting Configuration to Associations

ALTER TABLE public.associations
ADD COLUMN IF NOT EXISTS voting_strategy TEXT CHECK (voting_strategy IN ('HEAD', 'FRACTION')) DEFAULT 'HEAD',
ADD COLUMN IF NOT EXISTS quorum_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quorum_percentage INTEGER DEFAULT 50;

-- Comment on columns
COMMENT ON COLUMN public.associations.voting_strategy IS 'Determines how votes are counted: HEAD (1 vote per member) or FRACTION (weighted by share)';
COMMENT ON COLUMN public.associations.quorum_percentage IS 'Cannot be less than 0 or more than 100';

ALTER TABLE public.associations
ADD CONSTRAINT check_quorum_percentage CHECK (quorum_percentage >= 0 AND quorum_percentage <= 100);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
