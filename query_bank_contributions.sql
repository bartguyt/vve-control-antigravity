
-- Query: Transacties op de Bankrekening pagina
-- Criteria:
-- 1. Type is 'Ledenbijdrage' (via Categorie)
-- 2. Jaartal is ingevuld (contribution_year_id)
-- 3. Koppeling naar lid is gedaan (linked_member_id)

SELECT 
    bt.booking_date as "Datum",
    bt.amount as "Bedrag",
    bt.description as "Omschrijving",
    p.first_name || ' ' || p.last_name as "Gekoppeld Lid",
    cy.year as "Boekjaar",
    fc.name as "Categorie"
FROM bank_transactions bt
JOIN profiles p ON p.id = bt.linked_member_id
JOIN contribution_years cy ON cy.id = bt.contribution_year_id
JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE 
    fc.name = 'Ledenbijdrage'
ORDER BY bt.booking_date DESC;
