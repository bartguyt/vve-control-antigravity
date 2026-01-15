-- Add base_rate_name to contribution_years
ALTER TABLE contribution_years ADD COLUMN IF NOT EXISTS base_rate_name TEXT NOT NULL DEFAULT 'Standaard';

-- Fix profiles RLS potentially blocking access if that was the cause of 406 (though likely it's just missing data)
-- Ensuring users can read their own profile is critical.
-- (This policy usually exists, but double checking)
