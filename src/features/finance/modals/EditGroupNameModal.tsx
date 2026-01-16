import React from 'react';
import { Button, TextInput } from '@tremor/react';
import { BaseModal } from '../../../components/ui/BaseModal';
import type { ContributionGroup } from '../../../types/database';

interface EditGroupNameModalProps {
    editingGroup: ContributionGroup | null;
    onClose: () => void;
    onSave: () => void;
    groupName: string;
    setGroupName: (n: string) => void;
}

export const EditGroupNameModal: React.FC<EditGroupNameModalProps> = ({
    editingGroup,
    onClose,
    onSave,
    groupName,
    setGroupName
}) => {
    return (
        <BaseModal
            isOpen={!!editingGroup}
            onClose={onClose}
            title="Change Group Name"
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave}>Update</Button>
                </>
            )}
        >
            <TextInput
                placeholder="New name..."
                value={groupName}
                onValueChange={setGroupName}
            />
        </BaseModal>
    );
};
