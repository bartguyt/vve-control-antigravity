import React from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '@tremor/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { type ColumnConfig } from '../../hooks/useColumnConfig';

interface ColumnConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: ColumnConfig[];
    onToggleColumn: (id: string) => void;
}

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
    isOpen,
    onClose,
    columns,
    onToggleColumn,
}) => {
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                            Kolom Instellingen
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <Dialog.Description className="text-sm text-gray-600 mb-4">
                        Selecteer welke kolommen je wilt zien in de tabel.
                    </Dialog.Description>

                    <div className="space-y-2 mb-6">
                        {columns.map((col) => (
                            <label
                                key={col.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => onToggleColumn(col.id)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">{col.label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={onClose}>
                            Sluiten
                        </Button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};
