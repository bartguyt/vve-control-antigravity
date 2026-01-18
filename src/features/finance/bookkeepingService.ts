import { supabase } from '../../lib/supabase';
import { associationService } from '../../lib/association';
import type { LedgerAccount, JournalEntry, JournalLine, LedgerAccountType } from '../../types/database';

export const bookkeepingService = {
    // --- LEDGER ACCOUNTS ---

    async getLedgerAccounts(associationId?: string): Promise<LedgerAccount[]> {
        const id = associationId || await associationService.getCurrentAssociationId();
        if (!id) throw new Error('No association selected');

        const { data, error } = await supabase
            .from('ledger_accounts')
            .select('*')
            .eq('association_id', id)
            .order('code', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async createLedgerAccount(account: Partial<LedgerAccount>) {
        const association_id = await associationService.getCurrentAssociationId();
        if (!association_id) throw new Error('No association selected');

        const { data, error } = await supabase
            .from('ledger_accounts')
            .insert({ ...account, association_id })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async seedDefaultLedger() {
        const id = await associationService.getCurrentAssociationId();
        if (!id) throw new Error('No association selected');

        const { error } = await supabase.rpc('seed_default_ledger', { p_association_id: id });
        if (error) throw error;
    },

    // --- JOURNAL ENTRIES ---

    async getJournalEntries() {
        const id = await associationService.getCurrentAssociationId();
        if (!id) throw new Error('No association selected');

        // Fetch entries with lines
        const { data, error } = await supabase
            .from('journal_entries')
            .select(`
                *,
                journal_lines (
                    *,
                    ledger_accounts (code, name)
                )
            `)
            .eq('association_id', id)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async createJournalEntry(entry: Partial<JournalEntry>, lines: Partial<JournalLine>[]) {
        const association_id = await associationService.getCurrentAssociationId();
        if (!association_id) throw new Error('No association selected');

        // 1. Create Header
        const { data: header, error: headerError } = await supabase
            .from('journal_entries')
            .insert({
                association_id,
                date: entry.date,
                description: entry.description,
                reference: entry.reference,
                status: 'DRAFT'
            })
            .select()
            .single();

        if (headerError) throw headerError;
        if (!header) throw new Error('Failed to create header');

        // 2. Create Lines
        const formattedLines = lines.map(line => ({
            entry_id: header.id,
            account_id: line.account_id,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description
        }));

        const { error: linesError } = await supabase
            .from('journal_lines')
            .insert(formattedLines);

        if (linesError) {
            // Rollback header? Supabase generic client doesn't support transaction rollback easily
            // We rely on simple cleanup or user fixing it.
            // Ideally use RPC for atomic insert.
            console.error("Failed to insert lines", linesError);
            throw linesError;
        }

        return header;
    },

    async postEntry(entryId: string) {
        const { data, error } = await supabase.rpc('post_journal_entry', { p_entry_id: entryId });
        if (error) throw error;
        return data;
    },

    async deleteEntry(entryId: string) {
        const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', entryId); // Check status? RLS Policy should handle it or UI.

        if (error) throw error;
    },

    // --- UTILS / CATEGORIES (Legacy/Migration) ---
    async getCategories() {
        const { data, error } = await supabase
            .from('financial_categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
        return data || [];
    }
};
