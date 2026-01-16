-- Inspect assignments and suppliers schema
SELECT 
    table_name, 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name IN ('assignments', 'suppliers', 'maintenance_requests')
ORDER BY table_name, ordinal_position;
