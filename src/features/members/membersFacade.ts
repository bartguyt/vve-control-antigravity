/**
 * Members Facade
 * Aggregates member-related data with optional enrichment from other features
 * Provides feature-aware data loading
 * Part of Fase 2: Decoupling Pages from Services
 */

import { memberService } from './memberService';
import { contributionService } from '../finance/contributionService';
import type { Member, Profile } from '../../types/database';

/**
 * Enriched member data with voting and contribution information
 */
export interface EnrichedMember extends Member {
  votingWeight?: number;
  contributionStatus?: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
  contributionAmount?: number;
  contributionPaid?: number;
}

/**
 * Member summary with related data
 */
export interface MemberSummary {
  member: Member;
  profile?: Profile;
  contributions?: any[];
  transactions?: any[];
  votingPower?: number;
}

/**
 * Members list with pagination and filtering
 */
export interface MembersListData {
  members: EnrichedMember[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Members Facade
 * Single entry point for member-related data operations
 */
export class MembersFacade {
  /**
   * Get all members with optional enrichment
   */
  async getMembers(
    associationId: string,
    options?: {
      includeVotingPower?: boolean;
      includeContributionStatus?: boolean;
    }
  ): Promise<EnrichedMember[]> {
    // Load base members
    const members = await memberService.getMembers(associationId);

    // Enrich if requested
    if (options?.includeVotingPower || options?.includeContributionStatus) {
      return await this.enrichMembers(
        members,
        options.includeVotingPower ?? false,
        options.includeContributionStatus ?? false
      );
    }

    return members;
  }

  /**
   * Get members with voting power for voting features
   */
  async getMembersWithVotingPower(associationId: string): Promise<EnrichedMember[]> {
    const members = await memberService.getMembers(associationId);

    return members.map(member => ({
      ...member,
      votingWeight: member.fraction || 0
    }));
  }

  /**
   * Get member summary with all related data
   */
  async getMemberSummary(
    memberId: string,
    options?: {
      includeContributions?: boolean;
      includeTransactions?: boolean;
    }
  ): Promise<MemberSummary> {
    // Load base member
    const member = await memberService.getMember(memberId);

    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    const summary: MemberSummary = {
      member,
      votingPower: member.fraction || 0
    };

    // Load profile if member has one
    if (member.profile_id) {
      try {
        summary.profile = await memberService.getProfile(member.profile_id);
      } catch (error) {
        console.warn('Could not load member profile:', error);
      }
    }

    // Load contributions if requested
    if (options?.includeContributions) {
      try {
        summary.contributions = await this.getMemberContributions(memberId);
      } catch (error) {
        console.warn('Could not load member contributions:', error);
      }
    }

    // Load transactions if requested and banking enabled
    if (options?.includeTransactions) {
      try {
        summary.transactions = await this.getMemberTransactions(memberId);
      } catch (error) {
        console.warn('Could not load member transactions:', error);
      }
    }

    return summary;
  }

  /**
   * Get member by ID
   */
  async getMember(memberId: string): Promise<Member> {
    const member = await memberService.getMember(memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }
    return member;
  }

  /**
   * Get members by IDs (batch operation)
   */
  async getMembersByIds(memberIds: string[]): Promise<Member[]> {
    return await memberService.getMembersByIds(memberIds);
  }

  /**
   * Create a new member
   */
  async createMember(memberData: Partial<Member>): Promise<Member> {
    return await memberService.createMember(memberData);
  }

  /**
   * Update member
   */
  async updateMember(memberId: string, memberData: Partial<Member>): Promise<Member> {
    return await memberService.updateMember(memberId, memberData);
  }

  /**
   * Delete member (safe delete with dependency checks)
   */
  async deleteMember(memberId: string): Promise<void> {
    await memberService.deleteMember(memberId);
  }

  /**
   * Get member contributions (if contributions feature enabled)
   * @private
   */
  private async getMemberContributions(memberId: string): Promise<any[]> {
    try {
      return await contributionService.getMemberContributions(memberId);
    } catch (error) {
      console.warn('Could not load member contributions:', error);
      return [];
    }
  }

  /**
   * Get member transactions (if banking feature enabled)
   * @private
   */
  private async getMemberTransactions(memberId: string): Promise<any[]> {
    try {
      // This would call bankService.getTransactionsByMember
      // For now return empty array
      return [];
    } catch (error) {
      console.warn('Could not load member transactions:', error);
      return [];
    }
  }

  /**
   * Enrich members with voting power and contribution status
   * @private
   */
  private async enrichMembers(
    members: Member[],
    includeVotingPower: boolean,
    includeContributionStatus: boolean
  ): Promise<EnrichedMember[]> {
    const enriched: EnrichedMember[] = members.map(member => ({
      ...member,
      votingWeight: includeVotingPower ? (member.fraction || 0) : undefined
    }));

    // Add contribution status if requested
    if (includeContributionStatus && members.length > 0) {
      try {
        const associationId = members[0].association_id;
        const years = await contributionService.getYears(associationId);

        if (years.length > 0) {
          const currentYear = years[0];
          const contributions = await contributionService.getContributionsForYear(currentYear.id);

          // Create contribution map
          const contributionMap = new Map(
            contributions.map(c => [c.member_id, c])
          );

          enriched.forEach(member => {
            const contribution = contributionMap.get(member.id);
            if (contribution) {
              member.contributionStatus = contribution.status;
              member.contributionAmount = contribution.amount_due;
              member.contributionPaid = contribution.amount_paid;
            }
          });
        }
      } catch (error) {
        console.warn('Could not load contribution statuses:', error);
      }
    }

    return enriched;
  }
}

/**
 * Singleton instance
 */
export const membersFacade = new MembersFacade();
