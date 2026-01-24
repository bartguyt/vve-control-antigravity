-- Add feature flags and subscription tiers to associations table
-- Part of Fase 1: Feature Flag Infrastructure for Freemium Model

-- Add subscription tier column
ALTER TABLE associations
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'premium'
CHECK (subscription_tier IN ('base', 'premium', 'enterprise'));

-- Add feature flags column with default values (all enabled for existing associations)
ALTER TABLE associations
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{
  "members": true,
  "contributions": true,
  "banking": true,
  "accounting": true,
  "voting": true,
  "tasks": true,
  "assignments": true,
  "suppliers": true,
  "documents": true,
  "agenda": true
}'::jsonb;

-- Create helper function to check if a feature is enabled for an association
CREATE OR REPLACE FUNCTION has_feature_enabled(
  association_uuid UUID,
  feature_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE((feature_flags->>feature_name)::boolean, false)
    FROM associations
    WHERE id = association_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON COLUMN associations.subscription_tier IS
'Subscription tier: base (free), premium (paid tier 1), enterprise (paid tier 2)';

COMMENT ON COLUMN associations.feature_flags IS
'Feature flags as JSON object. Each key is a feature name with boolean value.';

COMMENT ON FUNCTION has_feature_enabled IS
'Helper function to check if a specific feature is enabled for an association. Returns false if feature not found.';

-- Update RLS policy for bank_accounts to check feature flag
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Banking visible if feature enabled" ON bank_accounts;

-- Create new policy that checks both membership AND banking feature flag
CREATE POLICY "Banking visible if feature enabled" ON bank_accounts
FOR SELECT USING (
  has_feature_enabled(association_id, 'banking') = true
  AND association_id IN (
    SELECT association_id FROM association_memberships
    WHERE user_id = auth.uid()
  )
);

-- Update RLS policy for bank_transactions to check feature flag
DROP POLICY IF EXISTS "Banking transactions visible if feature enabled" ON bank_transactions;

CREATE POLICY "Banking transactions visible if feature enabled" ON bank_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bank_accounts ba
    WHERE ba.id = bank_transactions.bank_account_id
    AND has_feature_enabled(ba.association_id, 'banking') = true
    AND ba.association_id IN (
      SELECT association_id FROM association_memberships
      WHERE user_id = auth.uid()
    )
  )
);

-- Update RLS policy for bank_connections to check feature flag
DROP POLICY IF EXISTS "Banking connections visible if feature enabled" ON bank_connections;

CREATE POLICY "Banking connections visible if feature enabled" ON bank_connections
FOR SELECT USING (
  has_feature_enabled(association_id, 'banking') = true
  AND association_id IN (
    SELECT association_id FROM association_memberships
    WHERE user_id = auth.uid()
  )
);
