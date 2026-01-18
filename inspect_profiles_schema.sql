-- Inspect Schema for Profiles and Memberships

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name IN ('profiles', 'association_memberships')
ORDER BY 
    table_name, ordinal_position;
