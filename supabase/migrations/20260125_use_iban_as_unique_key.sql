-- Change unique constraint from external_account_uid to IBAN
-- external_account_uid changes every session, IBAN is stable

-- 1. Delete existing accounts (they have unstable UIDs and may have null IBANs)
-- Users need to re-add accounts after this migration
DELETE FROM bank_accounts;

-- 2. Drop old constraint
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_association_id_external_account_uid_key;

-- 3. Make IBAN required (can't be null for unique constraint)
ALTER TABLE bank_accounts ALTER COLUMN iban SET NOT NULL;

-- 4. Add new unique constraint on association_id + IBAN
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_association_id_iban_key UNIQUE(association_id, iban);

-- 5. Add comment explaining the change
COMMENT ON COLUMN bank_accounts.external_account_uid IS 'Enable Banking account UID - changes with each session, use IBAN as stable identifier';
COMMENT ON COLUMN bank_accounts.iban IS 'Stable account identifier - used as unique key with association_id';
