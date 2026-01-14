-- Add updated_at column to agenda_events if it doesn't exist
ALTER TABLE agenda_events 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agenda_events_updated_at
    BEFORE UPDATE ON agenda_events
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
