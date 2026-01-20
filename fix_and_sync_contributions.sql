
-- REPAIR & SYNC SCRIPT
-- Doel:
-- 1. Repareer 'verweesde' transacties (gekoppeld aan verwijderde leden)
-- 2. Maak ontbrekende 'member_contributions' aan voor GELDIGE leden

-- STAP 1: Verbreek koppelingen naar niet-bestaande profielen
-- (Dit voorkomt de Foreign Key error die u net zag)
UPDATE bank_transactions
SET linked_member_id = NULL
WHERE linked_member_id IS NOT NULL 
AND linked_member_id NOT IN (SELECT id FROM profiles);

-- STAP 2: Sync (nogmaals) - nu alleen voor geldige leden
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
    0 as amount_paid,
    'PENDING' as status
FROM bank_transactions bt
JOIN contribution_years cy ON cy.id = bt.contribution_year_id
JOIN financial_categories fc ON fc.id = bt.financial_category_id
WHERE 
    fc.name = 'Ledenbijdrage'
    AND bt.linked_member_id IS NOT NULL
    AND bt.contribution_year_id IS NOT NULL
    -- Zorg dat we niet dubbel aanmaken
    AND NOT EXISTS (
        SELECT 1 FROM member_contributions mc
        WHERE mc.member_id = bt.linked_member_id
        AND mc.year_id = bt.contribution_year_id
    );

-- STAP 3: Resultaat tonen
SELECT count(*) as "Gerepareerde (losgekoppelde) transacties" 
FROM bank_transactions 
WHERE linked_member_id IS NULL AND description LIKE '%VvE%';

SELECT count(*) as "Nieuwe bijdrageregels aangemaakt" 
FROM member_contributions 
WHERE created_at > now() - interval '1 minute';
