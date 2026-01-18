import React from 'react';
import { BaseModal } from '../../components/ui/BaseModal';
import { Title, Text, Badge, Button, Callout } from '@tremor/react';
import {
    CheckCircleIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    MinusCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import type { Proposal, Vote, Member, VoteChoice } from '../../types/database';
import { getStatusColor } from './votingUtils';

interface ProposalDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    proposal: Proposal | null;
    decision: any;
    myVotes: Vote[];
    myUnits: Member[];
    canManage: boolean;
    userProfile: any;
    onVote: (proposal: Proposal, choice: VoteChoice) => void;
    onDelete: (proposalId: string) => void;
}

export const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
    isOpen,
    onClose,
    proposal,
    decision,
    myVotes,
    myUnits,
    canManage,
    userProfile,
    onVote,
    onDelete
}) => {
    if (!proposal) return null;

    const userVoted = myVotes.some(v => v.proposal_id === proposal.id);
    const isOpenForVoting = proposal.status === 'OPEN';

    const n = decision?.totalEligible || 1;
    const pctFor = decision ? (decision.votesFor / n) * 100 : 0;
    const pctAgainst = decision ? (decision.votesAgainst / n) * 100 : 0;
    const targetPct = decision ? (decision.requiredFor / n) * 100 : 50;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="Details Voorstel">
            <div className="space-y-6">
                <div>
                    <div className="flex gap-2 mb-2">
                        <Badge color={getStatusColor(proposal.status)}>
                            {proposal.status}
                        </Badge>
                        <Badge color="blue">
                            {decision?.policyLabel || 'Onbekend'}
                        </Badge>
                        {userVoted && (
                            <Badge color="emerald" icon={CheckCircleIcon}>
                                Gestemd
                            </Badge>
                        )}
                    </div>
                    <Title>{proposal.title}</Title>
                    <Text className="mt-2 text-gray-700">{proposal.description}</Text>

                    {proposal.meeting && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm border border-gray-100">
                            📅 Bespreking tijdens vergadering: <span className="font-medium">{proposal.meeting.name}</span> ({new Date(proposal.meeting.date).toLocaleDateString()})
                        </div>
                    )}
                </div>

                {/* Results Analysis */}
                {decision && (
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <Text className="text-xs font-bold uppercase text-gray-500 mb-2">
                            Voortgang ({decision.votesCast} van {decision.totalEligible} stemmen uitgebracht)
                        </Text>

                        {/* Progress Bar Container */}
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

                        {decision.isImpossible && !decision.isPassed && isOpenForVoting && (
                            <Callout title="Afgekeurd" color="red" className="mt-3">
                                Het is wiskundig niet meer mogelijk om de vereiste meerderheid te behalen.
                            </Callout>
                        )}
                    </div>
                )}

                {/* Voting Buttons */}
                {isOpenForVoting && !userVoted && myUnits.length > 0 && (
                    <div className="border-t pt-4">
                        <Text className="mb-2 font-medium">Uw stem uitbrengen:</Text>
                        <div className="flex flex-wrap gap-3">
                            <Button icon={HandThumbUpIcon} color="emerald" onClick={() => onVote(proposal, 'FOR')}>
                                Voor
                            </Button>
                            <Button icon={HandThumbDownIcon} color="red" onClick={() => onVote(proposal, 'AGAINST')}>
                                Tegen
                            </Button>
                            <Button icon={MinusCircleIcon} color="gray" onClick={() => onVote(proposal, 'ABSTAIN')}>
                                Onthouden
                            </Button>
                        </div>
                    </div>
                )}

                {/* Admin Actions */}
                {canManage && (
                    <div className="border-t pt-4 flex justify-end">
                        <Button
                            variant="light"
                            color="red"
                            onClick={() => {
                                onDelete(proposal.id);
                                onClose();
                            }}
                            disabled={!userProfile?.is_super_admin && (decision?.votesCast || 0) > 0}
                        >
                            Voorstel Verwijderen
                        </Button>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};
