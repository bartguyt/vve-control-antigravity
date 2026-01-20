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

    // 1. Get current Association
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            association_memberships (
                association_id
            )
        `)
        .eq('user_id', user.id)
        .single();

    if (!profile?.association_memberships?.[0]?.association_id) {
        console.error('No Association found for user');
        return;
    }

    const associationId = profile.association_memberships[0].association_id;

    // 2. Fetch existing members (instead of creating new ones)
    console.log('Fetching existing members...');
    const { data: existingMembers } = await supabase
        .from('profiles')
        .select(`
            id, 
            first_name, 
            last_name,
            association_memberships!inner(association_id)
        `)
        .eq('association_memberships.association_id', associationId);

    const members = existingMembers || [];
    const memberIbans: string[] = [];

    if (members.length === 0) {
        // Fallback: Create 10 dummy members ONLY if none exist
        console.log('No members found. Creating 10 dummy members...');
        for (let i = 0; i < 10; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Math.floor(Math.random() * 1000)}@dummy.com`;

            // Create Profile (Dummy)
            const dummyId = uuidv4();
            const { error: profileError } = await supabase.from('profiles').insert({
                id: dummyId,
                user_id: dummyId, // Explicitly set user_id to match our dummy logic
                email: email,
                first_name: firstName,
                last_name: lastName,
                association_id: associationId,
                is_super_admin: false
            });

            if (profileError) {
                console.error('Error creating profile', profileError);
                continue;
            }

            // Add to Association Membership
            const { error: memberError } = await supabase.from('association_memberships').insert({
                user_id: dummyId,
                association_id: associationId,
                role: 'member'
            });

            if (memberError && memberError.code !== '23505') {
                console.error('Error creating membership', memberError);
            }

            members.push({ id: dummyId, first_name: firstName, last_name: lastName } as any);
        }
    } else {
        console.log(`Using ${members.length} existing members for seed.`);
    }

    // Generate IBANs for these members (mock ibans in memory or fetch if they have them)
    // For seeding, let's just generate fresh mock IBANs mapped to these members IDs for the transactions
    // We won't insert them into member_ibans to avoid clutter, effectively simulating "unknown" or "new" IBANs
    // UNLESS we want them to auto-match?
    // User wants "leden die daadwerkelijk bestaan".

    // Let's generate a map of MemberID -> DummyIBAN for this seed session
    const memberIbanMap = new Map<string, string>();
    for (const m of members) {
        const iban = generateIBAN();
        memberIbanMap.set(m.id, iban);
        memberIbans.push(iban);
    }

    // 4. Create 100 Random Transactions
    // Mix of existing IBANs (matches) and random IBANs (no match)

    // Get a bank account to attach to (or create one)
    const { data: accounts } = await supabase.from('bank_accounts').select('id').eq('association_id', associationId).limit(1);
    let accountId = accounts?.[0]?.id;

    if (!accountId) {
        // Create dummy bank account
        const { data: newAcc } = await supabase.from('bank_accounts').insert({
            association_id: associationId,
            account_number: generateIBAN(),
            holder_name: 'Vereniging Betaalrekening',
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
            // Pick a random member
            const randomMember = members[Math.floor(Math.random() * members.length)];
            // Use the map we created
            counterIban = memberIbanMap.get(randomMember.id)!;
            counterName = `${randomMember.first_name} ${randomMember.last_name}`;
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
            association_id: associationId, // Required
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
    return { members: members.length, transactions: 100 };
};
