-- Auto-categorize transactions that are linked to a member and contain "bijdrage" in the description
UPDATE public.bank_transactions
SET category = 'ledenbijdrage'
WHERE category IS NULL
  AND linked_member_id IS NOT NULL
  AND (
    LOWER(description) LIKE '%bijdrage%'
    OR LOWER(remittance_information) LIKE '%bijdrage%'
  );
