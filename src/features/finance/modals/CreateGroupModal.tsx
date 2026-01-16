import React from 'react';
import { Button, TextInput } from '@tremor/react';
import { BaseModal } from '../../../components/ui/BaseModal';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    groupName: string;
    setGroupName: (n: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    isOpen,
    onClose,
    onSave,
    groupName,
    setGroupName
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="New Group"
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave}>Save</Button>
                </>
            )}
        >
            <TextInput
                placeholder="Group name (e.g. Apartments)"
                value={groupName}
                onValueChange={setGroupName}
            />
        </BaseModal>
    );
};
