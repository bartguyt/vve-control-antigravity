import React, { useEffect, useState } from 'react';
import {
    Card,
    Title,
    Text,
    Grid,
    Badge,
    Button,
    Flex,
    Callout
} from '@tremor/react';
import {
    CheckCircleIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    MinusCircleIcon,
    PlusIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { votingService } from './votingService';
import { memberService } from '../members/memberService';
import type { Proposal, Vote, Member, VoteChoice } from '../../types/database';
import { toast } from 'sonner';
import { CreateProposalModal } from './CreateProposalModal';
import { VoteConfirmationModal } from './VoteConfirmationModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'emerald';
            case 'ACCEPTED': return 'blue';
            case 'REJECTED': return 'red';
            case 'DRAFT': return 'gray';
            default: return 'gray';
        }
    };

    const getProposalStat = (id: string) => stats.find(s => s.proposal_id === id);

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

    if (loading) return <div className="p-8">Laden...</div>;

    return (
        <div className="p-6">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <Title>Stemmingen & Voorstellen</Title>
                    <Text>Bekijk en stem op lopende voorstellen.</Text>
                </div>
                {canManage && (
                    <Button icon={PlusIcon} onClick={() => setIsCreateModalOpen(true)}>
                        Nieuw Voorstel
                    </Button>
                )}
            </header>

            <Grid numItems={1} className="gap-6">
                {proposals.length === 0 && (
                    <Card>
                        <Text className="italic">Er zijn momenteel geen voorstellen.</Text>
                    </Card>
                )}

                {proposals.map(proposal => {
                    const userVoted = myVotes.some(v => v.proposal_id === proposal.id);
                    const isOpen = proposal.status === 'OPEN';
                    const stat = getProposalStat(proposal.id);
                    const decision = getDecisionInfo(proposal, stat);

                    // Visual Percentages (Total Eligible Base)
                    // If no eligible, avoid div by zero
                    const n = decision?.totalEligible || 1;
                    const pctFor = decision ? (decision.votesFor / n) * 100 : 0;
                    const pctAgainst = decision ? (decision.votesAgainst / n) * 100 : 0;
                    const pctUncast = decision ? (decision.votesUncast / n) * 100 : 0;

                    // Target Line calculation
                    const targetPct = decision ? (decision.requiredFor / n) * 100 : 50;

                    return (
                        <Card key={proposal.id} decoration="left" decorationColor={getStatusColor(proposal.status)}>
                            <Flex justifyContent="between" className="mb-4">
                                <div>
                                    <div className="flex gap-2 mb-2">
                                        <Badge color={getStatusColor(proposal.status)}>
                                            {proposal.status}
                                        </Badge>
                                        <Badge color="blue">
                                            {decision?.policyLabel}
                                        </Badge>
                                    </div>
                                    <Title>{proposal.title}</Title>
                                    <Text className="mt-1">{proposal.description}</Text>
                                    {proposal.meeting && (
                                        <Text className="text-xs mt-2 text-gray-500">
                                            📅 {proposal.meeting.name} ({new Date(proposal.meeting.date).toLocaleDateString()})
                                        </Text>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {userVoted && (
                                        <Badge color="emerald" icon={CheckCircleIcon}>
                                            Gestemd
                                        </Badge>
                                    )}
                                    {canManage && (
                                        <Button
                                            size="xs"
                                            variant="light"
                                            color="red"
                                            tooltip="Verwijder voorstel"
                                            onClick={() => handleDeleteClick(proposal.id)}
                                            disabled={!userProfile?.is_super_admin && (stat?.votes_cast_head || 0) > 0}
                                        >
                                            Verwijderen
                                        </Button>
                                    )}
                                </div>
                            </Flex>

                            {/* Voting Actions */}
                            {isOpen && !userVoted && myUnits.length > 0 && (
                                <div className="flex gap-4 mb-6 border-t border-b py-4 border-gray-100">
                                    <Button
                                        icon={HandThumbUpIcon}
                                        color="emerald"
                                        variant="secondary"
                                        onClick={() => initiateVote(proposal, 'FOR')}
                                    >
                                        Voor
                                    </Button>
                                    <Button
                                        icon={HandThumbDownIcon}
                                        color="red"
                                        variant="secondary"
                                        onClick={() => initiateVote(proposal, 'AGAINST')}
                                    >
                                        Tegen
                                    </Button>
                                    <Button
                                        icon={MinusCircleIcon}
                                        color="gray"
                                        variant="secondary"
                                        onClick={() => initiateVote(proposal, 'ABSTAIN')}
                                    >
                                        Onthouden
                                    </Button>
                                </div>
                            )}

                            {/* Results Preview */}
                            {decision && (
                                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                                    <Text className="text-xs font-bold uppercase text-gray-500 mb-2">
                                        Voortgang ({decision.votesCast} van {decision.totalEligible} stemmen uitgebracht)
                                    </Text>

                                    {/* Progress Bar Container */}
                                    <div className="relative h-6 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                                        <div className="absolute top-0 left-0 h-full flex w-full">
                                            {pctFor > 0 && <div style={{ width: `${pctFor}%` }} className="bg-emerald-500" />}
                                            {pctAgainst > 0 && <div style={{ width: `${pctAgainst}%` }} className="bg-red-500" />}
                                            {/* Uncast is just gray background */}
                                        </div>

                                        {/* Target Line Marker */}
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-black z-10 opacity-50 border-r border-white"
                                            style={{ left: `${targetPct}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs text-gray-600 mb-4">
                                        <span>Voor: {decision.votesFor}</span>
                                        <span>Doel: {decision.requiredFor}</span>
                                    </div>

                                    {/* Analysis Text */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-3">
                                        <div>
                                            <Text className="text-gray-900 font-medium">Status</Text>
                                            {decision.isPassed ? (
                                                <Text className="text-emerald-600 font-bold flex items-center gap-1">
                                                    <CheckCircleIcon className="h-4 w-4" /> Aangenomen!
                                                </Text>
                                            ) : decision.isImpossible ? (
                                                <Text className="text-red-600 font-bold flex items-center gap-1">
                                                    <ExclamationTriangleIcon className="h-4 w-4" /> Niet meer haalbaar
                                                </Text>
                                            ) : (
                                                <Text className="text-blue-600 flex items-center gap-1">
                                                    Nog bezig...
                                                </Text>
                                            )}
                                        </div>

                                        <div>
                                            <Text className="text-gray-900 font-medium">Nog nodig</Text>
                                            {decision.isPassed ? (
                                                <Text className="text-gray-500">Doel bereikt</Text>
                                            ) : decision.isImpossible ? (
                                                <Text className="text-gray-500">Kan doel niet meer bereiken</Text>
                                            ) : (
                                                <Text className="text-gray-900">
                                                    Nog <strong>{decision.stillNeeded}</strong> stemmen VOOR nodig
                                                    <span className="text-xs text-gray-500 block">
                                                        (van de {decision.votesUncast} nog uit te brengen stemmen)
                                                    </span>
                                                </Text>
                                            )}
                                        </div>
                                    </div>

                                    {decision.isImpossible && !decision.isPassed && isOpen && (
                                        <Callout title="Afgekeurd" color="red" className="mt-3">
                                            Het is wiskundig niet meer mogelijk om de vereiste meerderheid te behalen.
                                        </Callout>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </Grid>

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
