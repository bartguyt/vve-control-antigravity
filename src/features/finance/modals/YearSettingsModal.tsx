import React from 'react';
import { Button, NumberInput, TextInput, Title, Text } from '@tremor/react';
import { BaseModal } from '../../../components/ui/BaseModal';
import type { ContributionGroup, ContributionYear } from '../../../types/database';

interface YearSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    selectedYear: ContributionYear | undefined;
    baseRateName: string;
    setBaseRateName: (n: string) => void;
    defaultAmount: number;
    setDefaultAmount: (a: number) => void;
    groupAmounts: Record<string, number>;
    setGroupAmounts: (amounts: Record<string, number>) => void;
    groups: ContributionGroup[];
}

export const YearSettingsModal: React.FC<YearSettingsModalProps> = ({
    isOpen,
    onClose,
    onSave,
    selectedYear,
    baseRateName,
    setBaseRateName,
    defaultAmount,
    setDefaultAmount,
    groupAmounts,
    setGroupAmounts,
    groups
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Fiscal Year Settings: ${selectedYear?.year}`}
            className="max-w-xl"
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave}>Save</Button>
                </>
            )}
        >
            {selectedYear && (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Title className="text-sm uppercase text-gray-500">Base Rate</Title>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Name</label>
                                <TextInput
                                    value={baseRateName}
                                    onValueChange={setBaseRateName}
                                    placeholder="Name"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Monthly Amount</label>
                                <NumberInput
                                    value={defaultAmount}
                                    onValueChange={setDefaultAmount}
                                    min={0}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Title className="text-sm uppercase text-gray-500">Group Specific Amounts</Title>
                        <div className="space-y-3">
                            {groups.map(group => (
                                <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <Text className="font-medium">{group.name}</Text>
                                    <div className="w-32">
                                        <NumberInput
                                            value={groupAmounts[group.id] ?? defaultAmount}
                                            onValueChange={(val) => setGroupAmounts({ ...groupAmounts, [group.id]: val })}
                                            min={0}
                                        />
                                    </div>
                                </div>
                            ))}
                            {groups.length === 0 && (
                                <Text className="italic text-gray-400 text-center py-4">No groups defined yet.</Text>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </BaseModal>
    );
};
