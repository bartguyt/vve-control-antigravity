/**
 * Banking Module - Canonical Domain Types
 *
 * These types represent the core domain model, independent of any banking provider.
 * Provider adapters map their specific formats to these canonical types.
 */

// ============================================================================
// BANK CONNECTION
// ============================================================================

export type ConnectionStatus = 'pending' | 'active' | 'expired' | 'revoked';
export type ProviderType = 'enable_banking' | 'mock' | 'manual';

export interface BankConnection {
  id: string;
  associationId: string;
  provider: ProviderType;
  providerConnectionId: string; // Provider-specific ID (session_id for Enable Banking)
  status: ConnectionStatus;
  bankName: string;
  bankId: string; // ASPSP ID or mock bank identifier
  expiresAt: Date | null;
  lastSyncedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConnectionParams {
  associationId: string;
  provider: ProviderType;
  providerConnectionId: string;
  bankName: string;
  bankId: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// BANK ACCOUNT
// ============================================================================

export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN' | 'CREDIT_CARD' | 'OTHER';

export interface BankAccount {
  id: string;
  associationId: string;
  connectionId: string;
  externalAccountUid: string; // Provider-specific unique ID
  name: string;
  iban: string | null;
  bic: string | null;
  accountType: AccountType;
  currency: string;
  balance: number | null;
  balanceDate: Date | null;
  isActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountParams {
  associationId: string;
  connectionId: string;
  externalAccountUid: string;
  name: string;
  iban?: string;
  bic?: string;
  accountType?: AccountType;
  currency?: string;
  balance?: number;
  balanceDate?: Date;
}

// ============================================================================
// BANK TRANSACTION
// ============================================================================

export type TransactionStatus = 'BOOK' | 'PNDG' | 'OTHR';
export type CreditDebit = 'CRDT' | 'DBIT';

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  externalReference: string; // Provider-specific unique ID
  bookingDate: Date;
  valueDate: Date | null;
  amount: number; // Always positive, use creditDebit for direction
  currency: string;
  creditDebit: CreditDebit;
  counterpartyName: string | null;
  counterpartyIban: string | null;
  description: string | null;
  status: TransactionStatus;
  category: string | null;
  linkedEntityType: 'member' | 'supplier' | 'assignment' | null;
  linkedEntityId: string | null;
  rawData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionParams {
  bankAccountId: string;
  externalReference: string;
  bookingDate: Date;
  valueDate?: Date;
  amount: number;
  currency?: string;
  creditDebit: CreditDebit;
  counterpartyName?: string;
  counterpartyIban?: string;
  description?: string;
  status?: TransactionStatus;
  rawData?: Record<string, unknown>;
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

export interface SyncResult {
  success: boolean;
  accountId: string;
  transactionsAdded: number;
  transactionsUpdated: number;
  transactionsSkipped: number;
  syncedFrom: Date;
  syncedTo: Date;
  error?: string;
}

export interface SyncOptions {
  dateFrom?: Date;
  dateTo?: Date;
  forceFullSync?: boolean;
}

// ============================================================================
// AUTH FLOW
// ============================================================================

export interface AuthInitResult {
  authUrl: string;
  state?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthCallbackResult {
  connection: BankConnection;
  accounts: BankAccount[];
}

// ============================================================================
// PROVIDER INFO
// ============================================================================

export interface BankInfo {
  id: string;
  name: string;
  country: string;
  logoUrl?: string;
  bic?: string;
}
