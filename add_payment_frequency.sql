
-- Add payment_frequency column to contribution_years
ALTER TABLE contribution_years 
ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'yearly'));

-- Update existing years to monthly (current behavior)
UPDATE contribution_years 
SET payment_frequency = 'monthly' 
WHERE payment_frequency IS NULL;
