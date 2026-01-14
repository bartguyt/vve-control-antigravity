-- Add preferences column to profiles for storing user settings like 'confirm_tags'
ALTER TABLE profiles 
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
