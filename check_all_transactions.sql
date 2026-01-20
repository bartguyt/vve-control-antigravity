-- Check ALL transactions regardless of year to see if they exist
SELECT 
    bt.id,
    bt.amount,
    bt.description,
    bt.linked_member_id,
    p.first_name || ' ' || p.last_name as member_name,
    bt.contribution_year_id,
    cy.year,
    bt.booking_date,
    fc.name as category
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
LEFT JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE bt.linked_member_id IS NOT NULL
ORDER BY cy.year DESC, bt.booking_date DESC;

-- Also check transactions that are unlinked but have a year
SELECT 
    bt.id,
    bt.amount,
    bt.description,
    bt.linked_member_id,
    bt.contribution_year_id,
    cy.year,
    'UNLINKED - needs manual assignment' as status
FROM bank_transactions bt
LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
WHERE bt.linked_member_id IS NULL
AND bt.contribution_year_id IS NOT NULL
ORDER BY cy.year DESC;
