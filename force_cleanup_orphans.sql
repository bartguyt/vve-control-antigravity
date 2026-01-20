
-- HARD CLEANUP SCRIPT
-- Doel: Verwijderen van specifieke hardnekkige 'spookleden' die warnings veroorzaken.
-- IDs uit logs:
-- 1. 50133fb1-b366-4d3f-8a27-83abf4986efa
-- 2. 876bad46-f9e6-421f-b2fb-bc8957bb0242
-- 3. 0f10c4ff-8766-4c54-be33-e9683cc6b53a

BEGIN;

-- STAP 1: Verbreek hardhandig de koppelingen voor deze specifieke IDs
UPDATE bank_transactions
SET linked_member_id = NULL
WHERE linked_member_id IN (
    '50133fb1-b366-4d3f-8a27-83abf4986efa',
    '876bad46-f9e6-421f-b2fb-bc8957bb0242',
    '0f10c4ff-8766-4c54-be33-e9683cc6b53a'
);

-- STAP 2: Probeer de profielen zelf te verwijderen (indien ze nog bestaan)
DELETE FROM profiles
WHERE id IN (
    '50133fb1-b366-4d3f-8a27-83abf4986efa',
    '876bad46-f9e6-421f-b2fb-bc8957bb0242',
    '0f10c4ff-8766-4c54-be33-e9683cc6b53a'
);

-- STAP 3: Check hoeveel transacties nog steeds naar deze IDs wijzen (zou 0 moeten zijn)
SELECT count(*) as "Resterende foute koppelingen"
FROM bank_transactions
WHERE linked_member_id IN (
    '50133fb1-b366-4d3f-8a27-83abf4986efa',
    '876bad46-f9e6-421f-b2fb-bc8957bb0242',
    '0f10c4ff-8766-4c54-be33-e9683cc6b53a'
);

COMMIT;
