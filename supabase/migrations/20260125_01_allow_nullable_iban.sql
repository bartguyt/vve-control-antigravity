-- Allow IBAN to be nullable for Mock ASPSP accounts
-- We use fallback identifiers like "MOCK-accountname-EUR" for accounts without real IBANs

ALTER TABLE bank_accounts ALTER COLUMN iban DROP NOT NULL;

COMMENT ON COLUMN bank_accounts.iban IS 'Account identifier - real IBAN for live accounts, fallback "MOCK-name-currency" for test accounts';
