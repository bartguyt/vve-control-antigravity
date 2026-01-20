
-- Check state of a few transactions from the previous list to see if they are now unlinked
SELECT 
    id, 
    amount, 
    linked_member_id, 
    description,
    (SELECT name FROM financial_categories WHERE id = bank_transactions.financial_category_id) as category_name
FROM bank_transactions 
WHERE id IN (
    'f27d00b4-7c14-43f9-9ae0-152ba078060e', -- Was linked to b803cbbb...
    '76b8abfa-f368-404e-97c1-8cf36e9c043e'  -- Was linked to 50133fb1...
);
