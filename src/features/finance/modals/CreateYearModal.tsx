import React from 'react';
import { Button, NumberInput, TextInput, Text } from '@tremor/react';
import { BaseModal } from '../../../components/ui/BaseModal';
import type { ContributionGroup } from '../../../types/database';

interface CreateYearModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    year: number;
    setYear: (y: number) => void;
    defaultAmount: number;
    setDefaultAmount: (a: number) => void;
    baseRateName: string;
    setBaseRateName: (n: string) => void;
    groupAmounts: Record<string, number>;
    setGroupAmounts: (amounts: Record<string, number>) => void;
    groups: ContributionGroup[];
}

export const CreateYearModal: React.FC<CreateYearModalProps> = ({
    isOpen,
    onClose,
    onSave,
    year,
    setYear,
    defaultAmount,
    setDefaultAmount,
    baseRateName,
    setBaseRateName,
    groupAmounts,
    setGroupAmounts,
    groups
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Fiscal Year"
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave}>Create</Button>
                </>
            )}
        >
            <div className="space-y-4">
                <Text>
                    Create a new year for contributions. This will initialize the base rate and groups.
                </Text>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Year</label>
                    <NumberInput
                        value={year}
                        onValueChange={setYear}
                        placeholder="e.g. 2024"
                        min={2020}
                        max={2030}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Base Rate Name</label>
                        <TextInput
                            value={baseRateName}
                            onValueChange={setBaseRateName}
                            placeholder="e.g. Standard"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Monthly Amount</label>
                        <NumberInput
                            value={defaultAmount}
                            onValueChange={setDefaultAmount}
                            placeholder="e.g. 150"
                            min={0}
                        />
                    </div>
                </div>

                {groups.length > 0 && (
                    <div className="pt-2">
                        <Text className="font-medium mb-2 text-gray-700 dark:text-gray-300">Group Specific Amounts</Text>
                        <div className="space-y-2">
                            {groups.map(g => (
                                <div key={g.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-2 rounded">
                                    <Text className="dark:text-gray-200">{g.name}</Text>
                                    <div className="w-32">
                                        <NumberInput
                                            placeholder="Amount"
                                            value={groupAmounts[g.id] ?? 0}
                                            onValueChange={(val) => setGroupAmounts({ ...groupAmounts, [g.id]: val })}
                                            min={0}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};
