/**
 * Finance Facade
 * Aggregates multiple finance-related services into a single interface
 * Provides feature-aware data loading (only loads data for enabled features)
 * Part of Fase 2: Decoupling Pages from Services
 */

import { bankService } from './bankService';
import { contributionService } from './contributionService';
import { bookkeepingService } from './bookkeepingService';
import { memberService } from '../members/memberService';
import type { BankTransaction, Profile, ContributionYear, FinancialCategory } from '../../types/database';

/**
 * Enriched bank transaction with member and category information
 */
export interface EnrichedBankTransaction extends BankTransaction {
  memberName?: string;
  categoryName?: string;
}

/**
 * Bank account data with all related information
 */
export interface BankAccountData {
  account: any; // Account type from bankService
  transactions: EnrichedBankTransaction[];
  balance: number;
  currency: string;
}

/**
 * Finance overview data
 */
export interface FinanceOverviewData {
  bankAccounts: any[];
  totalBalance: number;
  recentTransactions: EnrichedBankTransaction[];
  contributionSummary?: {
    totalDue: number;
    totalPaid: number;
    pendingCount: number;
  };
}

/**
 * Finance Facade
 * Single entry point for all finance-related data operations
 */
export class FinanceFacade {
  /**
   * Get complete bank account data with enriched transactions
   * Only loads member/contribution data if those features are enabled
   */
  async getBankAccountData(
    accountId: string,
    options?: {
      includeMemberNames?: boolean;
      includeCategoryNames?: boolean;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<BankAccountData> {
    // Load base account and transactions
    const [account, transactions] = await Promise.all([
      bankService.getAccount(accountId),
      bankService.getTransactions(accountId)
    ]);

    if (!account) {
      throw new Error(`Bank account ${accountId} not found`);
    }

    // Enrich transactions with member and category data if requested
    const enrichedTransactions = await this.enrichTransactions(
      transactions,
      options?.includeMemberNames ?? true,
      options?.includeCategoryNames ?? true
    );

    return {
      account,
      transactions: enrichedTransactions,
      balance: account.balance || 0,
      currency: account.currency || 'EUR'
    };
  }

  /**
   * Get finance overview for dashboard
   */
  async getFinanceOverview(associationId: string): Promise<FinanceOverviewData> {
    // Load bank accounts
    const bankAccounts = await bankService.getAccounts(associationId);

    // Calculate total balance
    const totalBalance = bankAccounts.reduce(
      (sum, account) => sum + (account.balance || 0),
      0
    );

    // Get recent transactions from all accounts
    const transactionPromises = bankAccounts.slice(0, 3).map(account =>
      bankService.getTransactions(account.id)
    );

    const transactionArrays = await Promise.all(transactionPromises);
    const allTransactions = transactionArrays.flat();

    // Sort by date and take most recent
    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
      .slice(0, 10);

    // Enrich recent transactions
    const enrichedTransactions = await this.enrichTransactions(
      recentTransactions,
      true,
      true
    );

    // Optionally load contribution summary (only if contributions feature enabled)
    let contributionSummary;
    try {
      const years = await contributionService.getYears(associationId);
      if (years.length > 0) {
        const currentYear = years[0];
        const contributions = await contributionService.getContributionsForYear(currentYear.id);

        contributionSummary = {
          totalDue: contributions.reduce((sum, c) => sum + (c.amount_due || 0), 0),
          totalPaid: contributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0),
          pendingCount: contributions.filter(c => c.status === 'PENDING').length
        };
      }
    } catch (error) {
      // Contribution data optional, don't fail if unavailable
      console.warn('Could not load contribution summary:', error);
    }

    return {
      bankAccounts,
      totalBalance,
      recentTransactions: enrichedTransactions,
      contributionSummary
    };
  }

  /**
   * Get financial categories for transaction categorization
   */
  async getFinancialCategories(): Promise<FinancialCategory[]> {
    try {
      return await bookkeepingService.getCategories();
    } catch (error) {
      console.error('Failed to load financial categories:', error);
      return [];
    }
  }

  /**
   * Get contribution years for an association
   */
  async getContributionYears(associationId: string): Promise<ContributionYear[]> {
    try {
      return await contributionService.getYears(associationId);
    } catch (error) {
      console.error('Failed to load contribution years:', error);
      return [];
    }
  }

  /**
   * Enrich transactions with member names and category names
   * @private
   */
  private async enrichTransactions(
    transactions: BankTransaction[],
    includeMemberNames: boolean,
    includeCategoryNames: boolean
  ): Promise<EnrichedBankTransaction[]> {
    if (transactions.length === 0) {
      return [];
    }

    // Load member names if requested
    let memberMap = new Map<string, string>();
    if (includeMemberNames) {
      try {
        // Get unique member IDs from transactions
        const memberIds = transactions
          .map(tx => tx.linked_entity_type === 'member' ? tx.linked_entity_id : null)
          .filter((id): id is string => id !== null);

        const uniqueMemberIds = [...new Set(memberIds)];

        if (uniqueMemberIds.length > 0) {
          const members = await memberService.getMembersByIds(uniqueMemberIds);
          members.forEach(member => {
            const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
            memberMap.set(member.id, fullName || 'Onbekend');
          });
        }
      } catch (error) {
        console.warn('Could not load member names:', error);
      }
    }

    // Load category names if requested
    let categoryMap = new Map<string, string>();
    if (includeCategoryNames) {
      try {
        const categories = await this.getFinancialCategories();
        categories.forEach(cat => {
          categoryMap.set(cat.id, cat.name);
        });
      } catch (error) {
        console.warn('Could not load category names:', error);
      }
    }

    // Enrich transactions
    return transactions.map(tx => ({
      ...tx,
      memberName: tx.linked_entity_type === 'member' && tx.linked_entity_id
        ? memberMap.get(tx.linked_entity_id)
        : undefined,
      categoryName: tx.category
        ? categoryMap.get(tx.category)
        : undefined
    }));
  }

  /**
   * Sync bank account transactions
   */
  async syncAccount(accountId: string): Promise<{ count: number }> {
    return await bankService.syncAccount(accountId);
  }

  /**
   * Link transaction to an entity (member, supplier, assignment)
   */
  async linkTransaction(
    transactionId: string,
    entityType: 'member' | 'supplier' | 'assignment',
    entityId: string
  ): Promise<void> {
    await bankService.linkTransaction(transactionId, entityType, entityId);
  }

  /**
   * Categorize a transaction
   */
  async categorizeTransaction(
    transactionId: string,
    categoryId: string
  ): Promise<void> {
    await bankService.categorizeTransaction(transactionId, categoryId);
  }
}

/**
 * Singleton instance
 */
export const financeFacade = new FinanceFacade();
