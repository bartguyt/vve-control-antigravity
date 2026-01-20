
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhozrwfgqnlxnqptujgc.supabase.co';
const supabaseKey = 'sb_publishable_4xbwkB0LnydZF5CQea-R0A_-RYMBNsg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupGhostData() {
    console.log('Starting Ghost Data Cleanup...');

    // 1. Fetch all unique member_ids from member_contributions
    const { data: contributions, error: cError } = await supabase
        .from('member_contributions')
        .select('id, member_id');

    if (cError) {
        console.error('Error fetching contributions:', cError);
        return;
    }

    if (!contributions || contributions.length === 0) {
        console.log('No contributions found.');
        return;
    }

    const contributionMemberIds = new Set(contributions.map(c => c.member_id));
    console.log(`Found ${contributions.length} contributions spanning ${contributionMemberIds.size} unique member IDs.`);

    // 2. Fetch all valid member IDs from profiles
    // we need to paginate if there are many, but for now assuming reasonable size (<1000)
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id');

    if (pError) {
        console.error('Error fetching profiles:', pError);
        return;
    }

    const validMemberIds = new Set(profiles.map(p => p.id));
    console.log(`Found ${validMemberIds.size} valid profiles.`);

    // 3. Identify Ghosts
    const ghostMemberIds = Array.from(contributionMemberIds).filter(id => !validMemberIds.has(id));

    console.log(`identified ${ghostMemberIds.length} ghost member IDs in contributions.`);

    if (ghostMemberIds.length > 0) {
        console.log('Ghost IDs:', ghostMemberIds);

        // 4. Delete Ghost Contributions
        // We can delete by member_id.in(ghostMemberIds)
        // Note: Doing this in chunks if too many
        const { error: deleteError } = await supabase
            .from('member_contributions')
            .delete()
            .in('member_id', ghostMemberIds);

        if (deleteError) {
            console.error('Error deleting ghost contributions:', deleteError);
        } else {
            console.log('Successfully deleted ghost contributions.');
        }
    } else {
        console.log('No ghost contributions found. Data is clean.');
    }
}

cleanupGhostData();
