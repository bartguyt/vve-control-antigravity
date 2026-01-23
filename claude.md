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

**Enable Banking App**: `vve-control-dev`

- **APP_ID**: `a34e3b69-cc7f-4eee-be2d-1fc438d020c9` (Application ID)
- **KEY_ID**: `a34e3b69-cc7f-4eee-be2d-1fc438d020c9` (Same as APP_ID - Enable Banking uses APP_ID as KEY_ID)
- **Private Key**: Stored in `priv_key.ts` (RSA PKCS#8 format)
- **Private Key File**: `~/Downloads/a34e3b69-cc7f-4eee-be2d-1fc438d020c9.pem`
- **Redirect URI**: `http://localhost:5173/system/settings/connections`

**Important**: Enable Banking uses the APP_ID (filename of .pem file) as both the application identifier AND the KEY_ID for JWT signatures.

---

## Next Steps / TODOs

- [ ] Production Enable Banking credentials
- [ ] Bank name display in debug panel
- [ ] Transaction categorization
- [ ] Automatic periodic sync
- [ ] Multi-association support
- [ ] RLS policies for bank_accounts/bank_transactions

---

# Extended Domain & Architecture Knowledge

## Domain Context (VvE-specifiek)

### Wat is een VvE?
Een Vereniging van Eigenaren is een rechtspersoon die automatisch ontstaat bij splitsing van een gebouw in appartementsrechten. Elke eigenaar is automatisch lid.

### Kernbegrippen

| Term | Betekenis |
|------|-----------|
| **Association** | De VvE-organisatie (voorheen "vve" in code) |
| **Member/Unit** | Een appartementsrecht met eigenaar |
| **Fractie** | Eigendomsaandeel (bepaalt stemgewicht en bijdrage) |
| **Contribution** | Jaarlijkse ledenbijdrage (servicekosten) |
| **Contribution Group** | Groep leden met zelfde bijdragetarief |
| **Profile** | Gebruikersprofiel (kan meerdere VvE's hebben) |
| **Membership** | Koppeling user <-> association met rol |

### Rollen in het systeem

| Rol | Code | Bevoegdheden |
|-----|------|--------------|
| Super Admin | `is_super_admin` | Platform-breed beheer, alle VvE's |
| Admin | `admin` | Volledige VvE-toegang |
| Manager | `manager` | Dagelijks beheer |
| Bestuur | `board` | Bestuursleden |
| Kascommissie | `audit_comm` | Financieel toezicht |
| Technische Cie | `tech_comm` | Onderhoudszaken |
| Lid | `member` | Basis-toegang |

---

## Complete Database Schema

### Core Tables

#### `associations` (voorheen `vves`)
```sql
id: UUID (PK)
name: TEXT
voting_strategy: 'HEAD' | 'FRACTION'  -- Stemwijze
quorum_required: BOOLEAN
quorum_percentage: NUMERIC
created_at: TIMESTAMPTZ
```

#### `profiles`
```sql
id: UUID (PK)
user_id: UUID (FK auth.users, nullable voor ghost users)
is_super_admin: BOOLEAN
first_name, last_name: TEXT
email, phone_number: TEXT
preferences: JSONB
created_at, updated_at: TIMESTAMPTZ
```

#### `association_memberships`
```sql
id: UUID (PK)
user_id: UUID (FK auth.users)
association_id: UUID (FK associations)
role: TEXT ('admin'|'manager'|'board'|'audit_comm'|'tech_comm'|'member')
function: TEXT (bijv. 'Voorzitter', 'Penningmeester')
is_active: BOOLEAN
created_at: TIMESTAMPTZ
UNIQUE(user_id, association_id)
```

#### `members` (Units/Appartementen)
```sql
id: UUID (PK)
association_id: UUID (FK)
profile_id: UUID (FK profiles, nullable)
member_number: TEXT
building_number: TEXT
street, house_number, zip_code, city: TEXT
fraction: NUMERIC  -- Eigendomsaandeel (bijv. 0.125 = 1/8)
created_at: TIMESTAMPTZ
```

### Finance Tables

#### `contribution_years`
```sql
id: UUID (PK)
association_id: UUID (FK)
year: INTEGER
default_amount: NUMERIC
base_rate_name: TEXT
is_active: BOOLEAN
created_at, updated_at: TIMESTAMPTZ
```

#### `contribution_groups`
```sql
id: UUID (PK)
association_id: UUID (FK)
name: TEXT
created_at: TIMESTAMPTZ
UNIQUE(association_id, name)
```

#### `contribution_year_amounts`
```sql
id: UUID (PK)
year_id: UUID (FK contribution_years)
group_id: UUID (FK contribution_groups)
amount: NUMERIC
UNIQUE(year_id, group_id)
```

#### `member_contributions`
```sql
id: UUID (PK)
association_id: UUID (FK)
year_id: UUID (FK contribution_years)
member_id: UUID (FK profiles)
group_id: UUID (FK contribution_groups, nullable)
amount_due: NUMERIC
amount_paid: NUMERIC
status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
notes: TEXT
created_at, updated_at: TIMESTAMPTZ
```

#### `member_group_assignments`
```sql
id: UUID (PK)
member_id: UUID (FK profiles)
group_id: UUID (FK contribution_groups)
assigned_at: TIMESTAMPTZ
UNIQUE(member_id)  -- 1 groep per lid
```

### Voting Tables

#### `meetings`
```sql
id: UUID (PK)
association_id: UUID (FK)
date: DATE
name: TEXT
description, location: TEXT
status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
created_at: TIMESTAMPTZ
```

#### `proposals`
```sql
id: UUID (PK)
association_id: UUID (FK)
meeting_id: UUID (FK meetings, nullable)
title: TEXT
description: TEXT
type: 'NORMAL' | 'SPECIAL' | 'UNANIMOUS'
status: 'DRAFT' | 'OPEN' | 'ACCEPTED' | 'REJECTED'
created_at: TIMESTAMPTZ
```

#### `votes`
```sql
id: UUID (PK)
proposal_id: UUID (FK)
member_id: UUID (FK members)
user_id: UUID (FK auth.users)
choice: 'FOR' | 'AGAINST' | 'ABSTAIN'
weight: NUMERIC  -- Fractiegewicht
created_at: TIMESTAMPTZ
```

### Bookkeeping Tables

#### `ledger_accounts`
```sql
id: UUID (PK)
association_id: UUID (FK)
code: TEXT
name: TEXT
type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
is_system: BOOLEAN
parent_id: UUID (self-reference)
```

#### `journal_entries` & `journal_lines`
Standaard dubbel boekhouden met debit/credit.

---

## Feature Modules Overview

### 1. AUTH (`/features/auth`)
- Login (wachtwoord + magic link)
- Wachtwoord reset
- Activiteitregistratie

### 2. MEMBERS (`/features/members`)
- Ledenlijst met zoeken/filteren
- Lid detail pagina met NAW + IBAN + betalingshistorie
- CRUD operaties via modals
- Eigendomsoverdracht (transfer)
- Safe delete: kan niet verwijderen als er transacties gekoppeld zijn

### 3. FINANCE (`/features/finance`)
**Contributions:**
- Bijdragejaren beheer met groepstarieven
- Automatisch genereren van bijdragen per lid
- Reconciliatie met banktransacties

**Banking:**
- Enable Banking PSD2 integratie
- Transactie-synchronisatie met smart date handling
- Koppelen aan leden/leveranciers/opdrachten
- Auto-categorisatie

**Accounting:**
- Grootboekrekeningen (CoA)
- Journaalboekingen
- Financiele rapportages

### 4. VOTING (`/features/voting`)
- Vergaderingen beheer
- Voorstellen (Kanban + lijst view)
- Stemmen met fractiegewicht
- Automatische uitslag berekening via RPC

### 5. TASKS (`/features/tasks`)
- Onderhoudstaken met prioriteit
- Statussen: open, scheduled, completed, cancelled

### 6. ASSIGNMENTS (`/features/assignments`)
- Werkorders/opdrachten
- Koppeling met leveranciers + documenten
- Status workflow: concept → sent → accepted → completed → paid

### 7. SUPPLIERS (`/features/suppliers`)
- Leverancierscatalogus
- Categorie-indeling
- Default financial category

### 8. DOCUMENTS (`/features/documents`)
- Upload naar Supabase Storage (`vve-documents` bucket)
- Categorisatie

### 9. AGENDA (`/features/agenda`)
- Evenementen met many-to-many categorieen

### 10. SETTINGS (`/features/settings`)
- VvE-instellingen
- Steminstellingen (strategie, quorum)
- Developer mode toggle

### 11. ADMIN/SUPERADMIN
- Platform-breed beheer
- Uitnodigingen voor nieuwe Super Admins
- Email queue monitoring

---

## Architecture Patterns

### Service Layer Pattern
Elke feature heeft een `*Service.ts` voor business logic:
```typescript
// src/features/finance/contributionService.ts
export const contributionService = {
  async getYears(associationId: string) { ... },
  async generateForYear(yearId: string) { ... },
  async reconcileYear(yearId: string) { ... }
};
```

### Supabase Query Patterns
```typescript
// ALTIJD maybeSingle() voor optionele single row
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('column', value)
  .maybeSingle();  // NIET .single() - voorkomt PGRST116

// Joins met nested select
const { data } = await supabase
  .from('profiles')
  .select(`
    *,
    association_memberships (
      *,
      associations (*)
    )
  `)
  .eq('user_id', userId)
  .single();
```

### Activity Logging
Alle wijzigingen worden gelogd:
```typescript
import { activityService } from '../services/activityService';

await activityService.log({
  action: 'member_created',
  entity_type: 'member',
  entity_id: member.id,
  description: `Lid ${member.first_name} ${member.last_name} aangemaakt`
});
```

---

## Row Level Security (RLS)

### Helper Functions
```sql
-- Check VvE toegang (Super Admin ziet alles)
CREATE FUNCTION has_access_to_vve(target_vve_id UUID) RETURNS BOOLEAN

-- Check specifieke rol
CREATE FUNCTION has_role_in_vve(target_vve_id UUID, required_role TEXT) RETURNS BOOLEAN
```

### Policy Pattern
```sql
-- SELECT: Alle leden kunnen zien
CREATE POLICY "view" ON table FOR SELECT
USING (has_access_to_vve(association_id));

-- Manage: Alleen board/admin
CREATE POLICY "manage" ON table FOR ALL
USING (has_access_to_vve(association_id) AND (
  has_role_in_vve(association_id, 'admin') OR
  has_role_in_vve(association_id, 'board')
));
```

---

## SQL Query Guidelines

### Principle: Single Combined Queries
Combineer gerelateerde checks in één query met CTEs:

```sql
-- GOED: Één query met CTEs
WITH
transactions AS (SELECT ...),
contributions AS (SELECT ...),
matching_status AS (SELECT ...)
SELECT * FROM transactions
UNION ALL SELECT * FROM contributions
UNION ALL SELECT * FROM matching_status;

-- FOUT: Meerdere losse queries
```

---

## Project Rules (uit .antigravity/rules.md)

### Code Quality
1. **TypeScript Strict Mode** - Geen `any`, expliciete types
2. **English naming** - Code en database in Engels
3. **Modularity** - Features kunnen aan/uit gezet worden
4. **WCAG Accessibility** - Semantische HTML, ARIA labels
5. **Error Boundaries** - React error boundaries per sectie

### Security
1. **RLS verplicht** - Elke tabel heeft policies
2. **Input validatie** - Nooit client data vertrouwen
3. **Geen secrets client-side** - Alleen `PUBLIC_` env vars
4. **Geen dangerouslySetInnerHTML** zonder sanitization

### Performance
1. **Lazy loading** - React.lazy voor routes
2. **Indexed queries** - Index op FKs en WHERE columns
3. **Geen SELECT *** - Alleen benodigde kolommen
4. **Debounce inputs** - Zoek en resize events

### Compatibility
1. **Mobile-first** - Responsive design
2. **Cross-browser** - Chrome, Firefox, Safari
3. **Dark mode** - System theme support
4. **UTC dates** - Opslag in UTC, display in nl-NL

---

## Known Issues & Workarounds

1. **Column naam**: `last_synced_at` niet `last_sync_at`
2. **React StrictMode**: Dubbele mount - gebruik sessionStorage flags
3. **RLS recursie**: Gebruik `SECURITY DEFINER` helper functions
4. **Ghost users**: Profielen zonder `user_id` voor niet-geregistreerde eigenaren

---

## File Structure

```
src/
├── App.tsx                    # Router + protected routes
├── components/
│   ├── layout/               # SidebarLayout, ProtectedRoute, RoleProtectedRoute
│   └── providers/            # ThemeProvider
├── features/
│   ├── auth/                 # LoginPage, UpdatePasswordPage
│   ├── members/              # MemberListPage, MemberDetailPage, modals, memberService
│   ├── finance/              # ContributionsPage, BankAccountPage, AccountingPage, services
│   ├── voting/               # ProposalsPage, Kanban, votingService
│   ├── tasks/                # TasksPage, taskService
│   ├── assignments/          # AssignmentsPage, assignmentService
│   ├── suppliers/            # SuppliersPage, supplierService
│   ├── documents/            # DocumentListPage, documentService
│   ├── agenda/               # AgendaPage, agendaService
│   ├── settings/             # SettingsPage
│   ├── admin/                # AdminDashboardPage, adminService
│   ├── superadmin/           # SuperAdminPage, AcceptInvitePage, superAdminService
│   ├── overview/             # OverviewPage, widgets
│   └── general/              # NotificationsPage
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── association.ts       # Association context service
├── services/
│   ├── activityService.ts   # Activity logging
│   └── notificationService.ts
├── types/
│   └── database.ts          # TypeScript interfaces voor alle entiteiten
└── utils/
    ├── dateUtils.ts
    ├── debugUtils.ts
    └── transactionUtils.ts

supabase/
├── functions/
│   └── enable-banking/      # PSD2 Edge Function
└── migrations/              # SQL migration files (100+ bestanden)

docs/
├── finance.md               # Finance module documentatie
└── members.md               # Members module documentatie
```
