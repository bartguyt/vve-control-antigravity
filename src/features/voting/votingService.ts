import { supabase } from '../../lib/supabase';
import type { Meeting, Proposal, Vote, VoteChoice, Member } from '../../types/database';
import { associationService } from '../../lib/association';


export const votingService = {
    // MEETINGS
    async getMeetings(status?: Meeting['status']) {
        let query = supabase
            .from('meetings')
            .select('*')
            .order('date', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Meeting[];
    },

    async createMeeting(meeting: Partial<Meeting>) {
        const { data, error } = await supabase
            .from('meetings')
            .insert(meeting)
            .select()
            .single();
        if (error) throw error;
        return data as Meeting;
    },

    // PROPOSALS
    async getProposals(meetingId?: string) {
        let query = supabase
            .from('proposals')
            .select(`
                *,
                meeting:meeting_id(*),
                votes:votes(*)
            `)
            .order('created_at', { ascending: false });

        if (meetingId) {
            query = query.eq('meeting_id', meetingId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Proposal[];
    },

    async getProposalStats(proposalIds: string[]) {
        if (proposalIds.length === 0) return [];
        const { data, error } = await supabase
            .from('vw_proposal_stats')
            .select('*')
            .in('proposal_id', proposalIds);

        if (error) throw error;
        return data;
    },

    async createProposal(proposal: Partial<Proposal>) {
        const associationId = await associationService.getCurrentAssociationId();

        const { data, error } = await supabase
            .from('proposals')
            .insert({ ...proposal, association_id: associationId })
            .select()
            .single();
        if (error) throw error;
        return data as Proposal;
    },

    async updateProposalStatus(id: string, status: Proposal['status']) {
        const { error } = await supabase
            .from('proposals')
            .update({ status })
            .eq('id', id);
        if (error) throw error;
    },

    async deleteProposal(id: string) {
        const { error } = await supabase
            .from('proposals')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },


    // VOTES
    async castVote(proposalId: string, memberId: string, choice: VoteChoice) {
        // RLS will enforce that the user owns the member
        // But we should get the member's current fraction weight to snapshot it
        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('fraction')
            .eq('id', memberId)
            .single();

        if (memberError) throw memberError;

        const { data, error } = await supabase
            .from('votes')
            .insert({
                proposal_id: proposalId,
                member_id: memberId,
                choice,
                weight: member.fraction || 1,
                user_id: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return data as Vote;
    },

    async getMyVotes(proposalIds: string[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('votes')
            .select('*')
            .in('proposal_id', proposalIds)
            .eq('user_id', user.id);

        if (error) throw error;
        return data as Vote[];
    },

    // HELPERS
    async getMyVotingUnits() {
        // Function to find which Members (Units) the current user represents
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('profile_id', user.id); // Assuming we fixed the column name to profile_id

        if (error) throw error;
        return data as Member[];
    }
};
