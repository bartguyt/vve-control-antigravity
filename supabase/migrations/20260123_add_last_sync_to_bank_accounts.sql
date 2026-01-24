-- Migration to add last_synced_at column to bank_accounts
-- Note: Column was created in 20260122_create_banking_tables.sql
-- This migration is kept for compatibility but is now a no-op

-- Column already exists as last_synced_at (not last_sync_at)
-- Adding IF NOT EXISTS check to make migration idempotent

DO $$
BEGIN
    -- Check if column exists, add only if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='bank_accounts'
        AND column_name='last_synced_at'
    ) THEN
        ALTER TABLE bank_accounts
        ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Index for faster queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_bank_accounts_last_synced ON bank_accounts (last_synced_at);
