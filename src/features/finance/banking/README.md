# Banking Module - Hexagonal Architecture

Dit document beschrijft de nieuwe modulaire architectuur van de Banking module.

## Architectuur Overzicht

De banking module gebruikt een **hexagonal (ports & adapters)** architectuur:

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                 │
│          (BankAccountPage, EnableBankingSandbox, etc.)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION CORE                            │
│              BankingCore (business logic)                        │
│  - Connection orchestration                                      │
│  - Smart sync with date handling                                 │
│  - Transaction deduplication                                     │
│  - Auto-categorization                                           │
│  - Multi-bank, multi-account support                             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐
│ IBankingProvider│  │IBankingRepository│  │  Other Ports   │
│   (PRIMARY)     │  │   (SECONDARY)    │  │                │
└─────────────────┘  └─────────────────┘  └────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│ ADAPTERS:       │  │ ADAPTERS:       │
│ - EnableBanking │  │ - Supabase      │
│ - Mock          │  │   Repository    │
│ - Manual (TODO) │  │                 │
└─────────────────┘  └─────────────────┘
```

## Waarom Hexagonal Architecture?

### Problemen in Oude Architectuur

1. **Enable Banking was de facto "core"**
   - Edge Function bevatte business logic
   - Sync orchestration zat in provider-specifieke code
   - Moeilijk om andere providers toe te voegen

2. **Mock Banking dupleerde business logic**
   - `autoCategorizeAccountTransactions()` bestond in mock service
   - `createPaymentRecords()` bestond in mock service
   - Deze horen in de CORE, niet in de adapter

3. **Geen association-scoping**
   - `check_status` pakte willekeurig de eerste actieve connectie
   - `sync_transactions` kon de verkeerde connectie gebruiken
   - Multi-VvE support was onmogelijk

### Oplossing: Scheiding van Verantwoordelijkheden

| Laag | Verantwoordelijkheid | Voorbeelden |
|------|---------------------|-------------|
| **Core** | Business logic, orchestration | Smart sync, deduplication, categorization |
| **Ports** | Interfaces/contracts | IBankingProvider, IBankingRepository |
| **Adapters** | External integrations | Enable Banking API, Supabase, Mock data |

## Directory Structure

```
src/features/finance/banking/
├── types/
│   └── index.ts              # Canonical domain types
├── ports/
│   ├── IBankingProvider.ts   # Provider interface (primary port)
│   ├── IBankingRepository.ts # Repository interface (secondary port)
│   └── index.ts
├── core/
│   ├── BankingCore.ts        # Business logic service
│   ├── ProviderRegistry.ts   # Provider management
│   └── index.ts
├── adapters/
│   ├── EnableBankingAdapter.ts  # Enable Banking PSD2 provider
│   ├── MockBankingAdapter.ts    # Mock provider (development)
│   ├── SupabaseRepository.ts    # Supabase persistence
│   └── index.ts
├── index.ts                  # Module entry point
└── README.md                 # This file
```

## Usage

### 1. Initialize Module

```typescript
import { createBankingModule } from './features/finance/banking';
import { supabase } from './lib/supabase';

const banking = createBankingModule(supabase, {
  enableMock: import.meta.env.DEV,
  enableEnableBanking: true,
  defaultSyncDaysBack: 90,
  enableAutoCategorizaton: true,
});
```

### 2. Get Available Banks

```typescript
// From specific provider
const banks = await banking.getAvailableBanks('enable_banking', 'NL');

// From all providers
const allBanks = await banking.getAllAvailableBanks('NL');
```

### 3. Connect to Bank (Wizard Flow)

```typescript
// Step 1: Initiate connection
const { authUrl } = await banking.initiateConnection(
  'enable_banking',
  'Rabobank',
  window.location.href,
  associationId
);

// Redirect user to authUrl...

// Step 2: Handle callback
const { connection, accounts } = await banking.completeConnection(
  'enable_banking',
  authCode,
  associationId
);
```

### 4. Sync Transactions

```typescript
// Sync single account (smart sync - uses last_synced_at)
const result = await banking.syncAccount(accountId);
console.log(`Added ${result.transactionsAdded}, skipped ${result.transactionsSkipped}`);

// Sync all accounts for association
const results = await banking.syncAllAccounts(associationId);

// Force full sync
const fullResult = await banking.syncAccount(accountId, { forceFullSync: true });
```

### 5. Transaction Operations

```typescript
// Get transactions
const transactions = await banking.getTransactions(accountId, {
  dateFrom: new Date('2024-01-01'),
  limit: 50
});

// Link to member
await banking.linkTransaction(transactionId, 'member', memberId);

// Categorize
await banking.categorizeTransaction(transactionId, 'utilities:energy');

// Get unlinked (for reconciliation)
const unlinked = await banking.getUnlinkedTransactions(accountId, 'CRDT');
```

## Key Features

### Smart Sync
- Gebruikt `last_synced_at` per account
- Haalt alleen nieuwe transacties op
- Buffer van 1 dag voor veiligheid
- Fallback naar configureerbare standaard periode

### Deduplication
- Automatisch via `bank_account_id + external_reference` unique constraint
- Bulk upsert handelt dit af
- Geen duplicaten mogelijk

### Auto-Categorization
- Configureerbare regex-based rules
- Wordt automatisch na sync uitgevoerd
- Extensible pattern matching systeem

### Multi-Bank Support
- Elk VvE kan meerdere banken koppelen
- Elke bank kan meerdere rekeningen hebben
- `association_id` scoping voorkomt cross-contamination

### Provider Agnostic
- Core depends alleen op interfaces
- Nieuwe providers toevoegen = nieuwe adapter implementeren
- Mock provider voor development zonder API calls

## Adding a New Provider

1. **Implement IBankingProvider**:

```typescript
export class NewBankAdapter implements IBankingProvider {
  readonly providerId = 'new_bank';
  readonly providerName = 'New Bank';
  readonly supportsOAuth = true;
  readonly supportsSync = true;

  // Implement all interface methods...
}
```

2. **Register in Module**:

```typescript
import { createNewBankAdapter } from './adapters/NewBankAdapter';

// In createBankingModule:
if (mergedConfig.enableNewBank) {
  registry.register(createNewBankAdapter(supabase));
}
```

3. **Done!** Core business logic works automatically.

## Migration from Old Code

### Database Changes

Run migration: `20260124_enhance_banking_schema.sql`

Dit voegt toe:
- `association_id` aan `bank_connections`
- `account_type`, `balance`, `balance_date` aan `bank_accounts`
- `category`, `linked_entity_type`, `linked_entity_id` aan `bank_transactions`
- Indexes voor performance
- Updated_at triggers

### Edge Function Changes

De Enable Banking Edge Function is geüpdatet:
- `activate_session`: Vereist en slaat `association_id` op
- `sync_transactions`: Filtert op `association_id`
- `check_status`: Ondersteunt `connection_id` OF `association_id` filtering

### Frontend Migration

**Oude manier** (direct Edge Function aanroepen):
```typescript
const { data } = await supabase.functions.invoke('enable-banking', {
  body: { action: 'sync_transactions', account_uid }
});
```

**Nieuwe manier** (via BankingCore):
```typescript
const banking = getBankingModule(supabase);
const result = await banking.syncAccount(accountId);
```

## Testing

### Mock Provider

De `MockBankingAdapter` genereert realistische data:
- Nederlandse banken (Rabobank, ING, ABN AMRO)
- Realistische IBANs
- VvE-specifieke transacties (bijdragen, kosten)
- Geen API calls nodig

Enable mock in development:
```typescript
const banking = createBankingModule(supabase, {
  enableMock: true
});
```

## Best Practices

1. **Altijd via BankingCore**
   - Nooit direct adapters aanroepen
   - Gebruik `getBankingModule()` singleton

2. **Association Scoping**
   - Geef altijd `associationId` mee
   - Filter op association niveau

3. **Error Handling**
   - Sync kan falen per account
   - Check `result.success` en `result.error`

4. **Smart Sync**
   - Laat `last_synced_at` auto-updating
   - Gebruik `forceFullSync` alleen bij problemen

5. **Provider Selection**
   - Mock voor development
   - Enable Banking voor productie
   - Simpel te switchen via config

## Roadmap

- [ ] Manual entry adapter voor banken zonder PSD2
- [ ] ABN AMRO direct API adapter
- [ ] ING direct API adapter
- [ ] Scheduled auto-sync (cronjob)
- [ ] Webhook support voor real-time updates
- [ ] ML-based categorization
- [ ] Transaction dispute/correction flow
- [ ] Multi-currency support
- [ ] Export naar accountancy software (Exact, Twinfield)

## Support

Vragen over de architectuur? Zie:
- `types/index.ts` - Domain model
- `ports/IBankingProvider.ts` - Provider contract
- `core/BankingCore.ts` - Business logic
- `CLAUDE.md` - Project context
