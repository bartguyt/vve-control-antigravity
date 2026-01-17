import { supabase } from '../../lib/supabase';
import type {
    ContributionYear,
    MemberContribution,
    ContributionGroup,
    ContributionYearAmount,
    MemberGroupAssignment
} from '../../types/database';
import { associationService } from '../../lib/association';

export const contributionService = {
    // --- Groups ---
    async updateGroup(id: string, name: string): Promise<void> {
        const { error } = await supabase
            .from('contribution_groups')
            .update({ name })
            .eq('id', id);
        if (error) throw error;
    },

    async getGroups(): Promise<ContributionGroup[]> {
        const { data, error } = await supabase
            .from('contribution_groups')
            .select('*')
            .order('name');
        if (error) throw error;
        return data || [];
    },

    async createGroup(name: string): Promise<ContributionGroup> {
        const associationId = await associationService.getCurrentAssociationId();

        const { data, error } = await supabase
            .from('contribution_groups')
            .insert({ association_id: associationId, name })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getAssignments(): Promise<MemberGroupAssignment[]> {
        const { data, error } = await supabase
            .from('member_group_assignments')
            .select('*, group:contribution_groups(*)');
        if (error) throw error;
        return data || [];
    },

    async assignMemberToGroup(memberId: string, groupId: string | null): Promise<void> {
        if (!groupId) {
            // Remove assignment
            const { error } = await supabase
                .from('member_group_assignments')
                .delete()
                .eq('member_id', memberId);
            if (error) throw error;
            return;
        }

        // Upsert assignment using the constraint/unique index if possible,
        // but since we might not have a clean upsert if ID is unknown, we can try insert/update.
        // Actually, member_id is unique. So we can upsert.
        // We do not have the ID though, but we can match on member_id.
        const { error } = await supabase
            .from('member_group_assignments')
            .upsert({ member_id: memberId, group_id: groupId }, { onConflict: 'member_id' });

        if (error) throw error;
    },

    // --- Years ---
    async getYears(): Promise<ContributionYear[]> {
        const { data, error } = await supabase
            .from('contribution_years')
            .select('*')
            .order('year', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getYearAmounts(yearId: string): Promise<ContributionYearAmount[]> {
        const { data, error } = await supabase
            .from('contribution_year_amounts')
            .select('*, group:contribution_groups(*)')
            .eq('year_id', yearId);
        if (error) throw error;
        return data || [];
    },

    async updateGroupAmount(yearId: string, groupId: string, amount: number): Promise<void> {
        const { error } = await supabase
            .from('contribution_year_amounts')
            .upsert(
                { year_id: yearId, group_id: groupId, amount },
                { onConflict: 'year_id,group_id' }
            );
        if (error) throw error;
    },

    async updateBaseAmount(yearId: string, amount: number, name?: string): Promise<void> {
        const updates: any = { default_amount: amount };
        if (name) updates.base_rate_name = name;

        const { error } = await supabase
            .from('contribution_years')
            .update(updates)
            .eq('id', yearId);

        if (error) throw error;
    },

    async createYear(year: number, defaultAmount: number, baseRateName: string, groupAmounts: Record<string, number>): Promise<ContributionYear> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user');

        const { data: profile } = await supabase
            .from('profiles')
            .select('association_id')
            .eq('id', user.id)
            .maybeSingle();

        let associationId = profile?.association_id;

        if (!associationId) {
            const { data: member } = await supabase
                .from('association_memberships')
                .select('association_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            if (member?.association_id) {
                associationId = member.association_id;
                await supabase.from('profiles').update({ association_id: associationId }).eq('id', user.id);
            }
        }

        if (!associationId) throw new Error('Geen Association gevonden voor uw account. Neem contact op met de beheerder.');

        // 1. Create Year
        const { data: newYear, error } = await supabase
            .from('contribution_years')
            .insert({
                association_id: associationId,
                year,
                default_amount: defaultAmount,
                base_rate_name: baseRateName,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Create Group Amounts
        const amountEntries = Object.entries(groupAmounts).map(([groupId, amount]) => ({
            year_id: newYear.id,
            group_id: groupId,
            amount
        }));

        if (amountEntries.length > 0) {
            const { error: amountError } = await supabase
                .from('contribution_year_amounts')
                .insert(amountEntries);

            if (amountError) console.error('Error saving group amounts', amountError);
        }

        return newYear;
    },

    // --- Contributions ---
    async getContributions(yearId: string): Promise<MemberContribution[]> {
        const { data, error } = await supabase
            .from('member_contributions')
            .select('*, member:profiles(*), group:contribution_groups(*)')
            .eq('year_id', yearId);

        if (error) throw error;
        return data || [];
    },

    async generateForYear(yearId: string): Promise<{ created: number }> {
        // 1. Get the year details
        const { data: yearData, error: yearError } = await supabase
            .from('contribution_years')
            .select('*')
            .eq('id', yearId)
            .single();

        if (yearError || !yearData) throw yearError || new Error('Year not found');

        // 1b. Get Group Amounts for this year
        const { data: amounts } = await supabase
            .from('contribution_year_amounts')
            .select('*')
            .eq('year_id', yearId);

        // Map groupId -> amount
        const amountMap = new Map<string, number>();
        amounts?.forEach(a => amountMap.set(a.group_id, a.amount));

        // 2. Get active members & their group assignments
        // NOTE: We fetch profiles and left join assignments
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select(`
                id, 
                association_id,
                member_group_assignments(group_id)
            `)
            .eq('association_id', yearData.association_id);

        if (profileError) throw profileError;
        if (!profiles?.length) return { created: 0 };

        // 3. Existing contributions
        const { data: existing } = await supabase
            .from('member_contributions')
            .select('member_id')
            .eq('year_id', yearId);

        const existingIds = new Set(existing?.map(e => e.member_id) || []);

        const toCreate: any[] = [];

        for (const p of profiles) {
            if (existingIds.has(p.id)) continue;

            const assignment = p.member_group_assignments?.[0]; // Assuming array from join
            const groupId = assignment?.group_id;

            let due = yearData.default_amount;
            if (groupId && amountMap.has(groupId)) {
                due = amountMap.get(groupId)!;
            }

            toCreate.push({
                association_id: yearData.association_id,
                year_id: yearId,
                member_id: p.id,
                group_id: groupId || null,
                amount_due: due,
                status: 'PENDING'
            });
        }

        if (toCreate.length === 0) return { created: 0 };

        const { error: insertError } = await supabase
            .from('member_contributions')
            .insert(toCreate);

        if (insertError) throw insertError;
        return { created: toCreate.length };
    },

    async updateContribution(id: string, updates: Partial<MemberContribution>): Promise<void> {
        const { error } = await supabase
            .from('member_contributions')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async reconcileYear(yearId: string): Promise<{ processed: number, updated: number }> {
        // 1. Get Year Info
        const { data: year } = await supabase.from('contribution_years').select('year').eq('id', yearId).single();
        if (!year) throw new Error('Year not found');
        const yearString = year.year.toString();

        // 2. Get all contributions for this year
        const { data: contribs } = await supabase
            .from('member_contributions')
            .select('*')
            .eq('year_id', yearId);

        if (!contribs?.length) return { processed: 0, updated: 0 };

        let updatedCount = 0;

        // 3. For each contribution, find matching transactions
        for (const c of contribs) {
            // Get transactions for this member
            // We look for transactions where:
            // - linked_member_id matches
            // - description contains the year string (e.g. "2025") OR transaction date is in that year?
            // User request: "per jaartal dat is genoemd in de omschrijving" OR "binnengekomen transacties per jaar"
            // Let's being strict first: Description MUST contain year OR date is in year.

            const startOfYear = `${yearString}-01-01`;
            const endOfYear = `${yearString}-12-31`;

            const { data: txs } = await supabase
                .from('bank_transactions')
                .select('amount, description, booking_date, category, contribution_year_id')
                .eq('linked_member_id', c.member_id)
                .eq('association_id', c.association_id)
                .eq('category', 'ledenbijdrage'); // Only count transactions categorized as member contribution

            if (!txs?.length) continue;

            let paidSum = 0;

            for (const tx of txs) {
                // Filter logic
                const isCredit = tx.amount > 0; // Incoming money
                if (!isCredit) continue;

                // Priority Logic:
                // 1. If contribution_year_id is set, it MUST match the target year.
                // 2. If contribution_year_id is NOT set, use the booking_date.

                let matchesYear = false;

                if (tx.contribution_year_id) {
                    matchesYear = tx.contribution_year_id === yearId;
                } else {
                    matchesYear = tx.booking_date >= startOfYear && tx.booking_date <= endOfYear;
                }

                if (matchesYear) {
                    paidSum += tx.amount;
                }
            }

            // Update Contribution if changed
            // Allow small float diffs
            if (Math.abs(paidSum - (c.amount_paid || 0)) > 0.01) {
                let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'PENDING';
                if (paidSum >= c.amount_due) status = 'PAID';
                else if (paidSum > 0) status = 'PARTIAL';

                // Only update if status or amount changes
                await supabase
                    .from('member_contributions')
                    .update({
                        amount_paid: paidSum,
                        status: status
                    })
                    .eq('id', c.id);

                updatedCount++;
            }
        }

        return { processed: contribs.length, updated: updatedCount };
    },

    async syncContributionAmounts(yearId: string): Promise<void> {
        // 1. Get Year Info (Base Rate)
        const { data: yearData, error: yearError } = await supabase
            .from('contribution_years')
            .select('*')
            .eq('id', yearId)
            .single();
        if (yearError || !yearData) throw yearError || new Error('Year not found');

        // 2. Get Group Amounts
        const { data: amounts } = await supabase
            .from('contribution_year_amounts')
            .select('*')
            .eq('year_id', yearId);

        const amountMap = new Map<string, number>();
        amounts?.forEach(a => amountMap.set(a.group_id, a.amount));

        // 2b. Get Group Assignments to sync groups
        const { data: assignments } = await supabase
            .from('member_group_assignments')
            .select('member_id, group_id');
        const assignmentMap = new Map<string, string | null>();
        assignments?.forEach(a => assignmentMap.set(a.member_id, a.group_id));

        // 3. Get Contributions
        const { data: contribs } = await supabase
            .from('member_contributions')
            .select('id, group_id, amount_due, member_id')
            .eq('year_id', yearId);

        if (!contribs) return;

        // 4. Update each
        for (const c of contribs) {
            const currentGroupId = assignmentMap.get(c.member_id) || null;

            let properDue = yearData.default_amount;
            if (currentGroupId && amountMap.has(currentGroupId)) {
                properDue = amountMap.get(currentGroupId)!;
            }

            if (c.amount_due !== properDue || c.group_id !== currentGroupId) {
                await supabase
                    .from('member_contributions')
                    .update({
                        amount_due: properDue,
                        group_id: currentGroupId
                    })
                    .eq('id', c.id);
            }
        }
    },

    async getLinkedTransactions(memberId: string, yearId: string): Promise<any[]> {
        const { data: year } = await supabase.from('contribution_years').select('year').eq('id', yearId).single();
        if (!year) return [];
        const yearString = year.year.toString();

        const startOfYear = `${yearString}-01-01`;
        const endOfYear = `${yearString}-12-31`;

        const { data: txs } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('linked_member_id', memberId)
            .eq('category', 'ledenbijdrage')
            .order('booking_date', { ascending: false });

        if (!txs) return [];

        // Return all that would match the reconcile logic
        return txs.filter(tx => {
            const isCredit = tx.amount > 0;
            if (!isCredit) return false;

            if (tx.contribution_year_id) {
                return tx.contribution_year_id === yearId;
            }

            const inYear = tx.booking_date >= startOfYear && tx.booking_date <= endOfYear;
            return inYear;
        });
    }
};
