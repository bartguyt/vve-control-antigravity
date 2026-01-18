SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'associations' 
    AND column_name IN ('voting_strategy', 'quorum_percentage');
