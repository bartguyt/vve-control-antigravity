SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ledger_accounts', 'journal_entries', 'journal_lines');
