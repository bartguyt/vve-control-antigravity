import React from 'react';
import { Card, Text, Badge } from '@tremor/react';
import { useDraggable } from '@dnd-kit/core';
import type { Proposal, Vote } from '../../types/database';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface ProposalBoardCardProps {
    proposal: Proposal;
    stats: any;
    myVotes: Vote[];
    decision: any;
    onClick: () => void;
}

export const ProposalBoardCard: React.FC<ProposalBoardCardProps> = ({ proposal, stats, myVotes, decision, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: proposal.id,
        data: { proposal }
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
    };

    const userVoted = myVotes.some(v => v.proposal_id === proposal.id);

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="mb-3 touch-none">
            <Card
                onClick={onClick}
                className={`
                    p-3 cursor-pointer hover:ring-2 hover:ring-indigo-100 transition-all active:cursor-grabbing
                    ${isDragging ? 'opacity-50 shadow-2xl ring-2 ring-indigo-500 z-50' : ''}
                    ${proposal.status === 'ACCEPTED' ? 'border-l-4 border-emerald-500' : ''}
                    ${proposal.status === 'REJECTED' ? 'border-l-4 border-red-500' : ''}
                `}
            >
                <div className="flex justify-between items-start mb-2">
                    <Badge size="xs" color="gray">{decision?.policyLabel || 'Normaal'}</Badge>
                    {userVoted && <CheckCircleIcon className="h-5 w-5 text-emerald-500" />}
                </div>

                <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{proposal.title}</h4>

                {/* Stats Section - ONLY if logic is available */}
                {decision && (
                    <div className="mt-3 pt-2 border-t border-gray-100 text-xs space-y-1">
                        <div className="flex justify-between text-gray-600">
                            <span>Uitgebracht:</span>
                            <span className="font-medium text-gray-900">{decision.votesCast}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Resterend:</span>
                            <span className="font-medium text-gray-900">{decision.votesUncast}</span>
                        </div>

                        {!decision.isPassed && !decision.isImpossible && (
                            <div className="flex justify-between text-indigo-600 font-medium">
                                <span>Nog nodig (VOOR):</span>
                                <span>{decision.stillNeeded}</span>
                            </div>
                        )}

                        {decision.isImpossible && (
                            <div className="flex items-center gap-1 text-red-600 font-bold mt-1">
                                <ExclamationTriangleIcon className="h-3 w-3" />
                                <span>Onhaalbaar</span>
                            </div>
                        )}

                        {decision.isPassed && (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold mt-1">
                                <CheckCircleIcon className="h-3 w-3" />
                                <span>Behaald</span>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};
