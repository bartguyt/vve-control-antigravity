
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhozrwfgqnlxnqptujgc.supabase.co';
const supabaseKey = 'sb_publishable_4xbwkB0LnydZF5CQea-R0A_-RYMBNsg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrphans() {
    console.log('Checking for orphaned transactions...');

    // 1. Get all unique linked_member_ids from transactions
    const { data: txs, error: txError } = await supabase
        .from('bank_transactions')
        .select('linked_member_id')
        .not('linked_member_id', 'is', null);

    if (txError) {
        console.error('Error fetching transactions:', txError);
        return;
    }

    if (!txs || txs.length === 0) {
        console.log('No linked transactions found.');
        return;
    }

    const linkedIds = new Set(txs.map(t => t.linked_member_id));
    console.log(`Found ${linkedIds.size} unique referenced member IDs.`);

    // 2. Check which ones exist in profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id');

    if (pError) {
        console.error('Error fetching profiles:', pError);
        return;
    }

    const validIds = new Set(profiles?.map(p => p.id) || []);

    // 3. Find orphans
    const orphans = Array.from(linkedIds).filter(id => !validIds.has(id));

    console.log(`Found ${orphans.length} orphaned member IDs.`);

    if (orphans.length > 0) {
        console.log('Orphaned IDs:', orphans);

        // 4. Update them to NULL
        const { error: updateError } = await supabase
            .from('bank_transactions')
            .update({ linked_member_id: null })
            .in('linked_member_id', orphans);

        if (updateError) {
            console.error('Failed to cleanup orphans:', updateError);
        } else {
            console.log('Successfully removed orphaned references.');
        }
    } else {
        console.log('No orphans found. Database is clean.');
    }
}

fixOrphans();
