import React from 'react';
import { Dialog, DialogPanel, Title, Text, Button } from '@tremor/react';
import type { VoteChoice, Proposal } from '../../types/database';

interface VoteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    choice: VoteChoice | null;
    proposal: Proposal | null;
}

export const VoteConfirmationModal: React.FC<VoteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    choice,
    proposal
}) => {
    if (!proposal || !choice) return null;

    const getChoiceLabel = (c: VoteChoice) => {
        switch (c) {
            case 'FOR': return 'Voor';
            case 'AGAINST': return 'Tegen';
            case 'ABSTAIN': return 'Onthouden';
        }
    };

    const isAbstain = choice === 'ABSTAIN';

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="max-w-md">
                <Title>Stembevestiging</Title>
                <Text className="mt-2">
                    U staat op het punt om <span className="font-bold text-indigo-600">{getChoiceLabel(choice)}</span> te stemmen op het voorstel:
                </Text>
                <Text className="font-medium mt-1 mb-4 italic">"{proposal.title}"</Text>

                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800 space-y-2">
                    <p className="font-bold">Wat betekent dit?</p>
                    {isAbstain ? (
                        <>
                            <p>• Uw aanwezigheid telt mee voor het <strong>Quorum</strong> (geldigheid van de vergadering).</p>
                            <p>• Uw stem telt <strong>NIET</strong> mee voor de uitslag (meerderheidsberekening).</p>
                        </>
                    ) : (
                        <>
                            <p>• Uw stem telt mee voor zowel het <strong>Quorum</strong> als de <strong>Uitslag</strong>.</p>
                            <p>
                                {proposal.type === 'NORMAL' && '• Dit voorstel vereist een gewone meerderheid (> 50%) van de uitgebrachte stemmen.'}
                                {proposal.type === 'SPECIAL' && '• Dit voorstel vereist een gekwalificeerde meerderheid (2/3) van de uitgebrachte stemmen.'}
                                {proposal.type === 'UNANIMOUS' && '• Dit voorstel vereist unanimiteit (100%).'}
                            </p>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" color="gray" onClick={onClose}>
                        Annuleren
                    </Button>
                    <Button onClick={onConfirm} color="indigo">
                        Bevestig Stem
                    </Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
};
