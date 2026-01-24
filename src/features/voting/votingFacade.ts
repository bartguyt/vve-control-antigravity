/**
 * Voting Facade
 * Aggregates voting and member data for proposals and votes
 * Provides feature-aware data loading
 * Part of Fase 2: Decoupling Pages from Services
 */

import { votingService } from './votingService';
import { membersFacade } from '../members/membersFacade';
import type { Proposal, Vote, Member } from '../../types/database';

/**
 * Proposal with voting statistics
 */
export interface EnrichedProposal extends Proposal {
  voteStats?: {
    totalVotes: number;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    totalWeight: number;
    weightFor: number;
    weightAgainst: number;
    weightAbstain: number;
    turnout: number;
  };
  myVote?: Vote;
  canVote?: boolean;
  decision?: 'ACCEPTED' | 'REJECTED' | 'PENDING';
}

/**
 * Voting overview data
 */
export interface VotingOverviewData {
  proposals: EnrichedProposal[];
  activeCount: number;
  completedCount: number;
  myVotes: Vote[];
}

/**
 * Member with voting eligibility
 */
export interface VotingMember extends Member {
  votingWeight: number;
  hasVoted?: boolean;
  canVote: boolean;
}

/**
 * Voting Facade
 * Single entry point for voting-related data operations
 */
export class VotingFacade {
  /**
   * Get all proposals with optional enrichment
   */
  async getProposals(
    associationId: string,
    options?: {
      includeStats?: boolean;
      includeMyVotes?: boolean;
      userId?: string;
    }
  ): Promise<EnrichedProposal[]> {
    // Load base proposals
    const proposals = await votingService.getProposals(associationId);

    // Load my votes if requested
    let myVotesMap = new Map<string, Vote>();
    if (options?.includeMyVotes && options.userId) {
      const myVotes = await votingService.getMyVotes(associationId, options.userId);
      myVotes.forEach(vote => {
        myVotesMap.set(vote.proposal_id, vote);
      });
    }

    // Enrich proposals
    const enriched: EnrichedProposal[] = [];

    for (const proposal of proposals) {
      const enrichedProposal: EnrichedProposal = {
        ...proposal,
        myVote: myVotesMap.get(proposal.id)
      };

      // Add vote statistics if requested
      if (options?.includeStats) {
        enrichedProposal.voteStats = await this.getProposalStats(proposal.id);
      }

      enriched.push(enrichedProposal);
    }

    return enriched;
  }

  /**
   * Get voting overview for dashboard
   */
  async getVotingOverview(
    associationId: string,
    userId: string
  ): Promise<VotingOverviewData> {
    const [proposals, myVotes] = await Promise.all([
      votingService.getProposals(associationId),
      votingService.getMyVotes(associationId, userId)
    ]);

    const myVotesMap = new Map(myVotes.map(v => [v.proposal_id, v]));

    const enrichedProposals = await Promise.all(
      proposals.map(async (proposal) => {
        const voteStats = await this.getProposalStats(proposal.id);
        return {
          ...proposal,
          voteStats,
          myVote: myVotesMap.get(proposal.id)
        };
      })
    );

    return {
      proposals: enrichedProposals,
      activeCount: proposals.filter(p => p.status === 'OPEN').length,
      completedCount: proposals.filter(p => ['ACCEPTED', 'REJECTED'].includes(p.status)).length,
      myVotes
    };
  }

  /**
   * Get members eligible to vote
   */
  async getVotingMembers(associationId: string): Promise<VotingMember[]> {
    const members = await membersFacade.getMembersWithVotingPower(associationId);

    return members.map(member => ({
      ...member,
      votingWeight: member.votingWeight || member.fraction || 0,
      canVote: (member.votingWeight || member.fraction || 0) > 0
    }));
  }

  /**
   * Get proposal by ID with full details
   */
  async getProposal(proposalId: string): Promise<EnrichedProposal | null> {
    const proposal = await votingService.getProposal(proposalId);

    if (!proposal) {
      return null;
    }

    const voteStats = await this.getProposalStats(proposalId);

    return {
      ...proposal,
      voteStats
    };
  }

  /**
   * Create a new proposal
   */
  async createProposal(proposalData: Partial<Proposal>): Promise<Proposal> {
    return await votingService.createProposal(proposalData);
  }

  /**
   * Update proposal
   */
  async updateProposal(proposalId: string, proposalData: Partial<Proposal>): Promise<Proposal> {
    return await votingService.updateProposal(proposalId, proposalData);
  }

  /**
   * Delete proposal
   */
  async deleteProposal(proposalId: string): Promise<void> {
    await votingService.deleteProposal(proposalId);
  }

  /**
   * Submit a vote
   */
  async submitVote(
    proposalId: string,
    memberId: string,
    userId: string,
    choice: 'FOR' | 'AGAINST' | 'ABSTAIN'
  ): Promise<Vote> {
    return await votingService.submitVote(proposalId, memberId, userId, choice);
  }

  /**
   * Get vote statistics for a proposal
   * @private
   */
  private async getProposalStats(proposalId: string) {
    try {
      const stats = await votingService.getProposalStats(proposalId);

      return {
        totalVotes: stats.total_votes || 0,
        votesFor: stats.votes_for || 0,
        votesAgainst: stats.votes_against || 0,
        votesAbstain: stats.votes_abstain || 0,
        totalWeight: stats.total_weight || 0,
        weightFor: stats.weight_for || 0,
        weightAgainst: stats.weight_against || 0,
        weightAbstain: stats.weight_abstain || 0,
        turnout: stats.turnout || 0
      };
    } catch (error) {
      console.warn('Could not load proposal stats:', error);
      return {
        totalVotes: 0,
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        totalWeight: 0,
        weightFor: 0,
        weightAgainst: 0,
        weightAbstain: 0,
        turnout: 0
      };
    }
  }

  /**
   * Update proposal status (e.g., close voting, finalize result)
   */
  async updateProposalStatus(
    proposalId: string,
    status: 'DRAFT' | 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  ): Promise<void> {
    await votingService.updateProposal(proposalId, { status });
  }

  /**
   * Check if user can vote on proposal
   */
  async canUserVote(proposalId: string, userId: string): Promise<boolean> {
    const proposal = await votingService.getProposal(proposalId);

    if (!proposal || proposal.status !== 'OPEN') {
      return false;
    }

    const myVotes = await votingService.getMyVotes(proposal.association_id, userId);
    const hasVoted = myVotes.some(v => v.proposal_id === proposalId);

    return !hasVoted;
  }
}

/**
 * Singleton instance
 */
export const votingFacade = new VotingFacade();
