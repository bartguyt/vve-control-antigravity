import { supabase } from '../../lib/supabase';
import type { LedgerAccount, FinancialCategory } from '../../types/database';
import { associationService } from '../../lib/association';

export const bookkeepingService = {
    // --- Ledger Accounts ---
    async getLedgerAccounts(): Promise<LedgerAccount[]> {
        const associationId = await associationService.getCurrentAssociationId();
        const { data, error } = await supabase
            .from('ledger_accounts')
            .select('*')
            .eq('association_id', associationId)
            .order('code');

        if (error) throw error;
        return data || [];
    },

    // --- Financial Categories ---
    async getCategories(): Promise<FinancialCategory[]> {
        const associationId = await associationService.getCurrentAssociationId();
        // Join with ledger_account to get code/name if needed
        const { data, error } = await supabase
            .from('financial_categories')
            .select('*, ledger_account:ledger_accounts(*)')
            .eq('association_id', associationId)
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async createCategory(category: Partial<FinancialCategory>): Promise<FinancialCategory> {
        let association_id = category.association_id;
        if (!association_id) {
            association_id = await associationService.getCurrentAssociationId();
        }

        const { data, error } = await supabase
            .from('financial_categories')
            .insert({ ...category, association_id })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCategory(id: string, updates: Partial<FinancialCategory>): Promise<FinancialCategory> {
        const { data, error } = await supabase
            .from('financial_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCategory(id: string): Promise<void> {
        const { error } = await supabase
            .from('financial_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createLedgerAccount(account: Partial<LedgerAccount>): Promise<LedgerAccount> {
        let association_id = account.association_id;
        if (!association_id) {
            association_id = await associationService.getCurrentAssociationId();
        }

        const { data, error } = await supabase
            .from('ledger_accounts')
            .insert({ ...account, association_id })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateLedgerAccount(id: string, updates: Partial<LedgerAccount>): Promise<LedgerAccount> {
        const { data, error } = await supabase
            .from('ledger_accounts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteLedgerAccount(id: string): Promise<void> {
        const { error } = await supabase
            .from('ledger_accounts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Journal Entries ---
    async createEntryFromTransaction(transactionId: string, categoryId: string): Promise<void> {
        // 1. Fetch transaction details and category details
        const { data: tx, error: txError } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (txError || !tx) throw new Error('Transaction not found');

        const { data: cat, error: catError } = await supabase
            .from('financial_categories')
            .select('*, ledger_account:ledger_accounts(*)')
            .eq('id', categoryId)
            .single();

        if (catError || !cat) throw new Error('Category not found');

        // 2. Identify the Bank Ledger Account (1150 or 1151)
        // Ideally we map the bank account to a ledger account.
        // For now, let's look for "1150" (Betaalrekening) as default if not specified.
        // Or check account type. default: 1150 for PAYMENT, 1151 for SAVINGS.


        // ... lines omitted

        // Helper to get ledger account ID by code (cached or fetched)
        // const getLedgerId = async (code: number, type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE', name: string) => { ... } 
        // Simplified for this logic:

        // 1. Bank Account (Assets)
        // let bankLedgerCode = 1150;

        // We need to fetch the account to know its type, or infer from current data if joined.
        // Let's assume 1150 for simplicity or fetch proper mapping later.
        // Better: Find the ledger account named 'ING betaalrekening' or code 1150 within this VvE.
        const { data: bankLedger } = await supabase
            .from('ledger_accounts')
            .select('id')
            .eq('association_id', tx.association_id)
            .eq('code', 1150) // Assuming standard code
            .single();

        if (!bankLedger) throw new Error('Bank ledger account not found (1150)');

        // 3. Determine Debit/Credit
        // Incoming (Amount > 0): Debit Bank, Credit Revenue/Category
        // Outgoing (Amount < 0): Credit Bank, Debit Expense/Category

        const amount = Math.abs(tx.amount);
        const isIncoming = tx.amount > 0;

        let debitAccount = '';
        let creditAccount = '';

        if (isIncoming) {
            debitAccount = bankLedger.id;          // Bank increases (Asset Debit)
            creditAccount = cat.ledger_account_id; // Revenue increases (Revenue Credit)
        } else {
            debitAccount = cat.ledger_account_id;  // Expense increases (Expense Debit)
            creditAccount = bankLedger.id;         // Bank decreases (Asset Credit)
        }

        // 4. Create Journal Entry
        // Check if an entry already exists for this transaction ??
        // For now, let's assume we create one. TODO: Handle updates (delete old one?) of categorization.

        // Remove existing entry for this transaction to avoid duplicates
        await supabase.from('journal_entries').delete().eq('transaction_id', transactionId);

        const { data: entry, error: entryError } = await supabase
            .from('journal_entries')
            .insert({
                association_id: tx.association_id,
                transaction_id: transactionId,
                booking_date: tx.booking_date,
                description: `${cat.name}: ${tx.description}`,
                status: 'POSTED'
            })
            .select()
            .single();

        if (entryError) throw entryError;

        // 5. Create Lines
        const lines = [
            {
                journal_entry_id: entry.id,
                ledger_account_id: debitAccount,
                debit: amount,
                credit: 0
            },
            {
                journal_entry_id: entry.id,
                ledger_account_id: creditAccount,
                debit: 0,
                credit: amount
            }
        ];

        const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(lines);

        if (linesError) throw linesError;
    },
    // --- Reports ---
    async getBalanceSheet(atDate: Date): Promise<{ ledger_account_id: string, code: number, name: string, type: string, balance: number }[]> {
        const associationId = await associationService.getCurrentAssociationId();
        const { data, error } = await supabase
            .rpc('get_balance_sheet', {
                target_association_id: associationId,
                at_date: atDate.toISOString().split('T')[0]
            });

        if (error) throw error;
        return data || [];
    },

    async getProfitLoss(startDate: Date, endDate: Date): Promise<{ ledger_account_id: string, code: number, name: string, type: string, amount: number }[]> {
        const associationId = await associationService.getCurrentAssociationId();
        const { data, error } = await supabase
            .rpc('get_profit_loss', {
                target_association_id: associationId,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });

        if (error) throw error;
        return data || [];
    }
};
