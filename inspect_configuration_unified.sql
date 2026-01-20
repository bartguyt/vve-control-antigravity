-- Unified Configuration Inspection
-- Returns a single row with JSON objects containing all relevant table data
-- This avoids "column does not exist" errors for specific columns by aggregating whole rows

WITH 
-- 1. Contribution Years
config_years AS (
    SELECT json_agg(t) as data FROM (SELECT * FROM contribution_years) t
),
-- 2. Contribution Groups
config_groups AS (
    SELECT json_agg(t) as data FROM (SELECT * FROM contribution_groups) t
),
-- 3. Contribution Year Amounts
config_amounts AS (
    SELECT json_agg(t) as data FROM (SELECT * FROM contribution_year_amounts) t
),
-- 4. Financial Categories (Ledenbijdrage)
-- We cast to checking 'name' exists, if not, dump all
config_categories AS (
    SELECT json_agg(t) as data FROM (SELECT * FROM financial_categories WHERE name ILIKE '%Ledenbijdrage%') t
),
-- 5. Specific Transaction & Linked Member Analysis
-- Target Transaction ID: f27d00b4-7c14-43f9-9ae0-152ba078060e
tx_analysis AS (
    SELECT json_agg(t) as data 
    FROM (
        SELECT 
            tx.id as transaction_id, 
            tx.amount, 
            tx.linked_member_id,
            tx.contribution_year_id,
            -- Embed member assignments
            (
                SELECT json_agg(mga) 
                FROM member_group_assignments mga 
                WHERE mga.member_id = tx.linked_member_id
            ) as member_assignments,
            -- Count payment records
            (
                SELECT count(*) 
                FROM contribution_payment_records cpr 
                WHERE cpr.transaction_id = tx.id
            ) as payment_records_count
        FROM bank_transactions tx
        WHERE tx.id = 'f27d00b4-7c14-43f9-9ae0-152ba078060e' 
           OR tx.amount = 264 
           OR tx.amount = -264
        LIMIT 1
    ) t
)
SELECT 
    (SELECT data FROM config_years) as years,
    (SELECT data FROM config_groups) as groups,
    (SELECT data FROM config_amounts) as amounts,
    (SELECT data FROM config_categories) as categories,
    (SELECT data FROM tx_analysis) as transaction_debug;
