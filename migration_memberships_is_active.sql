-- Add is_active column for soft delete / deactivation
ALTER TABLE vve_memberships 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update RLS if needed, but usually 'true' means visible? 
-- For now, we just add the column. Filters should be applied in the application layer or Views.
