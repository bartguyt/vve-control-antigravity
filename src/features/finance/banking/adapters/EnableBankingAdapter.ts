/**
 * Enable Banking Provider Adapter
 *
 * Implements IBankingProvider using the Enable Banking PSD2 API.
 * Communicates with the enable-banking Edge Function for actual API calls.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { IBankingProvider } from '../ports';
import type {
  BankInfo,
  BankAccount,
  BankConnection,
  AuthInitResult,
  AuthCallbackResult,
  SyncOptions,
  CreateTransactionParams,
  AccountType,
} from '../types';

// ============================================================================
// ENABLE BANKING SPECIFIC TYPES (from API responses)
// ============================================================================

interface EBAccount {
  account_uid: string;
  iban?: string;
  bban?: string;
  account_name?: string;
  product?: string;
  currency?: string;
  bic?: string;
}

interface EBTransaction {
  entry_reference?: string;
  transaction_id?: string;
  booking_date: string;
  value_date?: string;
  transaction_amount: {
    amount: string;
    currency: string;
  };
  credit_debit_indicator: 'CRDT' | 'DBIT';
  status: 'BOOK' | 'PNDG' | 'OTHR';
  creditor_name?: string;
  creditor_account?: { iban?: string };
  debtor_name?: string;
  debtor_account?: { iban?: string };
  remittance_information?: string[];
}

interface EBASPSP {
  name: string;
  country: string;
  logo?: string;
  bic?: string;
}

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

export class EnableBankingAdapter implements IBankingProvider {
  readonly providerId = 'enable_banking';
  readonly providerName = 'Enable Banking (PSD2)';
  readonly supportsOAuth = true;
  readonly supportsSync = true;

  constructor(private supabase: SupabaseClient) {}

  // ==========================================================================
  // BANK DISCOVERY
  // ==========================================================================

  async getAvailableBanks(country: string): Promise<BankInfo[]> {
    const { data, error } = await this.supabase.functions.invoke(
      'enable-banking',
      {
        body: { action: 'get_aspsps', country },
      }
    );

    if (error) throw new Error(`Failed to get banks: ${error.message}`);
    if (data?.error) throw new Error(data.error);

    const aspsps = data?.aspsps || [];
    return aspsps.map((aspsp: EBASPSP) => ({
      id: aspsp.name, // Enable Banking uses name as identifier
      name: aspsp.name,
      country: aspsp.country,
      logoUrl: aspsp.logo,
      bic: aspsp.bic,
    }));
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  async initAuth(
    bankId: string,
    redirectUri: string,
    associationId: string
  ): Promise<AuthInitResult> {
    const { data, error } = await this.supabase.functions.invoke(
      'enable-banking',
      {
        body: {
          action: 'init_auth',
          aspsp_name: bankId,
          redirect_url: redirectUri,
          association_id: associationId,
        },
      }
    );

    if (error) throw new Error(`Failed to init auth: ${error.message}`);
    if (data?.error) throw new Error(data.error);

    return {
      authUrl: data.url,
      metadata: {
        aspsp_name: bankId,
        association_id: associationId,
      },
    };
  }

  async handleCallback(
    code: string,
    associationId: string
  ): Promise<AuthCallbackResult> {
    const { data, error } = await this.supabase.functions.invoke(
      'enable-banking',
      {
        body: {
          action: 'activate_session',
          code,
          association_id: associationId,
        },
      }
    );

    if (error) throw new Error(`Failed to activate session: ${error.message}`);
    if (data?.error) throw new Error(data.error);

    // Map response to canonical types
    const sessionId = data.session_id;
    const expiresAt = data.valid_until ? new Date(data.valid_until) : null;
    const accounts: BankAccount[] = (data.accounts || []).map(
      (acc: EBAccount) => this.mapEBAccount(acc, associationId, '')
    );

    // Extract bank info from first account or metadata
    const bankName = data.aspsp?.name || 'Unknown Bank';

    const connection: BankConnection = {
      id: '', // Will be set by repository
      associationId,
      provider: 'enable_banking',
      providerConnectionId: sessionId,
      status: 'active',
      bankName,
      bankId: bankName,
      expiresAt,
      lastSyncedAt: null,
      metadata: {
        aspsp: data.aspsp,
        access_token: data.access_token,
        accounts: data.accounts,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { connection, accounts };
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  async checkConnectionStatus(
    connectionId: string
  ): Promise<{ isValid: boolean; expiresAt: Date | null; needsReauth: boolean }> {
    // For Enable Banking, we check the session validity via the Edge Function
    const { data, error } = await this.supabase.functions.invoke(
      'enable-banking',
      {
        body: {
          action: 'check_status',
          connection_id: connectionId,
        },
      }
    );

    if (error || data?.error) {
      return { isValid: false, expiresAt: null, needsReauth: true };
    }

    const expiresAt = data.valid_until ? new Date(data.valid_until) : null;
    const isExpired = expiresAt ? expiresAt < new Date() : false;

    return {
      isValid: !isExpired && data.status === 'active',
      expiresAt,
      needsReauth: isExpired,
    };
  }

  async revokeConnection(connectionId: string): Promise<void> {
    // Enable Banking sessions expire automatically
    // We just mark ours as revoked in the DB (handled by core)
    console.log(`Revoking connection ${connectionId} (Enable Banking session will expire naturally)`);
  }

  // ==========================================================================
  // ACCOUNT OPERATIONS
  // ==========================================================================

  async getAccounts(connectionId: string): Promise<BankAccount[]> {
    const { data, error } = await this.supabase.functions.invoke(
      'enable-banking',
      {
        body: {
          action: 'check_status',
          connection_id: connectionId,
        },
      }
    );

    if (error) throw new Error(`Failed to get accounts: ${error.message}`);
    if (data?.error) throw new Error(data.error);

    const accounts = data.accounts || data.metadata?.accounts || [];
    return accounts.map((acc: EBAccount) =>
      this.mapEBAccount(acc, data.association_id || '', connectionId)
    );
  }

  // ==========================================================================
  // TRANSACTION OPERATIONS
  // ==========================================================================

  async fetchTransactions(
    connectionId: string,
    accountUid: string,
    options?: SyncOptions
  ): Promise<CreateTransactionParams[]> {
    const dateFrom = options?.dateFrom || this.getDefaultDateFrom();
    const dateTo = options?.dateTo || new Date();

    const { data, error } = await this.supabase.functions.invoke(
      'enable-banking',
      {
        body: {
          action: 'sync_transactions',
          connection_id: connectionId,
          account_uid: accountUid,
          date_from: dateFrom.toISOString().split('T')[0],
          date_to: dateTo.toISOString().split('T')[0],
        },
      }
    );

    if (error)
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    if (data?.error) throw new Error(data.error);

    const transactions = data.transactions || [];
    return transactions.map((tx: EBTransaction) => this.mapEBTransaction(tx));
  }

  // ==========================================================================
  // MAPPERS
  // ==========================================================================

  private mapEBAccount(
    acc: EBAccount,
    associationId: string,
    connectionId: string
  ): BankAccount {
    return {
      id: '', // Will be set by repository
      associationId,
      connectionId,
      externalAccountUid: acc.account_uid,
      name: acc.account_name || acc.product || acc.iban || 'Unknown Account',
      iban: acc.iban || null,
      bic: acc.bic || null,
      accountType: this.inferAccountType(acc),
      currency: acc.currency || 'EUR',
      balance: null,
      balanceDate: null,
      isActive: true,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapEBTransaction(tx: EBTransaction): CreateTransactionParams {
    // Determine counterparty based on credit/debit
    const isCredit = tx.credit_debit_indicator === 'CRDT';
    const counterpartyName = isCredit ? tx.debtor_name : tx.creditor_name;
    const counterpartyIban = isCredit
      ? tx.debtor_account?.iban
      : tx.creditor_account?.iban;

    // Build description from remittance info
    const description = tx.remittance_information?.join(' ') || null;

    // Generate unique reference
    const externalRef =
      tx.entry_reference ||
      tx.transaction_id ||
      `${tx.booking_date}_${tx.transaction_amount.amount}_${tx.credit_debit_indicator}`;

    return {
      bankAccountId: '', // Will be set by caller
      externalReference: externalRef,
      bookingDate: new Date(tx.booking_date),
      valueDate: tx.value_date ? new Date(tx.value_date) : undefined,
      amount: Math.abs(parseFloat(tx.transaction_amount.amount)),
      currency: tx.transaction_amount.currency,
      creditDebit: tx.credit_debit_indicator,
      counterpartyName: counterpartyName || undefined,
      counterpartyIban: counterpartyIban || undefined,
      description: description || undefined,
      status: tx.status,
      rawData: tx as unknown as Record<string, unknown>,
    };
  }

  private inferAccountType(acc: EBAccount): AccountType {
    const product = (acc.product || '').toLowerCase();
    if (product.includes('saving') || product.includes('spaar')) {
      return 'SAVINGS';
    }
    if (product.includes('credit')) {
      return 'CREDIT_CARD';
    }
    if (product.includes('loan') || product.includes('lening')) {
      return 'LOAN';
    }
    return 'CHECKING';
  }

  private getDefaultDateFrom(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date;
  }
}

/**
 * Factory function
 */
export function createEnableBankingAdapter(
  supabase: SupabaseClient
): IBankingProvider {
  return new EnableBankingAdapter(supabase);
}
