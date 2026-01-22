# VvE Control - Project Context for Claude Code

## Project Overview

**VvE Control** is a web application for managing Dutch homeowner associations (Vereniging van Eigenaren). It provides financial management, member administration, and bank integration capabilities.

---

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** as build tool
- **Tremor** UI component library (for dashboards/data visualization)
- **Tailwind CSS** for styling (via Tremor)
- **Heroicons** for icons
- **React Router** for navigation

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Deno** runtime for Edge Functions
- **Enable Banking API** for PSD2 bank connections

### Key Dependencies
```json
{
  "@tremor/react": "^3.x",
  "@heroicons/react": "^2.x",
  "@supabase/supabase-js": "^2.x",
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x"
}
```

---

## Architecture Decisions

### Database Schema

#### `bank_accounts`
```sql
- id: UUID (PK)
- association_id: UUID (FK to associations)
- external_account_uid: TEXT (Enable Banking UID)
- name: TEXT
- iban: TEXT
- bic: TEXT
- currency: TEXT (default 'EUR')
- connection_id: UUID (FK to bank_connections)
- is_active: BOOLEAN
- last_synced_at: TIMESTAMPTZ  -- NOTE: Column name is "last_synced_at" NOT "last_sync_at"
- created_at, updated_at: TIMESTAMPTZ
- UNIQUE(association_id, external_account_uid)
```

#### `bank_transactions`
```sql
- id: UUID (PK)
- bank_account_id: UUID (FK)
- external_reference: TEXT
- booking_date: DATE
- value_date: DATE
- amount: NUMERIC
- currency: TEXT
- credit_debit: TEXT ('CRDT' or 'DBIT')
- counterparty_name: TEXT
- counterparty_iban: TEXT
- description: TEXT
- status: TEXT ('BOOK', 'PNDG')
- raw_data: JSONB
- UNIQUE(bank_account_id, external_reference)
```

#### `bank_connections`
```sql
- id: UUID (PK)
- provider: TEXT ('enable_banking')
- external_id: TEXT (session ID)
- status: TEXT ('active', 'expired')
- access_token: TEXT
- metadata: JSONB (stores accounts list from session)
- expires_at: TIMESTAMPTZ
- created_at, updated_at: TIMESTAMPTZ
```

### Enable Banking Integration

The integration uses the **Enable Banking** PSD2 API:
- **Sandbox Mode**: Uses `sandbox.enablebanking.com`
- **Mock ASPSP**: Country code `XS` for testing
- **JWT Authentication**: RSA256 signed tokens

#### Edge Function Actions
1. `get_aspsps` - List available banks
2. `init_auth` - Start OAuth flow
3. `activate_session` - Exchange code for session, return accounts
4. `sync_transactions` - Fetch transactions with smart date handling
5. `check_status` - Return active connection and metadata

#### Smart Sync Logic
- If `last_synced_at` exists for an account, use it as `date_from`
- If no prior sync, default to `2020-01-01`
- Always update `last_synced_at` after successful sync
- Uses `continuation_key` for pagination (max 50 pages)

### Frontend State Management

#### Session Storage Keys
- `eb_session_id` - Active Enable Banking session ID
- `eb_processed_code` - Prevents double-processing of OAuth codes

#### Session Restoration Flow
On mount, the component:
1. Checks for OAuth `code` in URL → processes callback
2. Else checks `sessionStorage` for `eb_session_id` → calls `check_status` to restore session
3. Else falls back to loading persisted accounts from `bank_accounts` table

This prevents stale data from overwriting fresh session data.

---

## UI/UX Decisions

### Design System
- **Primary Color**: Slate Blue (`#344054`)
- **Accent**: Sage Green for success states
- **Background**: Sea Salt (light gray)
- **Cards**: White with shadow, rounded corners
- **Interactive Elements**: Clickable cards with border highlight on selection

### Component Patterns
- Use Tremor's `Card`, `Title`, `Text`, `Button`, `Badge`
- Clickable card grids instead of dropdowns for Bank/Account selection
- Visual feedback: selected items show colored border + ring

### Language
- UI is in **Dutch** (e.g., "Synchroniseren", "Rekening", "Transacties")
- Logs and debug output can be English

---

## Common Patterns

### Supabase Queries
```typescript
// Safe single row fetch (prevents PGRST116)
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('column', value)
  .maybeSingle();  // NOT .single()
```

### Edge Function Invocation
```typescript
const { data, error } = await supabase.functions.invoke('enable-banking', {
  body: { action: 'sync_transactions', account_uid, association_id, date_to }
});
```

### Date Handling
```typescript
// Always use ISO format for API
const dateStr = new Date().toISOString();

// For display
new Date(dateStr).toLocaleString('nl-NL');
```

---

## Known Issues & Workarounds

1. **Column Name**: Database uses `last_synced_at`, not `last_sync_at`
2. **React StrictMode**: Causes double-mount; use `sessionStorage` flag to prevent duplicate processing
3. **URL Cleanup**: Don't clean OAuth code from URL until after processing begins

---

## File Structure

```
src/
├── features/
│   └── finance/
│       ├── EnableBankingSandbox.tsx  # Main banking UI
│       ├── BankAccountPage.tsx       # Account details page
│       └── enableBankingTypes.ts     # Type definitions
├── lib/
│   ├── supabase.ts                   # Supabase client
│   └── association.ts                # Association service
└── App.tsx

supabase/
├── functions/
│   └── enable-banking/
│       ├── index.ts                  # Edge Function
│       └── priv_key.ts               # RSA private key
└── migrations/
    ├── 20260122_create_banking_tables.sql
    └── 20260123_add_last_sync_to_bank_accounts.sql
```

---

## Development Commands

```bash
# Start dev server
npm run dev

# Deploy Edge Function
supabase functions deploy enable-banking --no-verify-jwt

# Apply migrations
supabase db push
```

---

## API Credentials (Sandbox)

- **APP_ID**: `92a81c55-8043-4afc-92a4-9db59e1b972f`
- **KEY_ID**: `d2c2a067-31e6-46e6-abd5-cd70a8eb4e60`
- **Private Key**: Stored in `priv_key.ts` (RSA PKCS#8 format)

---

## Next Steps / TODOs

- [ ] Production Enable Banking credentials
- [ ] Bank name display in debug panel
- [ ] Transaction categorization
- [ ] Automatic periodic sync
- [ ] Multi-association support
- [ ] RLS policies for bank_accounts/bank_transactions
