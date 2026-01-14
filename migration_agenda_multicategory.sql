-- Create a junction table for agenda events and categories
CREATE TABLE agenda_event_categories (
    event_id UUID REFERENCES agenda_events(id) ON DELETE CASCADE,
    category_id UUID REFERENCES event_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, category_id)
);

-- Helper function to migrate existing data (optional, best effort)
DO $$
BEGIN
    -- Insert existing relationships based on the old category_id column
    INSERT INTO agenda_event_categories (event_id, category_id)
    SELECT id, category_id
    FROM agenda_events
    WHERE category_id IS NOT NULL;
END $$;

-- Drop foreign key on agenda_events (optional, but cleaner to eventually remove the column)
-- ALTER TABLE agenda_events DROP COLUMN category_id; -- Keeping it for safety for now, or making it nullable/deprecated.
