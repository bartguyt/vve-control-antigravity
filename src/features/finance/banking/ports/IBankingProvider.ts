/**
 * Banking Provider Port (Primary Port)
 *
 * This interface defines the contract that all banking provider adapters must implement.
 * The core business logic depends ONLY on this interface, never on concrete implementations.
 *
 * Examples of providers:
 * - EnableBankingAdapter: Real PSD2 connections via Enable Banking API
 * - MockBankingAdapter: Development/testing with fake data
 * - ManualAdapter: Manual entry for banks without PSD2
 */

import type {
  BankInfo,
  BankAccount,
  BankTransaction,
  BankConnection,
  AuthInitResult,
  AuthCallbackResult,
  SyncOptions,
  SyncResult,
  CreateTransactionParams,
} from '../types';

export interface IBankingProvider {
  /**
   * Provider identifier (must be unique)
   */
  readonly providerId: string;

  /**
   * Human-readable provider name
   */
  readonly providerName: string;

  /**
   * Whether this provider supports OAuth-style authentication
   */
  readonly supportsOAuth: boolean;

  /**
   * Whether this provider supports transaction sync
   */
  readonly supportsSync: boolean;

  // ============================================================================
  // BANK DISCOVERY
  // ============================================================================

  /**
   * Get list of supported banks for this provider
   * @param country ISO 3166-1 alpha-2 country code (e.g., 'NL', 'XS' for sandbox)
   */
  getAvailableBanks(country: string): Promise<BankInfo[]>;

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Initialize authentication flow with a bank
   * @param bankId The bank identifier from getAvailableBanks
   * @param redirectUri Where to redirect after auth
   * @param associationId The VvE this connection belongs to
   */
  initAuth(
    bankId: string,
    redirectUri: string,
    associationId: string
  ): Promise<AuthInitResult>;

  /**
   * Complete authentication after OAuth callback
   * @param code Authorization code from callback
   * @param associationId The VvE this connection belongs to
   */
  handleCallback(
    code: string,
    associationId: string
  ): Promise<AuthCallbackResult>;

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Check if a connection is still valid/active
   * @param connectionId Internal connection ID
   */
  checkConnectionStatus(connectionId: string): Promise<{
    isValid: boolean;
    expiresAt: Date | null;
    needsReauth: boolean;
  }>;

  /**
   * Refresh connection if possible (extend validity)
   * @param connectionId Internal connection ID
   */
  refreshConnection?(connectionId: string): Promise<BankConnection>;

  /**
   * Revoke/disconnect a bank connection
   * @param connectionId Internal connection ID
   */
  revokeConnection(connectionId: string): Promise<void>;

  // ============================================================================
  // ACCOUNT OPERATIONS
  // ============================================================================

  /**
   * Get accounts for a connection
   * @param connectionId Internal connection ID
   */
  getAccounts(connectionId: string): Promise<BankAccount[]>;

  /**
   * Get account balance (if supported by provider)
   * @param connectionId Internal connection ID
   * @param accountUid External account UID
   */
  getAccountBalance?(
    connectionId: string,
    accountUid: string
  ): Promise<{ balance: number; date: Date }>;

  // ============================================================================
  // TRANSACTION OPERATIONS
  // ============================================================================

  /**
   * Fetch transactions for an account
   * @param connectionId Internal connection ID
   * @param accountUid External account UID
   * @param options Sync options (date range, etc.)
   */
  fetchTransactions(
    connectionId: string,
    accountUid: string,
    options?: SyncOptions
  ): Promise<CreateTransactionParams[]>;
}

/**
 * Factory function type for creating provider instances
 */
export type BankingProviderFactory = () => IBankingProvider;

/**
 * Provider registry for dependency injection
 */
export interface IProviderRegistry {
  register(provider: IBankingProvider): void;
  get(providerId: string): IBankingProvider | undefined;
  getAll(): IBankingProvider[];
}
