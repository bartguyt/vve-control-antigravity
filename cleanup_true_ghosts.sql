
-- Cleanup Script: Verwijder Spookleden en hun Data
-- Gebaseerd op de logica: Een "Echt" lid heeft een koppeling in de 'members' (woningen) tabel.
-- Spookleden zijn Profielen die wel bestaan, maar geen Woning hebben.

-- 1. Verwijder Contributies van profielen die GEEN woning hebben
DELETE FROM member_contributions
WHERE member_id NOT IN (
    SELECT profile_id FROM members WHERE profile_id IS NOT NULL
);

-- 2. Haal koppelingen weg uit Banktransacties voor profielen die GEEN woning hebben
UPDATE bank_transactions
SET linked_member_id = NULL
WHERE linked_member_id NOT IN (
    SELECT profile_id FROM members WHERE profile_id IS NOT NULL
);

-- 3. Verwijder de Dummy Profielen zelf
-- VEILIGHEID: We verwijderen alleen profielen met '@dummy.com' email
-- EN die geen woning hebben.
DELETE FROM profiles
WHERE id NOT IN (
    SELECT profile_id FROM members WHERE profile_id IS NOT NULL
)
AND email LIKE '%@dummy.com';

-- Controle
SELECT count(*) as "Overgebleven Spook Contributies"
FROM member_contributions
WHERE member_id NOT IN (SELECT profile_id FROM members WHERE profile_id IS NOT NULL);
