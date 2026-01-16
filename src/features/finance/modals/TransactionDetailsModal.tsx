import React from 'react';
import { Button, Text, Badge } from '@tremor/react';
import { BaseModal } from '../../../components/ui/BaseModal';
import type { Profile } from '../../../types/database';

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedMemberTx: { member: Profile; txs: any[] } | null;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
    isOpen,
    onClose,
    selectedMemberTx
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Linked Transactions"
            className="max-w-2xl"
            footer={(
                <Button variant="secondary" onClick={onClose}>Close</Button>
            )}
        >
            <Text className="mb-6">{selectedMemberTx?.member.first_name} {selectedMemberTx?.member.last_name}</Text>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {selectedMemberTx?.txs.length === 0 ? (
                    <Text className="text-center py-8 text-gray-500 italic">
                        No matching transactions found for this year.
                    </Text>
                ) : (
                    selectedMemberTx?.txs.map((tx, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-start">
                            <div className="space-y-1">
                                <Text className="font-semibold">{tx.description || '(No description)'}</Text>
                                <Text className="text-xs text-gray-400">{new Date(tx.booking_date).toLocaleDateString()}</Text>
                            </div>
                            <Badge color="emerald" size="xs">€ {tx.amount.toFixed(2)}</Badge>
                        </div>
                    ))
                )}
            </div>
        </BaseModal>
    );
};
