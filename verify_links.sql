
-- Verificatie Script: Controleer Koppelingen van Transacties
-- We checken of transacties met categorie 'Ledenbijdrage' goed vastzitten aan:
-- 1. Een Lid (linked_member_id)
-- 2. Een Categorie (financial_category_id -> 'Ledenbijdrage')
-- 3. Een Boekjaar (contribution_year_id)

SELECT 
    bt.booking_date,
    bt.amount,
    bt.counterparty_name,
    bt.description,
    -- Check Lid
    p.first_name || ' ' || p.last_name as linked_member_name,
    CASE WHEN bt.linked_member_id IS NULL THEN 'MISSING' ELSE 'OK' END as member_status,
    -- Check Jaar
    cy.year as year,
    CASE WHEN bt.contribution_year_id IS NULL THEN 'MISSING' ELSE 'OK' END as year_status,
    -- Check Categorie
    fc.name as category_name,
    CASE WHEN bt.financial_category_id IS NULL THEN 'MISSING' ELSE 'OK' END as category_status
FROM bank_transactions bt
LEFT JOIN profiles p ON p.id = bt.linked_member_id
LEFT JOIN contribution_years cy ON cy.id = bt.contribution_year_id
LEFT JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE 
    -- We filteren op transacties die bedoeld zijn als Ledenbijdrage
    -- Ofwel via expliciete categorie, ofwel via beschrijving/intentie
    (fc.name = 'Ledenbijdrage' OR fc.name ILIKE '%bijdrage%')
    OR
    (bt.contribution_year_id IS NOT NULL) -- Als het aan een jaar hangt, MOET het een bijdrage zijn?
ORDER BY bt.booking_date DESC;

-- Samenvatting van Fouten
SELECT 
    count(*) as "Aantal Foute Transacties",
    SUM(CASE WHEN linked_member_id IS NULL THEN 1 ELSE 0 END) as "Mist Lid",
    SUM(CASE WHEN contribution_year_id IS NULL THEN 1 ELSE 0 END) as "Mist Jaar",
    SUM(CASE WHEN financial_category_id IS NULL THEN 1 ELSE 0 END) as "Mist Categorie"
FROM bank_transactions bt
LEFT JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE fc.name = 'Ledenbijdrage'
AND (linked_member_id IS NULL OR contribution_year_id IS NULL);
