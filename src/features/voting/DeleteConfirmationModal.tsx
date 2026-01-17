import React from 'react';
import { Dialog, DialogPanel, Title, Text, Button, Callout } from '@tremor/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    loading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    loading = false
}) => {
    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="max-w-md">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <ExclamationTriangleIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <Title>{title}</Title>
                        <Text className="mt-2 text-gray-600">
                            {description}
                        </Text>
                    </div>
                </div>

                <div className="mt-6 bg-red-50 p-3 rounded-md border border-red-100">
                    <Text className="text-red-800 text-sm font-medium">
                        Deze actie kan niet ongedaan worden gemaakt.
                    </Text>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <Button
                        variant="secondary"
                        color="gray"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Annuleren
                    </Button>
                    <Button
                        onClick={onConfirm}
                        color="red"
                        loading={loading}
                    >
                        Verwijderen
                    </Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
};
