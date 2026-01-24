import React from 'react';
import { BaseModal } from './BaseModal';
import { Button } from '@tremor/react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Bevestigen',
    cancelLabel = 'Annuleren',
    isDestructive = false
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button
                        variant="primary"
                        color={isDestructive ? 'red' : 'blue'}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        {cancelLabel}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-gray-600">
                {message}
            </p>
        </BaseModal>
    );
};
