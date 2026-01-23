/**
 * Banking Core Service
 *
 * This is the APPLICATION CORE - it contains all business logic for banking operations.
 * It depends ONLY on ports (interfaces), never on concrete implementations.
 *
 * Key responsibilities:
 * - Orchestrate bank connection flows
 * - Manage sync operations with smart date handling
 * - Handle transaction deduplication
 * - Coordinate multi-bank, multi-account operations
 */

import type {
  BankConnection,
  BankAccount,
  BankTransaction,
  BankInfo,
  SyncResult,
  SyncOptions,
  AuthInitResult,
  AuthCallbackResult,
  ProviderType,
} from '../types';

import type {
  IBankingProvider,
  IProviderRegistry,
  IBankingRepository,
} from '../ports';

// ============================================================================
// CORE SERVICE CONFIGURATION
// ============================================================================

export interface BankingCoreConfig {
  defaultSyncDaysBack: number;
  maxSyncPages: number;
  enableAutoCategorizaton: boolean;
}

const DEFAULT_CONFIG: BankingCoreConfig = {
  defaultSyncDaysBack: 90,
  maxSyncPages: 50,
  enableAutoCategorizaton: true,
};

// ============================================================================
// BANKING CORE SERVICE
// ============================================================================

export class BankingCore {
  private config: BankingCoreConfig;

  constructor(
    private readonly providerRegistry: IProviderRegistry,
    private readonly repository: IBankingRepository,
    config: Partial<BankingCoreConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // PROVIDER MANAGEMENT
  // ==========================================================================

  /**
   * Get a specific provider by ID
   */
  getProvider(providerId: ProviderType): IBankingProvider {
    const provider = this.providerRegistry.get(providerId);
    if (!provider) {
      throw new Error(`Banking provider "${providerId}" not registered`);
    }
    return provider;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IBankingProvider[] {
    return this.providerRegistry.getAll();
  }

  // ==========================================================================
  // BANK DISCOVERY
  // ==========================================================================

  /**
   * Get available banks for a country from a specific provider
   */
  async getAvailableBanks(
    providerId: ProviderType,
    country: string
  ): Promise<BankInfo[]> {
    const provider = this.getProvider(providerId);
    return provider.getAvailableBanks(country);
  }

  /**
   * Get available banks from all providers
   */
  async getAllAvailableBanks(country: string): Promise<
    Array<BankInfo & { providerId: ProviderType }>
  > {
    const providers = this.getAllProviders();
    const results = await Promise.all(
      providers.map(async (provider) => {
        try {
          const banks = await provider.getAvailableBanks(country);
          return banks.map((bank) => ({
            ...bank,
            providerId: provider.providerId as ProviderType,
          }));
        } catch (error) {
          console.error(
            `Failed to get banks from ${provider.providerId}:`,
            error
          );
          return [];
        }
      })
    );
    return results.flat();
  }

  // ==========================================================================
  // CONNECTION FLOW
  // ==========================================================================

  /**
   * Start bank connection flow (Step 1 of wizard)
   */
  async initiateConnection(
    providerId: ProviderType,
    bankId: string,
    redirectUri: string,
    associationId: string
  ): Promise<AuthInitResult> {
    const provider = this.getProvider(providerId);
    return provider.initAuth(bankId, redirectUri, associationId);
  }

  /**
   * Complete bank connection after OAuth callback (Step 2 of wizard)
   */
  async completeConnection(
    providerId: ProviderType,
    authCode: string,
    associationId: string
  ): Promise<AuthCallbackResult> {
    const provider = this.getProvider(providerId);

    // Get connection and accounts from provider
    const result = await provider.handleCallback(authCode, associationId);

    // Persist connection
    const savedConnection = await this.repository.connections.create({
      associationId,
      provider: providerId,
      providerConnectionId: result.connection.providerConnectionId,
      bankName: result.connection.bankName,
      bankId: result.connection.bankId,
      expiresAt: result.connection.expiresAt || undefined,
      metadata: result.connection.metadata,
    });

    // Persist accounts
    const savedAccounts: BankAccount[] = [];
    for (const account of result.accounts) {
      const saved = await this.repository.accounts.upsert({
        associationId,
        connectionId: savedConnection.id,
        externalAccountUid: account.externalAccountUid,
        name: account.name,
        iban: account.iban || undefined,
        bic: account.bic || undefined,
        accountType: account.accountType,
        currency: account.currency,
        balance: account.balance || undefined,
        balanceDate: account.balanceDate || undefined,
      });
      savedAccounts.push(saved);
    }

    return {
      connection: savedConnection,
      accounts: savedAccounts,
    };
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Get all connections for an association
   */
  async getConnections(
    associationId: string,
    activeOnly = true
  ): Promise<BankConnection[]> {
    return this.repository.connections.findByAssociationId(
      associationId,
      activeOnly ? 'active' : undefined
    );
  }

  /**
   * Get a specific connection by ID
   */
  async getConnection(connectionId: string): Promise<BankConnection | null> {
    return this.repository.connections.findById(connectionId);
  }

  /**
   * Check if a connection is still valid
   */
  async checkConnectionHealth(
    connectionId: string
  ): Promise<{ isValid: boolean; needsReauth: boolean }> {
    const connection = await this.repository.connections.findById(connectionId);
    if (!connection) {
      return { isValid: false, needsReauth: true };
    }

    const provider = this.getProvider(connection.provider);
    return provider.checkConnectionStatus(connectionId);
  }

  /**
   * Disconnect a bank (revoke connection)
   */
  async disconnectBank(connectionId: string): Promise<void> {
    const connection = await this.repository.connections.findById(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const provider = this.getProvider(connection.provider);
    await provider.revokeConnection(connectionId);
    await this.repository.connections.updateStatus(connectionId, 'revoked');
  }

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  /**
   * Get all accounts for an association
   */
  async getAccounts(associationId: string): Promise<BankAccount[]> {
    return this.repository.accounts.findByAssociationId(associationId);
  }

  /**
   * Get accounts for a specific connection
   */
  async getAccountsByConnection(connectionId: string): Promise<BankAccount[]> {
    return this.repository.accounts.findByConnectionId(connectionId);
  }

  /**
   * Refresh accounts from provider (re-fetch from bank)
   */
  async refreshAccounts(connectionId: string): Promise<BankAccount[]> {
    const connection = await this.repository.connections.findById(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const provider = this.getProvider(connection.provider);
    const providerAccounts = await provider.getAccounts(connectionId);

    const refreshedAccounts: BankAccount[] = [];
    for (const account of providerAccounts) {
      const saved = await this.repository.accounts.upsert({
        associationId: connection.associationId,
        connectionId: connection.id,
        externalAccountUid: account.externalAccountUid,
        name: account.name,
        iban: account.iban || undefined,
        bic: account.bic || undefined,
        accountType: account.accountType,
        currency: account.currency,
        balance: account.balance || undefined,
        balanceDate: account.balanceDate || undefined,
      });
      refreshedAccounts.push(saved);
    }

    return refreshedAccounts;
  }

  // ==========================================================================
  // TRANSACTION SYNC
  // ==========================================================================

  /**
   * Sync transactions for a single account (smart sync)
   */
  async syncAccount(
    accountId: string,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const account = await this.repository.accounts.findById(accountId);
    if (!account) {
      return {
        success: false,
        accountId,
        transactionsAdded: 0,
        transactionsUpdated: 0,
        transactionsSkipped: 0,
        syncedFrom: new Date(),
        syncedTo: new Date(),
        error: 'Account not found',
      };
    }

    const connection = await this.repository.connections.findById(
      account.connectionId
    );
    if (!connection) {
      return {
        success: false,
        accountId,
        transactionsAdded: 0,
        transactionsUpdated: 0,
        transactionsSkipped: 0,
        syncedFrom: new Date(),
        syncedTo: new Date(),
        error: 'Connection not found',
      };
    }

    // Smart sync: use last_synced_at if available
    const syncFrom = this.determineSyncStartDate(account, options);
    const syncTo = options.dateTo || new Date();

    try {
      const provider = this.getProvider(connection.provider);

      // Fetch transactions from provider
      const transactions = await provider.fetchTransactions(
        connection.id,
        account.externalAccountUid,
        { dateFrom: syncFrom, dateTo: syncTo }
      );

      // Bulk upsert (handles deduplication)
      const result = await this.repository.transactions.bulkUpsert(
        transactions.map((t) => ({
          ...t,
          bankAccountId: account.id,
        }))
      );

      // Update last_synced_at
      await this.repository.accounts.updateLastSyncedAt(account.id, syncTo);

      // Auto-categorize if enabled
      if (this.config.enableAutoCategorizaton) {
        await this.autoCategorizeTransactions(account.id);
      }

      return {
        success: true,
        accountId,
        transactionsAdded: result.added,
        transactionsUpdated: result.updated,
        transactionsSkipped: result.skipped,
        syncedFrom: syncFrom,
        syncedTo: syncTo,
      };
    } catch (error) {
      return {
        success: false,
        accountId,
        transactionsAdded: 0,
        transactionsUpdated: 0,
        transactionsSkipped: 0,
        syncedFrom: syncFrom,
        syncedTo: syncTo,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync all accounts for an association
   */
  async syncAllAccounts(associationId: string): Promise<SyncResult[]> {
    const accounts = await this.repository.accounts.findByAssociationId(
      associationId
    );
    const results = await Promise.all(
      accounts
        .filter((a) => a.isActive)
        .map((account) => this.syncAccount(account.id))
    );
    return results;
  }

  /**
   * Sync all accounts for a specific connection
   */
  async syncConnection(connectionId: string): Promise<SyncResult[]> {
    const accounts = await this.repository.accounts.findByConnectionId(
      connectionId
    );
    const results = await Promise.all(
      accounts
        .filter((a) => a.isActive)
        .map((account) => this.syncAccount(account.id))
    );
    return results;
  }

  // ==========================================================================
  // TRANSACTION OPERATIONS
  // ==========================================================================

  /**
   * Get transactions for an account
   */
  async getTransactions(
    accountId: string,
    options: { dateFrom?: Date; dateTo?: Date; limit?: number; offset?: number } = {}
  ): Promise<BankTransaction[]> {
    return this.repository.transactions.findByAccountId(accountId, options);
  }

  /**
   * Get unlinked transactions for reconciliation
   */
  async getUnlinkedTransactions(
    accountId: string,
    type?: 'CRDT' | 'DBIT'
  ): Promise<BankTransaction[]> {
    return this.repository.transactions.findUnlinked(accountId, type);
  }

  /**
   * Link transaction to an entity (member, supplier, assignment)
   */
  async linkTransaction(
    transactionId: string,
    entityType: 'member' | 'supplier' | 'assignment',
    entityId: string
  ): Promise<BankTransaction> {
    return this.repository.transactions.linkToEntity(
      transactionId,
      entityType,
      entityId
    );
  }

  /**
   * Unlink transaction
   */
  async unlinkTransaction(transactionId: string): Promise<BankTransaction> {
    return this.repository.transactions.unlink(transactionId);
  }

  /**
   * Categorize a transaction
   */
  async categorizeTransaction(
    transactionId: string,
    category: string
  ): Promise<BankTransaction> {
    return this.repository.transactions.categorize(transactionId, category);
  }

  // ==========================================================================
  // AUTO-CATEGORIZATION (Business Logic)
  // ==========================================================================

  /**
   * Auto-categorize transactions based on rules
   */
  private async autoCategorizeTransactions(accountId: string): Promise<number> {
    // Default categorization rules (can be extended/configured)
    const rules = [
      // Common Dutch utilities
      {
        pattern: /vattenfall|eneco|essent|nuon/i,
        field: 'counterpartyName' as const,
        category: 'utilities:energy',
      },
      {
        pattern: /waternet|evides|brabant water/i,
        field: 'counterpartyName' as const,
        category: 'utilities:water',
      },
      // Insurance
      {
        pattern: /verzekering|insurance|aegon|nn group|centraal beheer/i,
        field: 'description' as const,
        category: 'insurance',
      },
      // Maintenance
      {
        pattern: /onderhoud|maintenance|schoonmaak|cleaning/i,
        field: 'description' as const,
        category: 'maintenance',
      },
      // Service charges (VVE contributions)
      {
        pattern: /servicek|vve|bijdrage|contribution/i,
        field: 'description' as const,
        category: 'contribution',
      },
    ];

    return this.repository.transactions.autoCategorize(accountId, rules);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Determine the start date for syncing based on last sync and options
   */
  private determineSyncStartDate(
    account: BankAccount,
    options: SyncOptions
  ): Date {
    // If force full sync, start from configured days back
    if (options.forceFullSync) {
      const date = new Date();
      date.setDate(date.getDate() - this.config.defaultSyncDaysBack);
      return date;
    }

    // If explicit dateFrom provided, use it
    if (options.dateFrom) {
      return options.dateFrom;
    }

    // Smart sync: use last_synced_at minus 1 day buffer for safety
    if (account.lastSyncedAt) {
      const date = new Date(account.lastSyncedAt);
      date.setDate(date.getDate() - 1);
      return date;
    }

    // First sync: go back configured days
    const date = new Date();
    date.setDate(date.getDate() - this.config.defaultSyncDaysBack);
    return date;
  }
}

// ============================================================================
// FACTORY (for DI)
// ============================================================================

export function createBankingCore(
  providerRegistry: IProviderRegistry,
  repository: IBankingRepository,
  config?: Partial<BankingCoreConfig>
): BankingCore {
  return new BankingCore(providerRegistry, repository, config);
}
