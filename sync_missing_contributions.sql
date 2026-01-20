
-- Sync Script: Maak ontbrekende 'member_contributions' aan voor bestaande transacties
-- Dit zorgt ervoor dat transacties zichtbaar worden in de Ledenbijdragen lijst.

INSERT INTO member_contributions (
    association_id,
    year_id,
    member_id,
    amount_due,
    amount_paid,
    status
)
SELECT DISTINCT
    cy.association_id,
    bt.contribution_year_id as year_id,
    bt.linked_member_id as member_id,
    cy.default_amount as amount_due,
    0 as amount_paid, -- Wordt later berekend door UI, maar database field mag 0 zijn
    'PENDING' as status
FROM bank_transactions bt
JOIN contribution_years cy ON cy.id = bt.contribution_year_id
JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE 
    fc.name = 'Ledenbijdrage'
    AND bt.linked_member_id IS NOT NULL
    AND bt.contribution_year_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM member_contributions mc
        WHERE mc.member_id = bt.linked_member_id
        AND mc.year_id = bt.contribution_year_id
    );

-- Feedback
SELECT count(*) as "Nieuwe bijdrageregels aangemaakt" 
FROM member_contributions 
WHERE created_at > now() - interval '1 minute';
