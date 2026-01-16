import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Random IBAN generator
function generateIBAN() {
    const country = 'NL';
    const bank = 'RABO';
    const numbers = Math.floor(Math.random() * 1000000000).toString().padStart(10, '0');
    return `${country}99${bank}0${numbers}`;
}

// Random names
const firstNames = ['Jan', 'Piet', 'Klaas', 'Marie', 'Sophie', 'Emma', 'Lucas', 'Sem', 'Daan', 'Finn'];
const lastNames = ['Jansen', 'de Vries', 'Bakker', 'Smit', 'Visser', 'Mulder', 'de Jong', 'Peters', 'Bos', 'Meijer'];

export const seedFinanceData = async () => {
    console.log('Starting Finance Seed...');

    // 1. Get current VvE
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            vve_memberships!fk_memberships_profiles_userid (
                vve_id
            )
        `)
        .eq('user_id', user.id)
        .single();

    if (!profile?.vve_memberships?.[0]?.vve_id) {
        console.error('No VvE found for user');
        return;
    }

    const vveId = profile.vve_memberships[0].vve_id;

    // 2. Create 10 dummy members
    const newMemberIds: string[] = [];
    const memberIbans: string[] = [];

    for (let i = 0; i < 10; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Math.floor(Math.random() * 1000)}@dummy.com`;

        // Create Profile (Dummy)
        // We might not be able to create auth users easily, but we can create profiles if RLS allows (or if we are admin)
        // Note: Creating profiles without auth users is 'ghost users'. 
        // For this demo, we'll insert into profiles directly if allowed, or we just create "Member Records" if we had a separate table.
        // Assuming 'profiles' is the source of truth.

        const dummyId = uuidv4();
        const { error: profileError } = await supabase.from('profiles').insert({
            id: dummyId,
            user_id: dummyId, // Explicitly set user_id to match our dummy logic
            email: email,
            first_name: firstName,
            last_name: lastName,
            vve_id: vveId,
            is_super_admin: false
        });

        if (profileError) {
            console.error('Error creating profile', profileError);
            continue;
        }

        // Add to VvE Membership (ignore if exists)
        const { error: memberError } = await supabase.from('vve_memberships').insert({
            user_id: dummyId,
            vve_id: vveId,
            role: 'member'
        });

        // 409 Conflict is fine (duplicate membership), just ignore
        if (memberError && memberError.code !== '23505') {
            console.error('Error creating membership', memberError);
        }

        newMemberIds.push(dummyId);

        // 3. Add 1-2 IBANs per member
        const numIbans = Math.random() > 0.7 ? 2 : 1;
        for (let j = 0; j < numIbans; j++) {
            const iban = generateIBAN();
            await supabase.from('member_ibans').insert({
                user_id: dummyId,
                iban: iban
            });
            memberIbans.push(iban);
        }
    }
    console.log(`Created ${newMemberIds.length} dummy members.`);

    // 4. Create 100 Random Transactions
    // Mix of existing IBANs (matches) and random IBANs (no match)

    // Get a bank account to attach to (or create one)
    const { data: accounts } = await supabase.from('bank_accounts').select('id').eq('vve_id', vveId).limit(1);
    let accountId = accounts?.[0]?.id;

    if (!accountId) {
        // Create dummy bank account
        const { data: newAcc } = await supabase.from('bank_accounts').insert({
            vve_id: vveId,
            account_number: generateIBAN(),
            holder_name: 'VvE Betaalrekening',
            bank_name: 'Rabobank',
            currency: 'EUR',
            account_type: 'payment'
        }).select().single();
        accountId = newAcc.id;
    }

    // Pool of recurring external IBANs (Energy, Cleaning, etc.)
    const externalIbans: { iban: string, name: string }[] = [];
    for (let i = 0; i < 8; i++) {
        externalIbans.push({
            iban: generateIBAN(),
            name: `Bedrijf ${String.fromCharCode(65 + i)}` // Bedrijf A, B, C...
        });
    }

    const transactions = [];
    const categories = ['Bijdrage', 'Onderhoud', 'Verzekering', 'Energie', 'Overig'];

    for (let i = 0; i < 100; i++) {
        // 40% chance of matching a known MEMBER IBAN
        const isMatch = Math.random() < 0.4;

        let counterIban: string;
        let counterName: string;

        if (isMatch) {
            counterIban = memberIbans[Math.floor(Math.random() * memberIbans.length)];
            // const uniqueNameIdx = Math.floor(Math.random() * firstNames.length);
            counterName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        } else {
            // Pick from the RECURRING external pool 90% of the time, 10% completely random
            if (Math.random() < 0.9) {
                const external = externalIbans[Math.floor(Math.random() * externalIbans.length)];
                counterIban = external.iban;
                counterName = external.name;
            } else {
                counterIban = generateIBAN();
                counterName = 'Onbekende Derde';
            }
        }

        const transactionDescription = categories[Math.floor(Math.random() * categories.length)];

        const amount = (Math.random() * 200 - 50).toFixed(2); // Amount between -50 and 150
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Last 60 days

        transactions.push({
            account_id: accountId,
            vve_id: vveId, // Required
            external_id: uuidv4(), // Required Unique ID
            booking_date: date.toISOString().split('T')[0], // Was transaction_date
            amount: parseFloat(amount as string), // Ensure number
            currency: 'EUR',
            description: transactionDescription,
            counterparty_name: counterName,
            counterparty_iban: counterIban,
            status: 'BOOKED'
        });
    }

    // Insert in chunks
    const chunkSize = 20;
    for (let i = 0; i < transactions.length; i += chunkSize) {
        const chunk = transactions.slice(i, i + chunkSize);
        const { error } = await supabase.from('bank_transactions').insert(chunk);
        if (error) {
            console.error('Error inserting transactions', error);
            throw error; // Re-throw to see in UI
        }
    }

    console.log('Seeding complete!');
    return { members: newMemberIds.length, transactions: 100 };
};
