
-- Cleanup Script V3: Verbeterde Detectie (Strict Mode)
-- We verwijderen contributies als het profiel GEEN lid is van de VvE waar de contributie bij hoort.

-- 1. Bekijk eerst wat we gaan verwijderen (Diagnose)
SELECT 
    mc.id as contribution_id,
    p.first_name, 
    p.last_name, 
    p.email,
    cy.year
FROM member_contributions mc
JOIN contribution_years cy ON cy.id = mc.year_id
JOIN profiles p ON p.id = mc.member_id
-- We zoeken naar een lidmaatschap (Unit) in DEZE specifieke vereniging
LEFT JOIN members m ON m.profile_id = mc.member_id AND m.association_id = cy.association_id
WHERE m.id IS NULL; -- Als er geen match is, is het een spooklid in deze VvE

-- 2. De Verwijder Actie
-- Verwijder contributies waarvoor geen overeenkomstig 'members' record bestaat in dezelfde VvE
DELETE FROM member_contributions mc
USING contribution_years cy
WHERE mc.year_id = cy.id
AND NOT EXISTS (
    SELECT 1 
    FROM members m 
    WHERE m.profile_id = mc.member_id 
    AND m.association_id = cy.association_id
);

-- 3. Verwijder Dummy Profielen en Transacties (Alleen echte dummies zonder units)
-- Dit blijft hetzelfde, maar we checken of ze ECHT nergens aan gekoppeld zijn.
UPDATE bank_transactions
SET linked_member_id = NULL
WHERE linked_member_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM members WHERE profile_id = bank_transactions.linked_member_id);

DELETE FROM profiles
WHERE email LIKE '%@dummy.com'
AND NOT EXISTS (SELECT 1 FROM members WHERE profile_id = profiles.id);
