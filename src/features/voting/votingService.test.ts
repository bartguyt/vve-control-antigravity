import { describe, it, expect, vi, beforeEach } from 'vitest';
import { votingService } from './votingService';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
        })),
        rpc: vi.fn(),
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: 'test-user-123' } },
                error: null,
            }),
        },
    },
}));

vi.mock('../../lib/association', () => ({
    associationService: {
        getCurrentAssociationId: vi.fn().mockResolvedValue('test-association-123'),
    },
}));

describe('votingService - Critical Scenarios', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Scenario 1: Vote Casting with Weight Calculation', () => {
        it('captures member fraction as vote weight at time of voting', async () => {
            const { supabase } = await import('../../lib/supabase');
            const mockFrom = supabase.from as any;

            // Mock member with specific fraction
            mockFrom.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: 'member-1', fraction: 0.25 },
                    error: null,
                }),
            });

            // Mock vote insert
            mockFrom.mockReturnValueOnce({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'vote-1',
                        proposal_id: 'proposal-1',
                        member_id: 'member-1',
                        choice: 'for',
                        weight: 0.25,
                    },
                    error: null,
                }),
            });

            const result = await votingService.castVote('proposal-1', 'member-1', 'for');

            expect(result.weight).toBe(0.25);
            expect(result.choice).toBe('for');
        });

        it('defaults to weight of 1 if member has no fraction', async () => {
            const { supabase } = await import('../../lib/supabase');
            const mockFrom = supabase.from as any;

            mockFrom.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: 'member-1', fraction: null },
                    error: null,
                }),
            });

            mockFrom.mockReturnValueOnce({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'vote-1',
                        weight: 1,
                    },
                    error: null,
                }),
            });

            const result = await votingService.castVote('proposal-1', 'member-1', 'for');

            expect(result.weight).toBe(1);
        });
    });

    describe('Scenario 2: Calculate Proposal Result', () => {
        it('calls database RPC function to calculate results', async () => {
            const { supabase } = await import('../../lib/supabase');
            const mockRpc = supabase.rpc as any;

            mockRpc.mockResolvedValue({ error: null });

            await votingService.calculateResult('proposal-123');

            expect(mockRpc).toHaveBeenCalledWith('calculate_proposal_result', {
                p_proposal_id: 'proposal-123',
            });
        });

        it('throws error if RPC fails', async () => {
            const { supabase } = await import('../../lib/supabase');
            const mockRpc = supabase.rpc as any;

            mockRpc.mockResolvedValue({ error: new Error('RPC failed') });

            await expect(votingService.calculateResult('proposal-123')).rejects.toThrow();
        });
    });

    describe('Scenario 3: Get My Voting Units', () => {
        it('returns all members (units) owned by current user', async () => {
            const { supabase } = await import('../../lib/supabase');
            const mockFrom = supabase.from as any;

            const mockMembers = [
                { id: 'member-1', unit_number: '101', fraction: 0.25 },
                { id: 'member-2', unit_number: '102', fraction: 0.25 },
            ];

            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                    data: mockMembers,
                    error: null,
                }),
            });

            const result = await votingService.getMyVotingUnits();

            expect(result).toHaveLength(2);
            expect(result[0].unit_number).toBe('101');
        });

        it('returns empty array if user not authenticated', async () => {
            const { supabase } = await import('../../lib/supabase');
            vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
                data: { user: null },
                error: null,
            } as any);

            const result = await votingService.getMyVotingUnits();

            expect(result).toEqual([]);
        });
    });

    describe('Scenario 4: Proposal Status Updates', () => {
        it('updates proposal status to open', async () => {
            const { supabase } = await import('../../lib/supabase');
            const mockFrom = supabase.from as any;

            mockFrom.mockReturnValue({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            await votingService.updateProposalStatus('proposal-1', 'open');

            const updateCall = mockFrom.mock.results[0].value.update.mock.calls[0][0];
            expect(updateCall.status).toBe('open');
        });

        it('updates proposal status to closed', async () => {
            const { supabase } = await import('../../lib/supabase');
            const mockFrom = supabase.from as any;

            mockFrom.mockReturnValue({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            });

            await votingService.updateProposalStatus('proposal-1', 'closed');

            const updateCall = mockFrom.mock.results[0].value.update.mock.calls[0][0];
            expect(updateCall.status).toBe('closed');
        });
    });
});
