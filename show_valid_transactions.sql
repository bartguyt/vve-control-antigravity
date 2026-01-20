
-- Query: Toon alle geldige Ledenbijdrage Transacties voor het huidige (meest recente) boekjaar
-- Dit zijn de transacties die meetellen in de totalen.

WITH LatestYear AS (
    SELECT id, year, association_id FROM contribution_years ORDER BY year DESC LIMIT 1
)
SELECT 
    bt.booking_date as "Datum",
    bt.amount as "Bedrag",
    p.first_name || ' ' || p.last_name as "Lid",
    fc.name as "Categorie",
    bt.description as "Omschrijving",
    cy.year as "Boekjaar"
FROM bank_transactions bt
JOIN LatestYear ly ON bt.contribution_year_id = ly.id
JOIN profiles p ON p.id = bt.linked_member_id
JOIN contribution_years cy ON cy.id = bt.contribution_year_id
LEFT JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE 
    -- Requirement 1: Gekoppeld aan een Lid
    bt.linked_member_id IS NOT NULL
    -- Requirement 2: Gekoppeld aan het Boekjaar
    AND bt.contribution_year_id IS NOT NULL
    -- Requirement 3: Categorie is Ledenbijdrage (of lijkt erop)
    AND (
        fc.name = 'Ledenbijdrage' 
        OR fc.name ILIKE '%bijdrage%'
        OR bt.description ILIKE '%bijdrage%' -- Fallback als categorie mist maar wel gekoppeld is
    )
ORDER BY bt.booking_date DESC;
