
-- Check the actual structure of contribution_groups and their amounts
SELECT 
    cg.id,
    cg.name,
    cg.monthly_amount,
    cg.association_id,
    cy.year,
    cy.id as year_id
FROM contribution_groups cg
JOIN contribution_years cy ON cy.association_id = cg.association_id
WHERE cy.year IN (2025, 2026)
ORDER BY cy.year, cg.name;

-- Check member_contributions and their group assignments
SELECT 
    mc.id,
    p.first_name || ' ' || p.last_name as member_name,
    mc.group_id,
    cg.name as group_name,
    cg.monthly_amount as group_monthly_amount,
    mc.amount_due,
    cy.year
FROM member_contributions mc
LEFT JOIN profiles p ON p.id = mc.member_id
LEFT JOIN contribution_groups cg ON cg.id = mc.group_id
LEFT JOIN contribution_years cy ON cy.id = mc.year_id
WHERE cy.year IN (2025, 2026)
ORDER BY cy.year, member_name
LIMIT 20;
