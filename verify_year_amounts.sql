
-- Verify that contribution_year_amounts has data
SELECT 
    cya.id,
    cya.year_id,
    cy.year,
    cya.group_id,
    cg.name as group_name,
    cya.amount
FROM contribution_year_amounts cya
JOIN contribution_years cy ON cy.id = cya.year_id
LEFT JOIN contribution_groups cg ON cg.id = cya.group_id
WHERE cy.year IN (2025, 2026)
ORDER BY cy.year, cg.name;

-- Check contribution_years for default_amount and payment_frequency
SELECT 
    id,
    year,
    default_amount,
    payment_frequency,
    base_rate_name
FROM contribution_years
WHERE year IN (2025, 2026);
