import React from 'react';
import { Title, Text, Button, Flex } from '@tremor/react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
    title: string;
    description?: string;
    onAdd?: () => void;
    addLabel?: string;
    children?: React.ReactNode; // For extra buttons/actions
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    description,
    onAdd,
    addLabel = "Toevoegen", // Default label
    children
}) => {
    return (
        <div className="mb-6">
            <Flex justifyContent="between" alignItems="center">
                <div>
                    <Title>{title}</Title>
                    {description && (
                        <Text className="mt-1">{description}</Text>
                    )}
                </div>
                <div className="flex space-x-2">
                    {children}
                    {onAdd && (
                        <Button
                            icon={PlusIcon}
                            onClick={onAdd}
                            color="indigo"
                        >
                            {addLabel}
                        </Button>
                    )}
                </div>
            </Flex>
        </div>
    );
};
