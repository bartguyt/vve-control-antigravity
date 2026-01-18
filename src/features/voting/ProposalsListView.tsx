import React from 'react';
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
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import type { Proposal, Vote, Member, VoteChoice } from '../../types/database';

interface ProposalsListViewProps {
    proposals: Proposal[];
    myVotes: Vote[];
    myUnits: Member[];
    stats: any[];
    canManage: boolean;
    userProfile: any;
    onVote: (proposal: Proposal, choice: VoteChoice) => void;
    onDelete: (proposalId: string) => void;
}

export const ProposalsListView: React.FC<ProposalsListViewProps> = ({
    proposals,
    myVotes,
    myUnits,
    stats,
    canManage,
    userProfile,
    onVote,
    onDelete
}) => {

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

        const totalEligible = stat.total_eligible_head || 0;
        const votesCast = stat.votes_cast_head || 0;
        const votesFor = stat.votes_for_head || 0;
        const votesAgainst = stat.votes_against_head || 0;
        const votesUncast = totalEligible - votesCast;

        let requiredFor = 0;
        let policyLabel = '';

        if (proposal.type === 'UNANIMOUS') {
            requiredFor = totalEligible;
            policyLabel = 'Unaniem (100%)';
        } else if (proposal.type === 'SPECIAL') {
            requiredFor = Math.ceil(totalEligible * (2 / 3));
            policyLabel = 'Gekwalificeerd (2/3)';
        } else {
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

    return (
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

                const n = decision?.totalEligible || 1;
                const pctFor = decision ? (decision.votesFor / n) * 100 : 0;
                const pctAgainst = decision ? (decision.votesAgainst / n) * 100 : 0;
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
                                        onClick={() => onDelete(proposal.id)}
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
                                    onClick={() => onVote(proposal, 'FOR')}
                                >
                                    Voor
                                </Button>
                                <Button
                                    icon={HandThumbDownIcon}
                                    color="red"
                                    variant="secondary"
                                    onClick={() => onVote(proposal, 'AGAINST')}
                                >
                                    Tegen
                                </Button>
                                <Button
                                    icon={MinusCircleIcon}
                                    color="gray"
                                    variant="secondary"
                                    onClick={() => onVote(proposal, 'ABSTAIN')}
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

                                <div className="relative h-6 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                                    <div className="absolute top-0 left-0 h-full flex w-full">
                                        {pctFor > 0 && <div style={{ width: `${pctFor}%` }} className="bg-emerald-500" />}
                                        {pctAgainst > 0 && <div style={{ width: `${pctAgainst}%` }} className="bg-red-500" />}
                                    </div>
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-black z-10 opacity-50 border-r border-white"
                                        style={{ left: `${targetPct}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs text-gray-600 mb-4">
                                    <span>Voor: {decision.votesFor}</span>
                                    <span>Doel: {decision.requiredFor}</span>
                                </div>

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
    );
};
