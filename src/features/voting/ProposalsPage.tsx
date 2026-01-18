import React, { useEffect, useState } from 'react';
import {
    Title,
    Text,
    Grid,
    Badge,
    Button,
    Flex
} from '@tremor/react';
import {
    PlusIcon,
} from '@heroicons/react/24/solid';
import { votingService } from './votingService';
import { memberService } from '../members/memberService';
import type { Proposal, Vote, Member, VoteChoice } from '../../types/database';
import { toast } from 'sonner';
import { CreateProposalModal } from './CreateProposalModal';
import { VoteConfirmationModal } from './VoteConfirmationModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ProposalsListView } from './ProposalsListView';
import { ProposalsKanbanBoard } from './ProposalsKanbanBoard';

export const ProposalsPage: React.FC = () => {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [myUnits, setMyUnits] = useState<Member[]>([]);
    const [myVotes, setMyVotes] = useState<Vote[]>([]);
    const [loading, setLoading] = useState(true);

    // Permissions
    const [canManage, setCanManage] = useState(false);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [voteModal, setVoteModal] = useState<{ isOpen: boolean; proposal: Proposal | null; choice: VoteChoice | null }>({
        isOpen: false,
        proposal: null,
        choice: null
    });
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; proposalId: string | null }>({
        isOpen: false,
        proposalId: null
    });

    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedProposals, units, profile] = await Promise.all([
                votingService.getProposals(),
                votingService.getMyVotingUnits(),
                memberService.getCurrentProfile()
            ]);

            setUserProfile(profile);

            // Permissions
            const effectiveRole = profile?.is_super_admin ? 'admin' : (profile?.association_memberships?.[0]?.role || null);
            setCanManage(['admin', 'board', 'manager'].includes(effectiveRole || ''));

            // Stats & Votes
            const proposalIds = fetchedProposals.map(p => p.id);
            const [voteData, statsData] = await Promise.all([
                votingService.getMyVotes(proposalIds),
                votingService.getProposalStats(proposalIds)
            ]);

            setProposals(fetchedProposals);
            setMyUnits(units);
            setMyVotes(voteData);
            setStats(statsData || []);

        } catch (error) {
            console.error(error);
            toast.error('Kon voorstellen niet laden');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (proposalId: string) => {
        setDeleteModal({ isOpen: true, proposalId });
    };

    const confirmDelete = async () => {
        if (!deleteModal.proposalId) return;

        try {
            await votingService.deleteProposal(deleteModal.proposalId);
            toast.success('Voorstel verwijderd');
            setDeleteModal({ isOpen: false, proposalId: null });
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error('Kan voorstel niet verwijderen. Mogelijk zijn er al stemmen uitgebracht.');
            setDeleteModal({ isOpen: false, proposalId: null });
        }
    };

    const initiateVote = (proposal: Proposal, choice: VoteChoice) => {
        if (myUnits.length === 0) {
            toast.error('U heeft geen stemrecht (geen unit gekoppeld).');
            return;
        }
        setVoteModal({ isOpen: true, proposal, choice });
    };

    const confirmVote = async () => {
        const { proposal, choice } = voteModal;
        if (!proposal || !choice) return;

        try {
            const promises = myUnits.map(unit =>
                votingService.castVote(proposal.id, unit.id, choice)
            );
            await Promise.all(promises);

            toast.success('Stem uitgebracht!');
            setVoteModal({ isOpen: false, proposal: null, choice: null });
            loadData(); // Refresh to see results
        } catch (error) {
            console.error(error);
            toast.error('Stemmen mislukt. Is de stemming nog open?');
        }
    };



    const getDecisionInfo = (proposal: Proposal, stat: any) => {
        if (!stat) return null;

        // BASE NUMBERS
        const totalEligible = stat.total_eligible_head || 0;
        const votesCast = stat.votes_cast_head || 0;
        const votesFor = stat.votes_for_head || 0;
        const votesAgainst = stat.votes_against_head || 0;
        const votesUncast = totalEligible - votesCast;

        // TARGET LOGIC (Absolute Majority of ELIGIBLE)
        // If Modelreglement says "Majority of CAST votes", this logic is wrong.
        // But user specifically asked for "50% needed... 1 done... 2 needed (3 of 6)".
        // This implies they want absolute majority or quorum-based counting.
        // Let's assume ABSOLUTE Majority for now based on user request "3 van de 6".

        let requiredFor = 0;
        let policyLabel = '';

        if (proposal.type === 'UNANIMOUS') {
            requiredFor = totalEligible;
            policyLabel = 'Unaniem (100%)';
        } else if (proposal.type === 'SPECIAL') {
            requiredFor = Math.ceil(totalEligible * (2 / 3));
            policyLabel = 'Gekwalificeerd (2/3)';
        } else {
            // Normal: Majority (> 50%)
            requiredFor = Math.floor(totalEligible / 2) + 1;
            policyLabel = 'Meerderheid (> 50%)';
        }

        const stillNeeded = Math.max(0, requiredFor - votesFor);
        const maxPossibleFor = votesFor + votesUncast;
        const isImpossible = maxPossibleFor < requiredFor;
        const isPassed = votesFor >= requiredFor;

        return {
            totalEligible,
            votesCast,
            votesFor,
            votesAgainst,
            votesUncast,
            requiredFor,
            stillNeeded,
            isImpossible,
            isPassed,
            policyLabel
        };
    };

    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    // ... (existing loadData logic stays same)

    const handleStatusChange = async (proposalId: string, newStatus: string) => {
        if (!canManage) {
            toast.error('Geen rechten om status te wijzigen.');
            return;
        }

        try {
            if (newStatus === 'CHECK_RESULT') {
                // User dragged Open -> Completed. Verify results.
                toast.loading('Resultaat berekenen...');
                await votingService.calculateResult(proposalId);
                toast.dismiss();
                toast.success('Stemming afgerond!');
            } else {
                // Simple status update (Draft -> Open)
                await votingService.updateProposalStatus(proposalId, newStatus);
                toast.success(`Status gewijzigd naar ${newStatus}`);
            }
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Kon status niet wijzigen');
        }
    };

    if (loading) return <div className="p-8">Laden...</div>;

    return (
        <div className="p-6 h-full flex flex-col">
            <header className="mb-6 flex justify-between items-start shrink-0">
                <div>
                    <Title>Stemmingen & Voorstellen</Title>
                    <Text>Bekijk en stem op lopende voorstellen.</Text>
                </div>
                <div className="flex gap-2">
                    <div className="bg-gray-100 p-1 rounded-md flex">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${viewMode === 'board' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Bord
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Lijst
                        </button>
                    </div>
                    {canManage && (
                        <Button icon={PlusIcon} onClick={() => setIsCreateModalOpen(true)}>
                            Nieuw Voorstel
                        </Button>
                    )}
                </div>
            </header>

            {viewMode === 'list' ? (
                <ProposalsListView
                    proposals={proposals}
                    myVotes={myVotes}
                    myUnits={myUnits}
                    stats={stats}
                    canManage={canManage}
                    userProfile={userProfile}
                    onVote={(p, c) => initiateVote(p, c)}
                    onDelete={handleDeleteClick}
                />
            ) : (
                <ProposalsKanbanBoard
                    proposals={proposals}
                    myVotes={myVotes}
                    stats={stats}
                    myUnits={myUnits}
                    canManage={canManage}
                    userProfile={userProfile}
                    onStatusChange={handleStatusChange}
                    onVote={(p, c) => initiateVote(p, c)}
                    onDelete={handleDeleteClick}
                />
            )}

            <CreateProposalModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onProposalCreated={loadData}
            />

            <VoteConfirmationModal
                isOpen={voteModal.isOpen}
                onClose={() => setVoteModal({ ...voteModal, isOpen: false })}
                onConfirm={confirmVote}
                choice={voteModal.choice}
                proposal={voteModal.proposal}
            />

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, proposalId: null })}
                onConfirm={confirmDelete}
                title="Voorstel verwijderen"
                description="Weet u zeker dat u dit voorstel wilt verwijderen? Alle bijbehorende stemmen en gegevens worden permanent gewist."
            />
        </div>
    );
};
