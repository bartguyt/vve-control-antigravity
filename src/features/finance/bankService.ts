// src/features/finance/bankService.ts
import { supabase } from '../../lib/supabase';

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
    async createRequisition(institutionId: string = 'MOCK_BANK') {
        // Return a local redirect that simulates coming back from the bank
        const redirect = `${window.location.origin}/settings?callback=mock&ref=${MOCK_REQUISITION_ID}`;

        return {
            id: MOCK_REQUISITION_ID,
            link: redirect // The frontend will "redirect" here
        };
    },

    // 3. Link & Generate Data (The "Magic" Step)
    async saveConnection(requisitionId: string, status: string = 'LINKED') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('vve_id')
            .eq('user_id', user.id)
            .single();

        if (!profile) return;

        // A. Create Connection
        const { data: connection, error: connError } = await supabase
            .from('bank_connections')
            .insert({
                vve_id: profile.vve_id,
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
                vve_id: profile.vve_id,
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
                    vve_id: profile.vve_id,
                    external_id: `tx-1-${account.id}`,
                    booking_date: new Date().toISOString().split('T')[0],
                    amount: -1250.00,
                    description: 'Schoonmaakkosten Q1',
                    creditor_name: 'Schoonmaakbedrijf "De Bezem"',
                    transaction_type: 'CREDIT_TRANSFER'
                },
                {
                    account_id: account.id,
                    vve_id: profile.vve_id,
                    external_id: `tx-2-${account.id}`,
                    booking_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
                    amount: 150.00,
                    description: 'VvE Bijdrage Maart - App. 4A',
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Find the most recent active connection for this user's VvE
        // Simplified: just get accounts linked to user's VvE
        const { data: profile } = await supabase
            .from('profiles')
            .select('vve_id')
            .eq('user_id', user.id)
            .single();

        if (!profile) return [];

        const { data } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('vve_id', profile.vve_id);

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

        // Note: CASCADE delete on database tables (bank_accounts -> bank_connections) 
        // ensures accounts and transactions are also removed.
    }
};
