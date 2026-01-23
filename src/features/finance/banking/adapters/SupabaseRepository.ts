/**
 * Supabase Banking Repository Adapter
 *
 * Implements the IBankingRepository ports using Supabase as the storage backend.
 * This is a SECONDARY adapter - it's driven by the core, not driving the core.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  IBankingRepository,
  IConnectionRepository,
  IAccountRepository,
  ITransactionRepository,
} from '../ports';
import type {
  BankConnection,
  BankAccount,
  BankTransaction,
  CreateConnectionParams,
  CreateAccountParams,
  CreateTransactionParams,
  ConnectionStatus,
  ProviderType,
  AccountType,
  TransactionStatus,
  CreditDebit,
} from '../types';

// ============================================================================
// TYPE MAPPERS (Database <-> Domain)
// ============================================================================

function mapDbToConnection(row: any): BankConnection {
  return {
    id: row.id,
    associationId: row.association_id,
    provider: row.provider as ProviderType,
    providerConnectionId: row.external_id,
    status: row.status as ConnectionStatus,
    bankName: row.metadata?.bank_name || 'Unknown Bank',
    bankId: row.metadata?.bank_id || '',
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
    metadata: row.metadata || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapDbToAccount(row: any): BankAccount {
  return {
    id: row.id,
    associationId: row.association_id,
    connectionId: row.connection_id,
    externalAccountUid: row.external_account_uid,
    name: row.name,
    iban: row.iban,
    bic: row.bic,
    accountType: (row.account_type as AccountType) || 'CHECKING',
    currency: row.currency || 'EUR',
    balance: row.balance,
    balanceDate: row.balance_date ? new Date(row.balance_date) : null,
    isActive: row.is_active ?? true,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapDbToTransaction(row: any): BankTransaction {
  return {
    id: row.id,
    bankAccountId: row.bank_account_id,
    externalReference: row.external_reference,
    bookingDate: new Date(row.booking_date),
    valueDate: row.value_date ? new Date(row.value_date) : null,
    amount: parseFloat(row.amount),
    currency: row.currency || 'EUR',
    creditDebit: row.credit_debit as CreditDebit,
    counterpartyName: row.counterparty_name,
    counterpartyIban: row.counterparty_iban,
    description: row.description,
    status: (row.status as TransactionStatus) || 'BOOK',
    category: row.category,
    linkedEntityType: row.linked_entity_type,
    linkedEntityId: row.linked_entity_id,
    rawData: row.raw_data || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================================================
// CONNECTION REPOSITORY
// ============================================================================

class SupabaseConnectionRepository implements IConnectionRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(params: CreateConnectionParams): Promise<BankConnection> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .insert({
        association_id: params.associationId,
        provider: params.provider,
        external_id: params.providerConnectionId,
        status: 'active',
        expires_at: params.expiresAt?.toISOString(),
        metadata: {
          ...params.metadata,
          bank_name: params.bankName,
          bank_id: params.bankId,
        },
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create connection: ${error.message}`);
    return mapDbToConnection(data);
  }

  async findById(id: string): Promise<BankConnection | null> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Failed to find connection: ${error.message}`);
    return data ? mapDbToConnection(data) : null;
  }

  async findByProviderConnectionId(
    provider: ProviderType,
    providerConnectionId: string
  ): Promise<BankConnection | null> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .select('*')
      .eq('provider', provider)
      .eq('external_id', providerConnectionId)
      .maybeSingle();

    if (error) throw new Error(`Failed to find connection: ${error.message}`);
    return data ? mapDbToConnection(data) : null;
  }

  async findByAssociationId(
    associationId: string,
    status?: ConnectionStatus
  ): Promise<BankConnection[]> {
    let query = this.supabase
      .from('bank_connections')
      .select('*')
      .eq('association_id', associationId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error)
      throw new Error(`Failed to find connections: ${error.message}`);
    return (data || []).map(mapDbToConnection);
  }

  async updateStatus(
    id: string,
    status: ConnectionStatus
  ): Promise<BankConnection> {
    const { data, error } = await this.supabase
      .from('bank_connections')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update connection: ${error.message}`);
    return mapDbToConnection(data);
  }

  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>
  ): Promise<BankConnection> {
    // First get existing metadata
    const existing = await this.findById(id);
    if (!existing) throw new Error('Connection not found');

    const { data, error } = await this.supabase
      .from('bank_connections')
      .update({
        metadata: { ...existing.metadata, ...metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update connection: ${error.message}`);
    return mapDbToConnection(data);
  }

  async delete(id: string): Promise<void> {
    // First delete related accounts (which cascades to transactions)
    const { error: accError } = await this.supabase
      .from('bank_accounts')
      .delete()
      .eq('connection_id', id);

    if (accError)
      throw new Error(`Failed to delete accounts: ${accError.message}`);

    const { error } = await this.supabase
      .from('bank_connections')
      .delete()
      .eq('id', id);

    if (error)
      throw new Error(`Failed to delete connection: ${error.message}`);
  }
}

// ============================================================================
// ACCOUNT REPOSITORY
// ============================================================================

class SupabaseAccountRepository implements IAccountRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(params: CreateAccountParams): Promise<BankAccount> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .insert({
        association_id: params.associationId,
        connection_id: params.connectionId,
        external_account_uid: params.externalAccountUid,
        name: params.name,
        iban: params.iban,
        bic: params.bic,
        account_type: params.accountType || 'CHECKING',
        currency: params.currency || 'EUR',
        balance: params.balance,
        balance_date: params.balanceDate?.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create account: ${error.message}`);
    return mapDbToAccount(data);
  }

  async upsert(params: CreateAccountParams): Promise<BankAccount> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .upsert(
        {
          association_id: params.associationId,
          connection_id: params.connectionId,
          external_account_uid: params.externalAccountUid,
          name: params.name,
          iban: params.iban,
          bic: params.bic,
          account_type: params.accountType || 'CHECKING',
          currency: params.currency || 'EUR',
          balance: params.balance,
          balance_date: params.balanceDate?.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'association_id,external_account_uid',
        }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert account: ${error.message}`);
    return mapDbToAccount(data);
  }

  async findById(id: string): Promise<BankAccount | null> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Failed to find account: ${error.message}`);
    return data ? mapDbToAccount(data) : null;
  }

  async findByExternalUid(
    associationId: string,
    externalAccountUid: string
  ): Promise<BankAccount | null> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .select('*')
      .eq('association_id', associationId)
      .eq('external_account_uid', externalAccountUid)
      .maybeSingle();

    if (error) throw new Error(`Failed to find account: ${error.message}`);
    return data ? mapDbToAccount(data) : null;
  }

  async findByConnectionId(connectionId: string): Promise<BankAccount[]> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .select('*')
      .eq('connection_id', connectionId)
      .order('name');

    if (error) throw new Error(`Failed to find accounts: ${error.message}`);
    return (data || []).map(mapDbToAccount);
  }

  async findByAssociationId(associationId: string): Promise<BankAccount[]> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .select('*')
      .eq('association_id', associationId)
      .eq('is_active', true)
      .order('name');

    if (error) throw new Error(`Failed to find accounts: ${error.message}`);
    return (data || []).map(mapDbToAccount);
  }

  async updateLastSyncedAt(id: string, date: Date): Promise<BankAccount> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .update({
        last_synced_at: date.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update account: ${error.message}`);
    return mapDbToAccount(data);
  }

  async updateBalance(
    id: string,
    balance: number,
    balanceDate: Date
  ): Promise<BankAccount> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .update({
        balance,
        balance_date: balanceDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update account: ${error.message}`);
    return mapDbToAccount(data);
  }

  async deactivate(id: string): Promise<BankAccount> {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to deactivate account: ${error.message}`);
    return mapDbToAccount(data);
  }
}

// ============================================================================
// TRANSACTION REPOSITORY
// ============================================================================

class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(params: CreateTransactionParams): Promise<BankTransaction> {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .insert({
        bank_account_id: params.bankAccountId,
        external_reference: params.externalReference,
        booking_date: params.bookingDate.toISOString().split('T')[0],
        value_date: params.valueDate?.toISOString().split('T')[0],
        amount: params.amount,
        currency: params.currency || 'EUR',
        credit_debit: params.creditDebit,
        counterparty_name: params.counterpartyName,
        counterparty_iban: params.counterpartyIban,
        description: params.description,
        status: params.status || 'BOOK',
        raw_data: params.rawData || {},
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to create transaction: ${error.message}`);
    return mapDbToTransaction(data);
  }

  async bulkUpsert(
    params: CreateTransactionParams[]
  ): Promise<{ added: number; updated: number; skipped: number }> {
    if (params.length === 0) {
      return { added: 0, updated: 0, skipped: 0 };
    }

    const rows = params.map((p) => ({
      bank_account_id: p.bankAccountId,
      external_reference: p.externalReference,
      booking_date: p.bookingDate.toISOString().split('T')[0],
      value_date: p.valueDate?.toISOString().split('T')[0],
      amount: p.amount,
      currency: p.currency || 'EUR',
      credit_debit: p.creditDebit,
      counterparty_name: p.counterpartyName,
      counterparty_iban: p.counterpartyIban,
      description: p.description,
      status: p.status || 'BOOK',
      raw_data: p.rawData || {},
      updated_at: new Date().toISOString(),
    }));

    // Use upsert with conflict on (bank_account_id, external_reference)
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .upsert(rows, {
        onConflict: 'bank_account_id,external_reference',
        ignoreDuplicates: false,
      })
      .select();

    if (error)
      throw new Error(`Failed to bulk upsert transactions: ${error.message}`);

    // Supabase doesn't tell us added vs updated, so we estimate
    // In practice, most will be skipped (duplicates)
    return {
      added: data?.length || 0,
      updated: 0,
      skipped: params.length - (data?.length || 0),
    };
  }

  async findById(id: string): Promise<BankTransaction | null> {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Failed to find transaction: ${error.message}`);
    return data ? mapDbToTransaction(data) : null;
  }

  async findByExternalReference(
    bankAccountId: string,
    externalReference: string
  ): Promise<BankTransaction | null> {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .eq('external_reference', externalReference)
      .maybeSingle();

    if (error) throw new Error(`Failed to find transaction: ${error.message}`);
    return data ? mapDbToTransaction(data) : null;
  }

  async findByAccountId(
    bankAccountId: string,
    options: {
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<BankTransaction[]> {
    let query = this.supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankAccountId);

    if (options.dateFrom) {
      query = query.gte(
        'booking_date',
        options.dateFrom.toISOString().split('T')[0]
      );
    }
    if (options.dateTo) {
      query = query.lte(
        'booking_date',
        options.dateTo.toISOString().split('T')[0]
      );
    }

    query = query.order('booking_date', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error)
      throw new Error(`Failed to find transactions: ${error.message}`);
    return (data || []).map(mapDbToTransaction);
  }

  async findUnlinked(
    bankAccountId: string,
    creditDebit?: 'CRDT' | 'DBIT'
  ): Promise<BankTransaction[]> {
    let query = this.supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .is('linked_entity_id', null);

    if (creditDebit) {
      query = query.eq('credit_debit', creditDebit);
    }

    const { data, error } = await query.order('booking_date', {
      ascending: false,
    });

    if (error)
      throw new Error(`Failed to find transactions: ${error.message}`);
    return (data || []).map(mapDbToTransaction);
  }

  async linkToEntity(
    id: string,
    entityType: 'member' | 'supplier' | 'assignment',
    entityId: string
  ): Promise<BankTransaction> {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .update({
        linked_entity_type: entityType,
        linked_entity_id: entityId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to link transaction: ${error.message}`);
    return mapDbToTransaction(data);
  }

  async unlink(id: string): Promise<BankTransaction> {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .update({
        linked_entity_type: null,
        linked_entity_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to unlink transaction: ${error.message}`);
    return mapDbToTransaction(data);
  }

  async categorize(id: string, category: string): Promise<BankTransaction> {
    const { data, error } = await this.supabase
      .from('bank_transactions')
      .update({
        category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to categorize transaction: ${error.message}`);
    return mapDbToTransaction(data);
  }

  async autoCategorize(
    bankAccountId: string,
    rules: Array<{
      pattern: RegExp | string;
      field: 'description' | 'counterpartyName' | 'counterpartyIban';
      category: string;
    }>
  ): Promise<number> {
    // Get uncategorized transactions
    const { data: transactions, error } = await this.supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .is('category', null);

    if (error || !transactions) return 0;

    let categorized = 0;

    for (const tx of transactions) {
      for (const rule of rules) {
        const fieldMap: Record<string, string> = {
          description: 'description',
          counterpartyName: 'counterparty_name',
          counterpartyIban: 'counterparty_iban',
        };
        const value = tx[fieldMap[rule.field]];

        if (!value) continue;

        const pattern =
          typeof rule.pattern === 'string'
            ? new RegExp(rule.pattern, 'i')
            : rule.pattern;

        if (pattern.test(value)) {
          await this.supabase
            .from('bank_transactions')
            .update({ category: rule.category })
            .eq('id', tx.id);
          categorized++;
          break; // First matching rule wins
        }
      }
    }

    return categorized;
  }
}

// ============================================================================
// COMBINED REPOSITORY
// ============================================================================

export class SupabaseBankingRepository implements IBankingRepository {
  public readonly connections: IConnectionRepository;
  public readonly accounts: IAccountRepository;
  public readonly transactions: ITransactionRepository;

  constructor(supabase: SupabaseClient) {
    this.connections = new SupabaseConnectionRepository(supabase);
    this.accounts = new SupabaseAccountRepository(supabase);
    this.transactions = new SupabaseTransactionRepository(supabase);
  }
}

/**
 * Factory function
 */
export function createSupabaseRepository(
  supabase: SupabaseClient
): IBankingRepository {
  return new SupabaseBankingRepository(supabase);
}
