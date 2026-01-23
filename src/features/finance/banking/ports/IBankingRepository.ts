/**
 * Banking Repository Port (Secondary Port)
 *
 * This interface abstracts the persistence layer.
 * The core business logic uses this interface to store and retrieve data,
 * without knowing anything about Supabase, PostgreSQL, or any other storage mechanism.
 */

import type {
  BankConnection,
  BankAccount,
  BankTransaction,
  CreateConnectionParams,
  CreateAccountParams,
  CreateTransactionParams,
  ConnectionStatus,
  ProviderType,
} from '../types';

// ============================================================================
// CONNECTION REPOSITORY
// ============================================================================

export interface IConnectionRepository {
  /**
   * Create a new bank connection
   */
  create(params: CreateConnectionParams): Promise<BankConnection>;

  /**
   * Find connection by ID
   */
  findById(id: string): Promise<BankConnection | null>;

  /**
   * Find connection by provider-specific ID (e.g., session_id)
   */
  findByProviderConnectionId(
    provider: ProviderType,
    providerConnectionId: string
  ): Promise<BankConnection | null>;

  /**
   * Find all connections for an association
   */
  findByAssociationId(
    associationId: string,
    status?: ConnectionStatus
  ): Promise<BankConnection[]>;

  /**
   * Update connection status
   */
  updateStatus(id: string, status: ConnectionStatus): Promise<BankConnection>;

  /**
   * Update connection metadata
   */
  updateMetadata(
    id: string,
    metadata: Record<string, unknown>
  ): Promise<BankConnection>;

  /**
   * Delete connection and all related data
   */
  delete(id: string): Promise<void>;
}

// ============================================================================
// ACCOUNT REPOSITORY
// ============================================================================

export interface IAccountRepository {
  /**
   * Create a new bank account
   */
  create(params: CreateAccountParams): Promise<BankAccount>;

  /**
   * Upsert account (create or update by external UID)
   */
  upsert(params: CreateAccountParams): Promise<BankAccount>;

  /**
   * Find account by ID
   */
  findById(id: string): Promise<BankAccount | null>;

  /**
   * Find account by external UID within an association
   */
  findByExternalUid(
    associationId: string,
    externalAccountUid: string
  ): Promise<BankAccount | null>;

  /**
   * Find all accounts for a connection
   */
  findByConnectionId(connectionId: string): Promise<BankAccount[]>;

  /**
   * Find all accounts for an association
   */
  findByAssociationId(associationId: string): Promise<BankAccount[]>;

  /**
   * Update last synced timestamp
   */
  updateLastSyncedAt(id: string, date: Date): Promise<BankAccount>;

  /**
   * Update account balance
   */
  updateBalance(
    id: string,
    balance: number,
    balanceDate: Date
  ): Promise<BankAccount>;

  /**
   * Deactivate account
   */
  deactivate(id: string): Promise<BankAccount>;
}

// ============================================================================
// TRANSACTION REPOSITORY
// ============================================================================

export interface ITransactionRepository {
  /**
   * Create a new transaction
   */
  create(params: CreateTransactionParams): Promise<BankTransaction>;

  /**
   * Bulk upsert transactions (deduplicates by external reference)
   */
  bulkUpsert(params: CreateTransactionParams[]): Promise<{
    added: number;
    updated: number;
    skipped: number;
  }>;

  /**
   * Find transaction by ID
   */
  findById(id: string): Promise<BankTransaction | null>;

  /**
   * Find transaction by external reference
   */
  findByExternalReference(
    bankAccountId: string,
    externalReference: string
  ): Promise<BankTransaction | null>;

  /**
   * Find transactions for an account
   */
  findByAccountId(
    bankAccountId: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<BankTransaction[]>;

  /**
   * Find unlinked transactions (for reconciliation)
   */
  findUnlinked(
    bankAccountId: string,
    creditDebit?: 'CRDT' | 'DBIT'
  ): Promise<BankTransaction[]>;

  /**
   * Link transaction to entity
   */
  linkToEntity(
    id: string,
    entityType: 'member' | 'supplier' | 'assignment',
    entityId: string
  ): Promise<BankTransaction>;

  /**
   * Unlink transaction
   */
  unlink(id: string): Promise<BankTransaction>;

  /**
   * Set category
   */
  categorize(id: string, category: string): Promise<BankTransaction>;

  /**
   * Bulk categorize by pattern matching
   */
  autoCategorize(
    bankAccountId: string,
    rules: Array<{
      pattern: RegExp | string;
      field: 'description' | 'counterpartyName' | 'counterpartyIban';
      category: string;
    }>
  ): Promise<number>;
}

// ============================================================================
// COMBINED REPOSITORY (Convenience)
// ============================================================================

export interface IBankingRepository {
  connections: IConnectionRepository;
  accounts: IAccountRepository;
  transactions: ITransactionRepository;
}
