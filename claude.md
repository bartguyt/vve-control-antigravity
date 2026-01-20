# Claude AI Assistant - SQL Query Guidelines

## Principle: Single Combined Queries

When creating debug or inspect queries, always combine multiple related checks into a **single query** that returns all results together. This makes it easier for the user to run and review.

## Pattern: Use CTEs (Common Table Expressions)

Instead of creating 3 separate queries, combine them using `WITH` clauses:

```sql
-- ❌ BAD: Multiple separate queries
SELECT * FROM table1;
SELECT * FROM table2;
SELECT * FROM table3;

-- ✅ GOOD: Single combined query with CTEs
WITH 
transactions_data AS (
    SELECT * FROM table1
),
contributions_data AS (
    SELECT * FROM table2
),
matching_status AS (
    SELECT * FROM table3
)
SELECT 
    'Transactions' as section,
    * 
FROM transactions_data
UNION ALL
SELECT 
    'Contributions' as section,
    * 
FROM contributions_data
UNION ALL
SELECT 
    'Matching Status' as section,
    * 
FROM matching_status;
```

## Example: Payment Matching Debug Query

```sql
-- Combined query to debug why payments don't show in "Betaald" column
WITH 
transactions AS (
    SELECT 
        bt.id,
        bt.amount,
        bt.linked_member_id,
        p.first_name || ' ' || p.last_name as member_name,
        cy.year,
        'transaction' as source
    FROM bank_transactions bt
    LEFT JOIN profiles p ON p.id = bt.linked_member_id
    LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
    WHERE bt.contribution_year_id IN (SELECT id FROM contribution_years WHERE year IN (2025, 2026))
    AND bt.linked_member_id IS NOT NULL
),
contributions AS (
    SELECT 
        mc.id,
        mc.member_id,
        p.first_name || ' ' || p.last_name as member_name,
        cy.year,
        'contribution' as source
    FROM member_contributions mc
    LEFT JOIN profiles p ON p.id = mc.member_id
    LEFT JOIN contribution_years cy ON cy.id = mc.year_id
    WHERE mc.year_id IN (SELECT id FROM contribution_years WHERE year IN (2025, 2026))
),
matching_check AS (
    SELECT 
        bt.linked_member_id,
        p.first_name || ' ' || p.last_name as member_name,
        bt.amount,
        CASE 
            WHEN mc.member_id IS NULL THEN '❌ NO MATCH - Payment will not show!'
            ELSE '✅ Match OK'
        END as status,
        'match_status' as source
    FROM bank_transactions bt
    LEFT JOIN profiles p ON p.id = bt.linked_member_id
    LEFT JOIN member_contributions mc ON mc.member_id = bt.linked_member_id 
        AND mc.year_id = bt.contribution_year_id
    WHERE bt.contribution_year_id IN (SELECT id FROM contribution_years WHERE year IN (2025, 2026))
    AND bt.linked_member_id IS NOT NULL
)
-- Combine all results
SELECT '=== TRANSACTIONS ===' as info, NULL as id, NULL as amount, NULL as member_id, NULL as member_name, NULL as year, NULL as status
UNION ALL
SELECT source, id::text, amount::text, linked_member_id::text, member_name, year::text, NULL FROM transactions
UNION ALL
SELECT '=== CONTRIBUTIONS ===' as info, NULL, NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT source, id::text, NULL, member_id::text, member_name, year::text, NULL FROM contributions
UNION ALL
SELECT '=== MATCHING STATUS ===' as info, NULL, NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT source, NULL, amount::text, linked_member_id::text, member_name, NULL, status FROM matching_check;
```

## Benefits

1. **Single Execution**: User runs one query instead of 3-5
2. **Combined Results**: All data in one result set
3. **Clear Sections**: Use header rows to separate sections
4. **Easier Analysis**: All related data visible together

## When to Use This Pattern

- Debugging data flow issues
- Inspecting related tables
- Verifying data integrity
- Checking foreign key relationships
- Analyzing RLS policy effects

## Remember

Always prefer **one comprehensive query** over multiple small queries when debugging or inspecting data.
