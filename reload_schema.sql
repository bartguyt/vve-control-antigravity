-- Run this if you get "Could not find column in schema cache" errors after a migration
NOTIFY pgrst, 'reload schema';
