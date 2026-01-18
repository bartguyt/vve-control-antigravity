import React, { useState } from 'react';
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Proposal, Vote, Member, VoteChoice } from '../../types/database';
import { ProposalBoardCard } from './ProposalBoardCard';
import { getDecisionInfo } from './votingUtils';
import { ProposalDetailModal } from './ProposalDetailModal';

interface ProposalsKanbanBoardProps {
    proposals: Proposal[];
    myVotes: Vote[];
    stats: any[];
    myUnits: Member[];
    canManage: boolean;
    userProfile: any;
    onStatusChange: (proposalId: string, newStatus: string) => Promise<void>;
    onVote: (proposal: Proposal, choice: VoteChoice) => void;
    onDelete: (proposalId: string) => void;
}

const DroppableColumn: React.FC<{ id: string; title: string; count: number; children: React.ReactNode }> = ({ id, title, count, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-[300px] bg-gray-50 dark:bg-slate-900 rounded-lg p-4 flex flex-col h-full border-2 transition-colors ${isOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-transparent'}`}
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
                <span className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs py-0.5 px-2 rounded-full font-medium">
                    {count}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                {children}
            </div>
        </div>
    );
};

export const ProposalsKanbanBoard: React.FC<ProposalsKanbanBoardProps> = ({
    proposals,
    myVotes,
    stats,
    myUnits,
    canManage,
    userProfile,
    onStatusChange,
    onVote,
    onDelete
}) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

    // Group proposals by status
    const pending = proposals.filter(p => p.status === 'DRAFT');
    const active = proposals.filter(p => p.status === 'OPEN');
    const completed = proposals.filter(p => ['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(p.status));

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const proposalId = active.id as string;
        const targetColumn = over.id as string;

        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal) return;

        let newStatus: string | null = null;

        if (targetColumn === 'col-pending' && proposal.status !== 'DRAFT') {
            if (proposal.status === 'OPEN') newStatus = 'DRAFT';
        } else if (targetColumn === 'col-active' && proposal.status !== 'OPEN') {
            if (proposal.status === 'DRAFT') newStatus = 'OPEN';
        } else if (targetColumn === 'col-completed' && !['ACCEPTED', 'REJECTED'].includes(proposal.status)) {
            newStatus = 'CHECK_RESULT';
        }

        if (newStatus) {
            onStatusChange(proposalId, newStatus);
        }
    };

    const draggingProposal = activeId ? proposals.find(p => p.id === activeId) : null;
    const getStats = (id: string) => stats.find(s => s.proposal_id === id);

    const renderCard = (p: Proposal) => {
        const stat = getStats(p.id);
        const decision = getDecisionInfo(p, stat);
        return (
            <ProposalBoardCard
                key={p.id}
                proposal={p}
                stats={stat}
                myVotes={myVotes}
                decision={decision}
                onClick={() => setSelectedProposal(p)}
            />
        );
    };

    return (
        <>
            <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex gap-6 h-[calc(100vh-200px)] overflow-x-auto pb-4">
                    <DroppableColumn id="col-pending" title="Concept / Voorgesteld" count={pending.length}>
                        {pending.map(renderCard)}
                    </DroppableColumn>

                    <DroppableColumn id="col-active" title="In Stemming" count={active.length}>
                        {active.map(renderCard)}
                    </DroppableColumn>

                    <DroppableColumn id="col-completed" title="Afgerond" count={completed.length}>
                        {completed.map(renderCard)}
                    </DroppableColumn>
                </div>

                <DragOverlay>
                    {draggingProposal ? (
                        <div className="opacity-80 rotate-3 cursor-grabbing">
                            {renderCard(draggingProposal)}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <ProposalDetailModal
                isOpen={!!selectedProposal}
                onClose={() => setSelectedProposal(null)}
                proposal={selectedProposal}
                decision={selectedProposal ? getDecisionInfo(selectedProposal, getStats(selectedProposal.id)) : null}
                myVotes={myVotes}
                myUnits={myUnits}
                canManage={canManage}
                userProfile={userProfile}
                onVote={(p, c) => {
                    onVote(p, c);
                    setSelectedProposal(null); // Close modal after vote? Or keep open? Maybe close to refresh.
                }}
                onDelete={(id) => {
                    onDelete(id);
                    setSelectedProposal(null);
                }}
            />
        </>
    );
};
