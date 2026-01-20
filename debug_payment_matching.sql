
-- Debug: Check if transaction member_ids match contribution member_ids
-- This will show if there's an ID mismatch preventing the "Betaald" column from showing amounts

-- 1. Get transactions with their linked member info
SELECT 
    bt.id as transaction_id,
    bt.amount,
    bt.linked_member_id,
    p.first_name || ' ' || p.last_name as member_name,
    bt.contribution_year_id,
    cy.year
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
WHERE bt.contribution_year_id IN (
    SELECT id FROM contribution_years WHERE year IN (2025, 2026)
)
AND bt.linked_member_id IS NOT NULL
ORDER BY cy.year, member_name;

-- 2. Get member_contributions with their member_ids
SELECT 
    mc.id as contribution_id,
    mc.member_id,
    p.first_name || ' ' || p.last_name as member_name,
    mc.year_id,
    cy.year
FROM member_contributions mc
LEFT JOIN profiles p ON p.id = mc.member_id
LEFT JOIN contribution_years cy ON cy.id = mc.year_id
WHERE mc.year_id IN (
    SELECT id FROM contribution_years WHERE year IN (2025, 2026)
)
ORDER BY cy.year, member_name;

-- 3. Check for ID mismatches
-- If a transaction's linked_member_id doesn't exist in member_contributions.member_id,
-- the payment won't show up
SELECT 
    bt.linked_member_id,
    p.first_name || ' ' || p.last_name as transaction_member,
    bt.amount,
    CASE 
        WHEN mc.member_id IS NULL THEN 'NO MATCH - Payment will not show!'
        ELSE 'Match OK'
    END as status
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
LEFT JOIN member_contributions mc ON mc.member_id = bt.linked_member_id 
    AND mc.year_id = bt.contribution_year_id
WHERE bt.contribution_year_id IN (
    SELECT id FROM contribution_years WHERE year IN (2025, 2026)
)
AND bt.linked_member_id IS NOT NULL;
