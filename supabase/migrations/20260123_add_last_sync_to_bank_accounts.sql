-- Migration to add last_sync_at column to bank_accounts

alter table bank_accounts
add column last_sync_at timestamp with time zone;

-- Optional: set default to null (already default)

-- Index for faster queries
create index if not exists idx_bank_accounts_last_sync on bank_accounts (last_sync_at);
