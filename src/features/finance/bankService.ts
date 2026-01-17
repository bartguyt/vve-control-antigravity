import { supabase } from '../../lib/supabase';
// import type { BankTransaction } from '../../types/database';
import { associationService } from '../../lib/association';
import { bookkeepingService } from './bookkeepingService';

// Mock specific logic
export const MOCK_REQUISITION_ID = 'mock-req-id-' + Math.random().toString(36).substring(7);

export const bankService = {
    // 1. Mock Authentication
    async authenticate() {
        return 'mock-access-token';
    },

    async getAccessToken() {
        return 'mock-access-token';
    },

    // 2. Mock Requisition (Link Request)
    async createRequisition(_institutionId: string = 'MOCK_BANK') {
        // Return a local redirect that simulates coming back from the bank
        const redirect = `${window.location.origin}/settings?callback=mock&ref=${MOCK_REQUISITION_ID}`;

        return {
            id: MOCK_REQUISITION_ID,
            link: redirect // The frontend will "redirect" here
        };
    },

    // 3. Link & Generate Data (The "Magic" Step)
    async saveConnection(requisitionId: string, status: string = 'LINKED') {
        const associationId = await associationService.getCurrentAssociationId();

        // A. Create Connection
        const { data: connection, error: connError } = await supabase
            .from('bank_connections')
            .insert({
                association_id: associationId,
                requisition_id: requisitionId,
                status: status,
                provider_name: 'Mock Bank (Demo)'
            })
            .select()
            .single();

        if (connError) throw connError;

        // B. Generate Mock Accounts (Random 1-4 accounts)
        const numAccounts = Math.floor(Math.random() * 4) + 1; // 1 to 4
        const mockAccounts = [];

        for (let i = 0; i < numAccounts; i++) {
            const isSavings = i > 0 && Math.random() > 0.5; // First is always payment, others 50/50
            const type = isSavings ? 'SAVINGS' : 'PAYMENT';
            const name = isSavings ? 'Spaarrekening' : 'Betaalrekening';

            mockAccounts.push({
                connection_id: connection.id,
                association_id: associationId,
                external_id: `mock-acc-${i}-${Date.now()}`,
                iban: `NL${Math.floor(Math.random() * 90) + 10}MOCK${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
                name: name,
                currency: 'EUR',
                balance_amount: isSavings ? 25000 + Math.random() * 50000 : 1000 + Math.random() * 5000,
                account_type: type
            });
        }

        const { data: accounts, error: accError } = await supabase
            .from('bank_accounts')
            .insert(mockAccounts)
            .select();

        if (accError) throw accError;

        // C. Generate Mock Transactions for PAYMENT accounts
        const paymentAccounts = accounts.filter(a => a.account_type === 'PAYMENT');

        for (const account of paymentAccounts) {
            const mockTransactions = [
                {
                    account_id: account.id,
                    association_id: associationId,
                    external_id: `tx-1-${account.id}`,
                    booking_date: new Date().toISOString().split('T')[0],
                    amount: -1250.00,
                    description: 'Schoonmaakkosten Q1',
                    creditor_name: 'Schoonmaakbedrijf "De Bezem"',
                    transaction_type: 'CREDIT_TRANSFER'
                },
                {
                    account_id: account.id,
                    association_id: associationId,
                    external_id: `tx-2-${account.id}`,
                    booking_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
                    amount: 150.00,
                    description: 'Association Bijdrage Maart - App. 4A',
                    debtor_name: 'J. Jansen',
                    transaction_type: 'CREDIT_TRANSFER'
                }
            ];
            await supabase.from('bank_transactions').insert(mockTransactions);
        }
    },

    // 3b. Update Account Type
    async updateAccountType(accountId: string, type: 'PAYMENT' | 'SAVINGS') {
        const { error } = await supabase
            .from('bank_accounts')
            .update({
                account_type: type,
                // Update name too for clarity/demo effect? Maybe not force it, but helpful.
                name: type === 'SAVINGS' ? 'Spaarrekening' : 'Betaalrekening'
            })
            .eq('id', accountId);

        if (error) throw error;
    },

    // 4. List Accounts (Fetch from DB)
    async getAccounts() {
        const associationId = await associationService.getCurrentAssociationId();

        const { data } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('association_id', associationId);

        return data || [];
    },

    // 5. Get Transactions (Fetch from DB)
    async getTransactions(accountId: string) {
        const { data } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('account_id', accountId)
            .order('booking_date', { ascending: false });

        return data || [];
    },

    async autoCategorizeAccountTransactions(accountId: string) {
        // Find transactions for this account that are linked but uncategorized
        const { data, error } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('account_id', accountId)
            .is('category', null)
            .not('linked_member_id', 'is', null);

        if (error) throw error;

        let count = 0;
        if (data && data.length > 0) {
            const associationId = data[0].association_id;
            // Find 'Ledenbijdrage' category
            const { data: cat } = await supabase
                .from('financial_categories')
                .select('id')
                .eq('association_id', associationId)
                .ilike('name', 'Ledenbijdrage')
                .single();

            if (cat) {
                for (const tx of data) {
                    const desc = (tx.description || '').toLowerCase();
                    const remittance = (tx.remittance_information || '').toLowerCase();
                    if (desc.includes('bijdrage') || remittance.includes('bijdrage')) {
                        await this.updateTransactionCategory(tx.id, null, null, cat.id);
                        count++;
                    }
                }
            }
        }
        return count;
    },

    // 6. Delete Connection
    async deleteConnection(connectionId?: string) {
        // If no specific connection ID, find the latest relevant one or handles UI logic
        // But better to pass ID.
        if (!connectionId) return;

        const { error } = await supabase
            .from('bank_connections')
            .delete()
            .eq('id', connectionId);

        if (error) throw error;
    },

    // 7. Link Transaction to Member
    async linkTransaction(transactionId: string, memberId: string) {
        const { data, error } = await supabase
            .from('bank_transactions')
            .update({ linked_member_id: memberId })
            .eq('id', transactionId)
            .select()
            .single();

        if (error) throw error;

        // Auto-categorize if description contains 'bijdrage'
        if (data && !data.financial_category_id) {
            const desc = (data.description || '').toLowerCase();
            const remittance = (data.remittance_information || '').toLowerCase();
            if (desc.includes('bijdrage') || remittance.includes('bijdrage')) {
                // Find 'Ledenbijdrage' category
                const { data: cat } = await supabase
                    .from('financial_categories')
                    .select('id')
                    .eq('association_id', data.association_id)
                    .ilike('name', 'Ledenbijdrage') // Case insensitive match
                    .single();

                if (cat) {
                    await this.updateTransactionCategory(transactionId, null, null, cat.id);
                }
            }
        }
    },

    async updateTransactionCategory(
        transactionId: string,
        categoryId: string | null, // OLD STRING CATEGORY
        contributionYearId: string | null = null,
        financialCategoryId: string | null = null,
        linkedAssignmentId: string | null = null,
        linkedDocumentId: string | null = null,
        linkedSupplierId: string | null = null
    ) {
        const updates: any = {
            contribution_year_id: contributionYearId
        };

        if (financialCategoryId) updates.financial_category_id = financialCategoryId;
        if (linkedAssignmentId) updates.linked_assignment_id = linkedAssignmentId;
        if (linkedDocumentId) updates.linked_document_id = linkedDocumentId;
        if (linkedSupplierId) updates.linked_supplier_id = linkedSupplierId;

        if (categoryId) updates.category = categoryId;

        const { error } = await supabase
            .from('bank_transactions')
            .update(updates)
            .eq('id', transactionId);

        if (error) throw error;

        // Auto-Book to Journal if a financial category is set
        if (financialCategoryId) {
            await bookkeepingService.createEntryFromTransaction(transactionId, financialCategoryId);
        }
    },

    // 7b. Bulk Link by IBAN
    async linkTransactionsByIban(iban: string, associationId: string, memberId: string) {
        const { data, error } = await supabase
            .from('bank_transactions')
            .update({ linked_member_id: memberId })
            .eq('counterparty_iban', iban)
            .eq('association_id', associationId)
            .select();

        if (error) throw error;

        // Auto-categorize matched transactions
        if (data && data.length > 0) {
            // Find 'Ledenbijdrage' category
            const { data: cat } = await supabase
                .from('financial_categories')
                .select('id')
                .eq('association_id', associationId)
                .ilike('name', 'Ledenbijdrage')
                .single();

            if (cat) {
                for (const tx of data) {
                    if (!tx.financial_category_id) {
                        const desc = (tx.description || '').toLowerCase();
                        const remittance = (tx.remittance_information || '').toLowerCase();
                        if (desc.includes('bijdrage') || remittance.includes('bijdrage')) {
                            await this.updateTransactionCategory(tx.id, null, null, cat.id);
                        }
                    }
                }
            }
        }
    },

    // 8. Get Member Transactions
    async getMemberTransactions(memberId: string) {
        const { data, error } = await supabase
            .from('bank_transactions')
            .select(`
                *,
                bank_accounts (
                    id,
                    name,
                    iban,
                    account_type
                )
             `)
            .eq('linked_member_id', memberId)
            .order('booking_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // 9. Delete All Transactions for Account
    async deleteAccountTransactions(accountId: string) {
        const { error } = await supabase
            .from('bank_transactions')
            .delete()
            .eq('account_id', accountId);

        if (error) throw error;
    }
};
