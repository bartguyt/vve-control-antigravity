-- Make IBAN nullable to support Mock ASPSP accounts without real IBANs
-- We use fallback identifiers like "MOCK-accountname-EUR" for such accounts

ALTER TABLE bank_accounts ALTER COLUMN iban DROP NOT NULL;

COMMENT ON COLUMN bank_accounts.iban IS 'Account identifier - real IBAN for live accounts, "MOCK-name-currency" fallback for test accounts without IBAN';
