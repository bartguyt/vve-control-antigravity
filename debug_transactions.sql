
-- Debug Query: Toon alle transacties die gekoppeld zijn aan een Lid OF een Jaar
-- We tonen ALLE kolommen en de namen van de gekoppelde entiteiten om te zien wat er mis gaat.

SELECT 
    bt.*,
    
    -- Debug info: Lid
    p.first_name || ' ' || p.last_name as linked_member_name_debug,
    
    -- Debug info: Jaar
    cy.year as year_debug,
    
    -- Debug info: Categorie
    fc.name as category_name_debug,

    -- Debug: Waarom zou hij NIET getoond worden?
    CASE 
        WHEN bt.contribution_year_id IS NULL THEN 'FAIL: Geen Jaar'
        WHEN bt.linked_member_id IS NULL THEN 'FAIL: Geen Lid'
        WHEN bt.financial_category_id IS NULL THEN 'WARN: Geen Categorie'
        ELSE 'OK: Zou getoond moeten worden' 
    END as potential_issue
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
LEFT JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE 
    bt.linked_member_id IS NOT NULL 
    OR 
    bt.contribution_year_id IS NOT NULL
ORDER BY bt.booking_date DESC;
