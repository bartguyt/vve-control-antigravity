import { supabase } from '../../lib/supabase';
import { debugUtils } from '../../utils/debugUtils';
// import type { BankTransaction } from '../../types/database';
import { associationService } from '../../lib/association';
import { extractYearFromDescription, extractMonthsFromDescription, getMonthName } from '../../utils/transactionUtils';
import { contributionService } from './contributionService';
import { notificationService } from '../../services/notificationService';

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

        // Get members with their group assignments
        const { data: members } = await supabase
            .from('members')
            .select(`
                id, 
                first_name, 
                last_name,
                member_group_assignments (
                    group_id,
                    contribution_groups (
                        id,
                        name
                    )
                )
            `)
            .eq('association_id', associationId)
            .eq('association_id', associationId);

        // Get contribution year settings for realistic amounts
        const { data: contributionYears } = await supabase
            .from('contribution_years')
            .select('id, year, default_amount')
            .eq('association_id', associationId)
            .order('year', { ascending: false })
            .limit(1);

        const yearId = contributionYears && contributionYears.length > 0
            ? contributionYears[0].id
            : null;

        // Get group-specific amounts for this year
        const { data: yearAmounts } = await supabase
            .from('contribution_year_amounts')
            .select('group_id, amount')
            .eq('year_id', yearId);

        // Create a map of group_id -> amount
        const groupAmountMap = new Map<string, number>();
        yearAmounts?.forEach(ya => {
            groupAmountMap.set(ya.group_id, ya.amount);
        });

        // Default fallback amount
        const defaultAmount = contributionYears && contributionYears.length > 0
            ? contributionYears[0].default_amount
            : 50.00;

        // Define monthlyAmount for the variants array usage
        const monthlyAmount = defaultAmount;

        for (const account of paymentAccounts) {
            // 50 comprehensive transaction scenarios
            const transactionVariants = [
                // === SINGLE MONTH SCENARIOS (Dutch full names) ===
                { description: 'VvE Bijdrage januari', amount: monthlyAmount },      // 1
                { description: 'Ledenbijdrage februari', amount: monthlyAmount },    // 2
                { description: 'VvE maart', amount: monthlyAmount },                 // 3
                { description: 'Bijdrage april', amount: monthlyAmount },            // 4
                { description: 'Ledenbijdrage mei', amount: monthlyAmount },         // 5
                { description: 'VvE Bijdrage juni', amount: monthlyAmount },         // 6
                { description: 'Bijdrage juli', amount: monthlyAmount },             // 7
                { description: 'Ledenbijdrage augustus', amount: monthlyAmount },    // 8
                { description: 'VvE september', amount: monthlyAmount },             // 9
                { description: 'Bijdrage oktober', amount: monthlyAmount },          // 10
                { description: 'Ledenbijdrage november', amount: monthlyAmount },    // 11
                { description: 'VvE Bijdrage december', amount: monthlyAmount },     // 12

                // === SINGLE MONTH SCENARIOS (Dutch abbreviations) ===
                { description: 'Bijdrage jan', amount: monthlyAmount },              // 13
                { description: 'VvE feb', amount: monthlyAmount },                   // 14
                { description: 'Ledenbijdrage mrt', amount: monthlyAmount },         // 15
                { description: 'Bijdrage apr', amount: monthlyAmount },              // 16
                { description: 'VvE jun', amount: monthlyAmount },                   // 17
                { description: 'Ledenbijdrage jul', amount: monthlyAmount },         // 18
                { description: 'Bijdrage aug', amount: monthlyAmount },              // 19
                { description: 'VvE sep', amount: monthlyAmount },                   // 20
                { description: 'Ledenbijdrage okt', amount: monthlyAmount },         // 21
                { description: 'Bijdrage nov', amount: monthlyAmount },              // 22
                { description: 'VvE dec', amount: monthlyAmount },                   // 23

                // === QUARTER SCENARIOS (full payment) ===
                { description: 'VvE Q1 2024', amount: monthlyAmount * 3 },           // 24 (jan+feb+mrt)
                { description: 'Ledenbijdrage Q2', amount: monthlyAmount * 3 },      // 25 (apr+mei+jun)
                { description: 'Bijdrage kwartaal 3', amount: monthlyAmount * 3 },   // 26 (jul+aug+sep)
                { description: 'VvE Q4 2024', amount: monthlyAmount * 3 },           // 27 (okt+nov+dec)

                // === MULTI-MONTH SCENARIOS (consecutive, full payment) ===
                { description: 'Ledenbijdrage jan feb', amount: monthlyAmount * 2 },    // 28
                { description: 'VvE maart april mei', amount: monthlyAmount * 3 },      // 29
                { description: 'Bijdrage jun jul aug sep', amount: monthlyAmount * 4 }, // 30
                { description: 'Ledenbijdrage okt nov dec', amount: monthlyAmount * 3 },// 31

                // === MULTI-MONTH SCENARIOS (non-consecutive) ===
                { description: 'VvE jan mrt mei', amount: monthlyAmount * 3 },          // 32
                { description: 'Bijdrage feb apr jun', amount: monthlyAmount * 3 },     // 33
                { description: 'Ledenbijdrage jul sep nov', amount: monthlyAmount * 3 },// 34

                // === PARTIAL PAYMENT SCENARIOS (insufficient amount) ===
                { description: 'Bijdrage jan feb mrt', amount: monthlyAmount * 1.5 },      // 35 (only 1.5 months)
                { description: 'VvE Q2', amount: monthlyAmount * 2 },                      // 36 (only 2 months)
                { description: 'Ledenbijdrage apr mei jun jul', amount: monthlyAmount * 2.5 }, // 37 (only 2.5 months)
                { description: 'Bijdrage aug sep okt', amount: monthlyAmount },            // 38 (only 1 month)

                // === OVERPAYMENT SCENARIOS ===
                { description: 'VvE jan feb', amount: monthlyAmount * 3 },              // 39 (1 month overflow)
                { description: 'Ledenbijdrage maart', amount: monthlyAmount * 2 },      // 40 (1 month overflow)
                { description: 'Bijdrage apr mei jun', amount: monthlyAmount * 4 },     // 41 (1 month overflow)

                // === EDGE CASES ===
                { description: '', amount: monthlyAmount },                             // 42 (no description)
                { description: 'Ledenbijdrage', amount: monthlyAmount },                // 43 (only "bijdrage")
                { description: 'BIJDRAGE JANUARI', amount: monthlyAmount },             // 44 (uppercase)
                { description: 'vve bijdrage Februari', amount: monthlyAmount },        // 45 (mixed case)
                { description: 'Betaling 2024', amount: monthlyAmount },                // 46 (year only)
                { description: 'VvE 2024 Q1', amount: monthlyAmount * 3 },              // 47 (year + quarter)
                { description: 'Ledenbijdrage 2024 jan feb mrt', amount: monthlyAmount * 3 }, // 48 (year + months)
                { description: 'Bijdrage te weinig', amount: monthlyAmount * 0.5 },     // 49 (too little for any month)
                { description: 'VvE hele jaar', amount: monthlyAmount * 12 }            // 50 (full year)
            ];

            const mockTransactions = [];

            // Create transactions with varied dates over last 6 months
            for (let i = 0; i < transactionVariants.length; i++) {
                const variant = transactionVariants[i];

                // Pick random member if available
                const member = members && members.length > 0
                    ? members[Math.floor(Math.random() * members.length)]
                    : null;

                // Get member's group-specific amount
                let memberMonthlyAmount = defaultAmount;
                if (member && (member as any).member_group_assignments && (member as any).member_group_assignments.length > 0) {
                    const groupId = (member as any).member_group_assignments[0].group_id;
                    if (groupAmountMap.has(groupId)) {
                        memberMonthlyAmount = groupAmountMap.get(groupId)!;
                    }
                }

                // Calculate actual amount based on variant multiplier
                // Extract multiplier from variant amount (which used defaultAmount)
                const multiplier = variant.amount / defaultAmount;
                const actualAmount = memberMonthlyAmount * multiplier;

                // Random date in last 6 months
                const daysAgo = Math.floor(Math.random() * 180);
                const bookingDate = new Date();
                bookingDate.setDate(bookingDate.getDate() - daysAgo);

                mockTransactions.push({
                    account_id: account.id,
                    association_id: associationId,
                    external_id: `tx-${i}-${account.id}`,
                    booking_date: bookingDate.toISOString().split('T')[0],
                    amount: actualAmount,
                    description: variant.description,
                    debtor_name: member ? `${member.first_name} ${member.last_name}` : 'Onbekend Lid',
                    counterparty_iban: member ? `NL${Math.floor(Math.random() * 90) + 10}BANK${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}` : null,
                    linked_member_id: member?.id || null,
                    contribution_year_id: yearId, // Link to contribution year
                    transaction_type: 'CREDIT_TRANSFER'
                });
            }

            await supabase.from('bank_transactions').insert(mockTransactions);

            // Recalculate account balance after seeding
            await this.recalculateAccountBalance(account.id);
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
            .select(`
                *,
                linked_member:profiles(id, first_name, last_name, email)
            `)
            .eq('bank_account_id', accountId)
            .order('booking_date', { ascending: false });

        return data || [];
    },

    async autoCategorizeAccountTransactions(accountId: string) {
        // Find transactions for this account that are linked but uncategorized
        const { data, error } = await supabase
            .from('bank_transactions')
            .select('*')
            .eq('bank_account_id', accountId)
            .is('financial_category_id', null)
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

            // Get all contribution years for this association
            const years = await contributionService.getYears();

            if (cat) {
                for (const tx of data) {
                    const desc = (tx.description || '').toLowerCase();
                    const remittance = (tx.remittance_information || '').toLowerCase();

                    if (desc.includes('bijdrage') || remittance.includes('bijdrage')) {
                        // Auto-assign year
                        let yearId: string | null = null;
                        const descYear = extractYearFromDescription(tx.description || '');

                        if (descYear) {
                            const matchingYear = years.find(y => y.year === descYear);
                            yearId = matchingYear?.id || null;
                        }

                        if (!yearId) {
                            const bookingYear = new Date(tx.booking_date).getFullYear();
                            const matchingYear = years.find(y => y.year === bookingYear);
                            yearId = matchingYear?.id || null;
                        }

                        // Extract ALL months from description
                        const months = extractMonthsFromDescription(tx.description || '');

                        // Fallback to booking_date month if no months found
                        const finalMonths = months.length > 0
                            ? months
                            : [new Date(tx.booking_date).getMonth() + 1];

                        // Update transaction category
                        await this.updateTransactionCategory(
                            tx.id,
                            null,
                            yearId,
                            cat.id
                        );

                        // Create payment records if we have member and year
                        if (tx.linked_member_id && yearId) {
                            await this.createPaymentRecords(
                                tx.id,
                                tx.linked_member_id,
                                yearId,
                                finalMonths,
                                Math.abs(tx.amount)
                            );
                        }

                        count++;
                    }
                }
            }
        }
        return count;
    },

    // Create payment records for individual months from a transaction
    async createPaymentRecords(
        transactionId: string,
        memberId: string,
        yearId: string,
        months: number[],
        totalAmount: number
    ) {
        const associationId = await associationService.getCurrentAssociationId();
        if (!associationId) throw new Error('No association selected');

        // VALIDATION: Get expected monthly amount for this year (Member specific)

        // 1. Check if member is in a group (Direct Query)
        const { data: assignments } = await supabase
            .from('member_group_assignments')
            .select('group_id')
            .eq('member_id', memberId)
            .limit(1);

        let expectedMonthlyAmount = 0;

        // 2. Try to get group amount if member is in a group
        if (assignments && assignments.length > 0) {
            const groupId = assignments[0].group_id;
            const { data: groupAmount } = await supabase
                .from('contribution_year_amounts')
                .select('amount')
                .eq('year_id', yearId)
                .eq('group_id', groupId)
                .single();

            if (groupAmount) {
                expectedMonthlyAmount = groupAmount.amount;
            }
        }

        // 3. Fallback to default amount if no group amount found
        if (expectedMonthlyAmount === 0) {
            const { data: yearData } = await supabase
                .from('contribution_years')
                .select('default_amount')
                .eq('id', yearId)
                .single();

            if (!yearData) throw new Error('Contribution year not found');
            expectedMonthlyAmount = yearData.default_amount;
        }

        // Auto-detect Annual Payment
        // If the amount matches 12x the monthly amount (and we initially targeted 1 month or generic), 
        // assume it's for the full year.
        let finalMonths = months;

        if (expectedMonthlyAmount > 0 && Math.abs(totalAmount - (expectedMonthlyAmount * 12)) < 1.0) {
            // It matches 12 months of contribution!
            finalMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        }

        const requiredAmount = expectedMonthlyAmount * finalMonths.length;

        // Validation: Amount must be sufficient
        // Allow small margin for floating point
        let notificationNeeded = false;

        // Check if transaction amount is sufficient
        if (totalAmount < requiredAmount) {
            // PARTIAL PAYMENT: Assign to earliest months only
            const numMonthsCovered = Math.floor(totalAmount / expectedMonthlyAmount);

            if (numMonthsCovered > 0) {
                // Assign to earliest N months
                finalMonths = months.slice(0, numMonthsCovered).sort((a, b) => a - b);

                debugUtils.warn(
                    `Transaction ${transactionId}: Partial payment €${totalAmount} ` +
                    `covers ${numMonthsCovered} of ${months.length} months. ` +
                    `Assigned to: ${finalMonths.map(m => getMonthName(m)).join(', ')}`
                );

                notificationNeeded = true;
            } else {
                // Not enough for even 1 month - fallback to booking_date
                const { data: tx } = await supabase
                    .from('bank_transactions')
                    .select('booking_date')
                    .eq('id', transactionId)
                    .single();

                if (tx) {
                    const fallbackMonth = new Date(tx.booking_date).getMonth() + 1;
                    finalMonths = [fallbackMonth];
                }

                debugUtils.warn(
                    `Transaction ${transactionId}: Amount €${totalAmount} insufficient ` +
                    `for any month (€${expectedMonthlyAmount} required). ` +
                    `Falling back to booking_date month.`
                );
            }
        }

        // Calculate amounts
        const monthsCovered = finalMonths.length;
        const amountForMonths = monthsCovered * expectedMonthlyAmount;
        const overflow = totalAmount - amountForMonths;

        // Create month records
        const records = finalMonths.map(month => ({
            association_id: associationId,
            transaction_id: transactionId,
            member_id: memberId,
            contribution_year_id: yearId,
            payment_month: month,
            amount: expectedMonthlyAmount
        }));

        if (records.length > 0) {
            const { error } = await supabase
                .from('contribution_payment_records')
                .insert(records);

            if (error) throw error;
        }

        // Create overflow record if there's remaining amount
        if (overflow > 0.01) { // Use 0.01 to avoid floating point issues
            const { error: overflowError } = await supabase
                .from('contribution_payment_records')
                .insert({
                    association_id: associationId,
                    transaction_id: transactionId,
                    member_id: memberId,
                    contribution_year_id: yearId,
                    payment_month: null, // NULL = overflow
                    amount: overflow
                });

            if (overflowError) console.error('Failed to create overflow record:', overflowError);
        }

        // Send notification for partial payments
        if (notificationNeeded) {
            await notificationService.createPartialPaymentNotification(
                associationId,
                memberId,
                transactionId,
                months.length,
                finalMonths.length,
                totalAmount
            );
        }
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
                    .ilike('name', 'Ledenbijdrage')
                    .single();

                if (cat) {
                    // Auto-assign year
                    const years = await contributionService.getYears();
                    let yearId: string | null = null;
                    const descYear = extractYearFromDescription(data.description || '');

                    if (descYear) {
                        const matchingYear = years.find(y => y.year === descYear);
                        yearId = matchingYear?.id || null;
                    }

                    if (!yearId) {
                        const bookingYear = new Date(data.booking_date).getFullYear();
                        const matchingYear = years.find(y => y.year === bookingYear);
                        yearId = matchingYear?.id || null;
                    }

                    // Auto-assign month
                    const descMonths = extractMonthsFromDescription(data.description || '');
                    const month = descMonths.length > 0 ? descMonths[0] : new Date(data.booking_date).getMonth() + 1;

                    await this.updateTransactionCategory(transactionId, null, yearId, cat.id, null, null, null, month);
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
        linkedSupplierId: string | null = null,
        paymentMonth: number | null = null
    ) {
        const updates: any = {
            contribution_year_id: contributionYearId
        };

        if (financialCategoryId) updates.financial_category_id = financialCategoryId;
        if (linkedAssignmentId) updates.linked_assignment_id = linkedAssignmentId;
        if (linkedDocumentId) updates.linked_document_id = linkedDocumentId;
        if (linkedSupplierId) updates.linked_supplier_id = linkedSupplierId;
        if (paymentMonth) updates.payment_month = paymentMonth;

        if (categoryId) updates.category = categoryId;

        const { error } = await supabase
            .from('bank_transactions')
            .update(updates)
            .eq('id', transactionId);

        if (error) throw error;

        // Auto-create payment records if this is a Member Contribution
        try {
            // Fetch updated tx with category details
            const { data: tx } = await supabase
                .from('bank_transactions')
                .select('*, financial_categories(name)')
                .eq('id', transactionId)
                .single();

            // Check if it's a contribution transaction (Ledenbijdrage) with linked member and year
            const isContribution = tx?.financial_categories?.name?.toLowerCase().includes('ledenbijdrage');

            if (tx && tx.linked_member_id && tx.contribution_year_id && isContribution) {
                // Determine months
                let months: number[] = [];
                if (paymentMonth) {
                    months = [paymentMonth];
                } else if (tx.payment_month) {
                    months = [tx.payment_month];
                } else {
                    try {
                        const descMonths = extractMonthsFromDescription(tx.description || '');
                        if (descMonths.length > 0) months = descMonths;
                        else months = [new Date(tx.booking_date).getMonth() + 1];
                    } catch (e) {
                        months = [new Date(tx.booking_date).getMonth() + 1];
                    }
                }

                // CHECK FOR ANNUAL PAYMENT (Fix for incomplete records)
                // 1. Check if member is in a group (Direct Query)
                const { data: assignments } = await supabase
                    .from('member_group_assignments')
                    .select('group_id')
                    .eq('member_id', tx.linked_member_id)
                    .limit(1);

                let expectedMonthlyAmount = 0;

                // 2. Try to get group amount
                if (assignments && assignments.length > 0) {
                    const groupId = assignments[0].group_id;
                    const { data: groupAmount } = await supabase
                        .from('contribution_year_amounts')
                        .select('amount')
                        .eq('year_id', tx.contribution_year_id)
                        .eq('group_id', groupId)
                        .single();
                    if (groupAmount) expectedMonthlyAmount = groupAmount.amount;
                }

                // 3. Fallback to default
                if (expectedMonthlyAmount === 0) {
                    const { data: yearData } = await supabase
                        .from('contribution_years')
                        .select('default_amount')
                        .eq('id', tx.contribution_year_id)
                        .single();
                    if (yearData) expectedMonthlyAmount = yearData.default_amount;
                }

                const matchesExpected = expectedMonthlyAmount > 0 && Math.abs(Math.abs(tx.amount) - (expectedMonthlyAmount * 12)) < 1.0;
                const derivedMonthly = Math.abs(tx.amount) / 12;
                const isCleanYearly = Math.abs(tx.amount) > 60 && Math.abs(derivedMonthly - Math.round(derivedMonthly)) < 0.05;

                const isAnnual = matchesExpected || isCleanYearly;

                // Check if records already exist to avoid duplicates
                const { count } = await supabase
                    .from('contribution_payment_records')
                    .select('*', { count: 'exact', head: true })
                    .eq('transaction_id', transactionId);

                // Only create if no records exist yet OR if we need to upgrade to Annual
                if (count === 0 || (isAnnual && count !== 12)) {
                    if (count && count > 0) {
                        await supabase.from('contribution_payment_records').delete().eq('transaction_id', transactionId);
                    }

                    await this.createPaymentRecords(
                        transactionId,
                        tx.linked_member_id,
                        tx.contribution_year_id,
                        months,
                        Math.abs(tx.amount)
                    );
                }

                // SYNC TOTALS (Crucial step)
                await contributionService.syncContributionAmounts(tx.contribution_year_id);
            }
        } catch (e) {
            console.error('Error auto-creating payment records:', e);
            // Don't fail the main update if this fails, but log it
        }

        // TODO: Auto-Book to Journal when bookkeeping integration is complete
        // if (financialCategoryId) {
        //     await bookkeepingService.createEntryFromTransaction(transactionId, financialCategoryId);
        // }
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
                // Get contribution years once for all transactions
                const years = await contributionService.getYears();

                for (const tx of data) {
                    if (!tx.financial_category_id) {
                        const desc = (tx.description || '').toLowerCase();
                        const remittance = (tx.remittance_information || '').toLowerCase();
                        if (desc.includes('bijdrage') || remittance.includes('bijdrage')) {
                            // Auto-assign year
                            let yearId: string | null = null;
                            const descYear = extractYearFromDescription(tx.description || '');

                            if (descYear) {
                                const matchingYear = years.find(y => y.year === descYear);
                                yearId = matchingYear?.id || null;
                            }

                            if (!yearId) {
                                const bookingYear = new Date(tx.booking_date).getFullYear();
                                const matchingYear = years.find(y => y.year === bookingYear);
                                yearId = matchingYear?.id || null;
                            }

                            // Auto-assign month
                            const descMonths = extractMonthsFromDescription(tx.description || '');
                            const month = descMonths.length > 0 ? descMonths[0] : new Date(tx.booking_date).getMonth() + 1;


                            await this.updateTransactionCategory(tx.id, null, yearId, cat.id, null, null, null, month);
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

    // 8. Delete Account
    async deleteAccount(accountId: string) {
        // First delete all transactions (cascade usually handles this, but explicit is safer or if no cascade)
        await this.deleteAccountTransactions(accountId);

        const { error } = await supabase
            .from('bank_accounts')
            .delete()
            .eq('id', accountId);

        if (error) throw error;
    },

    // 9. Delete All Transactions for Account
    async deleteAccountTransactions(accountId: string) {
        const { error } = await supabase
            .from('bank_transactions')
            .delete()
            .eq('bank_account_id', accountId);

        if (error) throw error;

        // Recalculate balance after deletion
        await this.recalculateAccountBalance(accountId);
    },

    // 10. Bulk Reprocess Transactions (Fix missing records)
    async reprocessAccountTransactions(accountId: string) {
        // Fetch all transactions with necessary details
        const { data: transactions, error } = await supabase
            .from('bank_transactions')
            .select('*, financial_categories(name)')
            .eq('bank_account_id', accountId);

        if (error) throw error;

        let processedCount = 0;
        const touchedYears = new Set<string>();

        for (const tx of transactions || []) {
            // Check if contribution
            const isContribution = tx?.financial_categories?.name?.toLowerCase().includes('ledenbijdrage');

            if (tx.linked_member_id && tx.contribution_year_id && isContribution) {
                // Determine months
                let months: number[] = [];
                if (tx.payment_month) {
                    months = [tx.payment_month];
                } else {
                    try {
                        const descMonths = extractMonthsFromDescription(tx.description || '');
                        if (descMonths.length > 0) months = descMonths;
                        else months = [new Date(tx.booking_date).getMonth() + 1];
                    } catch (e) {
                        months = [new Date(tx.booking_date).getMonth() + 1];
                    }
                }

                // CHECK FOR ANNUAL PAYMENT (Fix for incomplete records)
                // 1. Check if member is in a group (Direct Query)
                const { data: assignments } = await supabase
                    .from('member_group_assignments')
                    .select('group_id')
                    .eq('member_id', tx.linked_member_id)
                    .limit(1);

                let expectedMonthlyAmount = 0;

                // 2. Try to get group amount
                if (assignments && assignments.length > 0) {
                    const groupId = assignments[0].group_id;
                    const { data: groupAmount } = await supabase
                        .from('contribution_year_amounts')
                        .select('amount')
                        .eq('year_id', tx.contribution_year_id)
                        .eq('group_id', groupId)
                        .single();
                    if (groupAmount) expectedMonthlyAmount = groupAmount.amount;
                }

                // 3. Fallback to default
                if (expectedMonthlyAmount === 0) {
                    const { data: yearData } = await supabase
                        .from('contribution_years')
                        .select('default_amount')
                        .eq('id', tx.contribution_year_id)
                        .single();
                    if (yearData) expectedMonthlyAmount = yearData.default_amount;
                }

                const matchesExpected = expectedMonthlyAmount > 0 && Math.abs(Math.abs(tx.amount) - (expectedMonthlyAmount * 12)) < 1.0;

                // Fallback: Check if amount implies 12 months (cleanly divisible) even if it doesn't match expected
                // e.g. Paying 264 (22/m) when expected is 240 (20/m)
                const derivedMonthly = Math.abs(tx.amount) / 12;
                const isCleanYearly = Math.abs(tx.amount) > 60 && Math.abs(derivedMonthly - Math.round(derivedMonthly)) < 0.05;

                const isAnnual = matchesExpected || isCleanYearly;

                // Reprocess payment record
                // Check if exists
                const { count } = await supabase
                    .from('contribution_payment_records')
                    .select('*', { count: 'exact', head: true })
                    .eq('transaction_id', tx.id);

                // If no records OR (it is annual and we have incomplete records) -> Fix it
                if (count === 0 || (isAnnual && count !== 12)) {
                    if (count && count > 0) {
                        // Delete partial/incorrect records
                        await supabase.from('contribution_payment_records').delete().eq('transaction_id', tx.id);
                    }

                    await this.createPaymentRecords(
                        tx.id,
                        tx.linked_member_id,
                        tx.contribution_year_id,
                        months,
                        Math.abs(tx.amount)
                    );
                    processedCount++;
                }

                // Add to set for syncing
                touchedYears.add(tx.contribution_year_id);
            }
        }

        // Sync totals for all affected years
        if (touchedYears.size > 0) {
            for (const yearId of touchedYears) {
                await contributionService.reconcileYear(yearId); // Calc Payments
                await contributionService.syncContributionAmounts(yearId); // Calc Dues & Groups
            }
        }

        return processedCount;
    },

    // 10. Recalculate Account Balance
    async recalculateAccountBalance(accountId: string) {
        // Get all transactions for this account
        const { data: transactions, error: txError } = await supabase
            .from('bank_transactions')
            .select('amount')
            .eq('bank_account_id', accountId);

        if (txError) throw txError;

        // Calculate total balance
        const balance = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

        // Update account balance
        const { error: updateError } = await supabase
            .from('bank_accounts')
            .update({ balance_amount: balance })
            .eq('id', accountId);

        if (updateError) throw updateError;
    },

    // 11. Add Single Seed Transaction
    async addSingleSeedTransaction(accountId: string) {
        const associationId = await associationService.getCurrentAssociationId();

        // Get members to link transactions to
        const { data: members } = await supabase
            .from('members')
            .select('id, first_name, last_name')
            .eq('association_id', associationId)
            .limit(10);

        // Get contribution year settings for realistic amounts
        const { data: contributionYears } = await supabase
            .from('contribution_years')
            .select('id, year, default_amount')
            .eq('association_id', associationId)
            .order('year', { ascending: false })
            .limit(1);

        const monthlyAmount = contributionYears && contributionYears.length > 0
            ? contributionYears[0].default_amount
            : 50.00;

        const yearId = contributionYears && contributionYears.length > 0
            ? contributionYears[0].id
            : null;

        // All 50 transaction variants
        const transactionVariants = [
            // === SINGLE MONTH SCENARIOS (Dutch full names) ===
            { description: 'VvE Bijdrage januari', amount: monthlyAmount },
            { description: 'Ledenbijdrage februari', amount: monthlyAmount },
            { description: 'VvE maart', amount: monthlyAmount },
            { description: 'Bijdrage april', amount: monthlyAmount },
            { description: 'Ledenbijdrage mei', amount: monthlyAmount },
            { description: 'VvE Bijdrage juni', amount: monthlyAmount },
            { description: 'Bijdrage juli', amount: monthlyAmount },
            { description: 'Ledenbijdrage augustus', amount: monthlyAmount },
            { description: 'VvE september', amount: monthlyAmount },
            { description: 'Bijdrage oktober', amount: monthlyAmount },
            { description: 'Ledenbijdrage november', amount: monthlyAmount },
            { description: 'VvE Bijdrage december', amount: monthlyAmount },

            // === SINGLE MONTH SCENARIOS (Dutch abbreviations) ===
            { description: 'Bijdrage jan', amount: monthlyAmount },
            { description: 'VvE feb', amount: monthlyAmount },
            { description: 'Ledenbijdrage mrt', amount: monthlyAmount },
            { description: 'Bijdrage apr', amount: monthlyAmount },
            { description: 'VvE jun', amount: monthlyAmount },
            { description: 'Ledenbijdrage jul', amount: monthlyAmount },
            { description: 'Bijdrage aug', amount: monthlyAmount },
            { description: 'VvE sep', amount: monthlyAmount },
            { description: 'Ledenbijdrage okt', amount: monthlyAmount },
            { description: 'Bijdrage nov', amount: monthlyAmount },
            { description: 'VvE dec', amount: monthlyAmount },

            // === QUARTER SCENARIOS (full payment) ===
            { description: 'VvE Q1 2024', amount: monthlyAmount * 3 },
            { description: 'Ledenbijdrage Q2', amount: monthlyAmount * 3 },
            { description: 'Bijdrage kwartaal 3', amount: monthlyAmount * 3 },
            { description: 'VvE Q4 2024', amount: monthlyAmount * 3 },

            // === MULTI-MONTH SCENARIOS (consecutive, full payment) ===
            { description: 'Ledenbijdrage jan feb', amount: monthlyAmount * 2 },
            { description: 'VvE maart april mei', amount: monthlyAmount * 3 },
            { description: 'Bijdrage jun jul aug sep', amount: monthlyAmount * 4 },
            { description: 'Ledenbijdrage okt nov dec', amount: monthlyAmount * 3 },

            // === MULTI-MONTH SCENARIOS (non-consecutive) ===
            { description: 'VvE jan mrt mei', amount: monthlyAmount * 3 },
            { description: 'Bijdrage feb apr jun', amount: monthlyAmount * 3 },
            { description: 'Ledenbijdrage jul sep nov', amount: monthlyAmount * 3 },

            // === PARTIAL PAYMENT SCENARIOS (insufficient amount) ===
            { description: 'Bijdrage jan feb mrt', amount: monthlyAmount * 1.5 },
            { description: 'VvE Q2', amount: monthlyAmount * 2 },
            { description: 'Ledenbijdrage apr mei jun jul', amount: monthlyAmount * 2.5 },
            { description: 'Bijdrage aug sep okt', amount: monthlyAmount },

            // === OVERPAYMENT SCENARIOS ===
            { description: 'VvE jan feb', amount: monthlyAmount * 3 },
            { description: 'Ledenbijdrage maart', amount: monthlyAmount * 2 },
            { description: 'Bijdrage apr mei jun', amount: monthlyAmount * 4 },

            // === EDGE CASES ===
            { description: '', amount: monthlyAmount },
            { description: 'Ledenbijdrage', amount: monthlyAmount },
            { description: 'BIJDRAGE JANUARI', amount: monthlyAmount },
            { description: 'vve bijdrage Februari', amount: monthlyAmount },
            { description: 'Betaling 2024', amount: monthlyAmount },
            { description: 'VvE 2024 Q1', amount: monthlyAmount * 3 },
            { description: 'Ledenbijdrage 2024 jan feb mrt', amount: monthlyAmount * 3 },
            { description: 'Bijdrage te weinig', amount: monthlyAmount * 0.5 },
            { description: 'VvE hele jaar', amount: monthlyAmount * 12 }
        ];

        // Pick a random variant
        const variant = transactionVariants[Math.floor(Math.random() * transactionVariants.length)];

        // Pick random member if available
        const member = members && members.length > 0
            ? members[Math.floor(Math.random() * members.length)]
            : null;

        // Random date in last 6 months
        const daysAgo = Math.floor(Math.random() * 180);
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() - daysAgo);

        const transaction = {
            account_id: accountId,
            association_id: associationId,
            external_id: `tx-single-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            booking_date: bookingDate.toISOString().split('T')[0],
            amount: variant.amount,
            description: variant.description,
            debtor_name: member ? `${member.first_name} ${member.last_name}` : 'Onbekend Lid',
            counterparty_iban: member ? `NL${Math.floor(Math.random() * 90) + 10}BANK${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}` : null,
            linked_member_id: member?.id || null,
            contribution_year_id: yearId,
            transaction_type: 'CREDIT_TRANSFER'
        };

        const { error } = await supabase.from('bank_transactions').insert([transaction]);
        if (error) throw error;

        // Recalculate balance after adding transaction
        await this.recalculateAccountBalance(accountId);

        return transaction;
    }
};
