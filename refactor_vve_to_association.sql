-- Migration: Global Rename VvE -> Association

-- 1. Rename Tables
ALTER TABLE vves RENAME TO associations;
ALTER TABLE vve_memberships RENAME TO association_memberships;

-- 2. Rename Columns (vve_id -> association_id)
ALTER TABLE association_memberships RENAME COLUMN vve_id TO association_id;

-- Profiles (Note: We will eventually move this to 'members' table, but for now rename it)
ALTER TABLE profiles RENAME COLUMN vve_id TO association_id;

-- Finance & Contributions
ALTER TABLE contribution_years RENAME COLUMN vve_id TO association_id;
ALTER TABLE member_contributions RENAME COLUMN vve_id TO association_id;
ALTER TABLE contribution_groups RENAME COLUMN vve_id TO association_id;
ALTER TABLE bank_transactions RENAME COLUMN vve_id TO association_id;
ALTER TABLE ledger_accounts RENAME COLUMN vve_id TO association_id;
ALTER TABLE financial_categories RENAME COLUMN vve_id TO association_id;
ALTER TABLE journal_entries RENAME COLUMN vve_id TO association_id;

-- Suppliers & Operations
ALTER TABLE suppliers RENAME COLUMN vve_id TO association_id;
ALTER TABLE documents RENAME COLUMN vve_id TO association_id;
ALTER TABLE assignments RENAME COLUMN vve_id TO association_id;

-- RLS Policies (Update policies that reference vve_id or vves table)
-- Note: PostgreSQL might handle column renames in policies automatically, but we should verify.
-- It's safer to drop and recreate policies if they use the old names in string literals or complex checks,
-- but usually simple identifying references are updated. 
-- However, we likely have policies checking `exists (select 1 from vve_memberships ...)` which need to be checked.

-- We can rely on Postgres to rename the references in the policies usually, 
-- but let's double check if we need to manually update any text-based functions or triggers.

-- 3. Rename Validations / Constraints if they have specific names (optional but good for consistency)
-- ALTER TABLE associations RENAME CONSTRAINT vves_pkey TO associations_pkey;
-- (Postgres usually updates index names automatically or leaves them. We can force rename if strict.)

-- 4. Update Types/Enums if any? (Postgres Enums don't have table-specific names usually).

-- End of Rename Migration
