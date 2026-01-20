-- COMBINED DEBUG QUERY: Payment Matching Analysis
-- This single query shows all data needed to diagnose why payments don't appear in "Betaald" column

WITH 
-- 1. Get all transactions with member info
transactions AS (
    SELECT 
        bt.id,
        bt.amount,
        bt.linked_member_id,
        p.first_name || ' ' || p.last_name as member_name,
        cy.year
    FROM bank_transactions bt
    LEFT JOIN profiles p ON p.id = bt.linked_member_id
    LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
    WHERE bt.contribution_year_id IN (SELECT id FROM contribution_years WHERE year IN (2025, 2026))
    AND bt.linked_member_id IS NOT NULL
),
-- 2. Get all member_contributions with member info
contributions AS (
    SELECT 
        mc.id,
        mc.member_id,
        p.first_name || ' ' || p.last_name as member_name,
        cy.year
    FROM member_contributions mc
    LEFT JOIN profiles p ON p.id = mc.member_id
    LEFT JOIN contribution_years cy ON cy.id = mc.year_id
    WHERE mc.year_id IN (SELECT id FROM contribution_years WHERE year IN (2025, 2026))
),
-- 3. Check for ID mismatches
matching_status AS (
    SELECT 
        bt.linked_member_id,
        p.first_name || ' ' || p.last_name as transaction_member,
        bt.amount,
        CASE 
            WHEN mc.member_id IS NULL THEN '❌ NO MATCH - Payment will not show!'
            ELSE '✅ Match OK'
        END as status
    FROM bank_transactions bt
    LEFT JOIN profiles p ON p.id = bt.linked_member_id
    LEFT JOIN member_contributions mc ON mc.member_id = bt.linked_member_id 
        AND mc.year_id = bt.contribution_year_id
    WHERE bt.contribution_year_id IN (SELECT id FROM contribution_years WHERE year IN (2025, 2026))
    AND bt.linked_member_id IS NOT NULL
)
-- Combine all results with section headers
SELECT 
    '=== TRANSACTIONS (what was paid) ===' as section,
    NULL::uuid as id,
    NULL::numeric as amount,
    NULL::uuid as member_id,
    NULL::text as member_name,
    NULL::int as year,
    NULL::text as status
UNION ALL
SELECT 
    'Transaction',
    id,
    amount,
    linked_member_id,
    member_name,
    year,
    NULL
FROM transactions

UNION ALL
SELECT 
    '=== CONTRIBUTIONS (who should pay) ===' as section,
    NULL, NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 
    'Contribution',
    id,
    NULL,
    member_id,
    member_name,
    year,
    NULL
FROM contributions

UNION ALL
SELECT 
    '=== MATCHING STATUS (do they connect?) ===' as section,
    NULL, NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 
    'Match Check',
    NULL,
    amount,
    linked_member_id,
    transaction_member,
    NULL,
    status
FROM matching_status
ORDER BY section DESC, member_name;
