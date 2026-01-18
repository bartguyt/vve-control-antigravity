import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Title, Text, Button, Switch } from '@tremor/react';

interface DashboardConfig {
    showStats: boolean;
    showActivities: boolean;
    showLogins: boolean;
    showContacts: boolean;
    showAssociations: boolean;
}

interface DashboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: DashboardConfig;
    onUpdateConfig: (newConfig: DashboardConfig) => void;
}

export const DashboardSettingsModal: React.FC<DashboardSettingsModalProps> = ({
    isOpen,
    onClose,
    config,
    onUpdateConfig
}) => {
    const [localConfig, setLocalConfig] = useState<DashboardConfig>(config);

    // Sync when opening
    useEffect(() => {
        setLocalConfig(config);
    }, [config, isOpen]);

    const handleSave = () => {
        onUpdateConfig(localConfig);
        onClose();
    };

    const toggle = (key: keyof DashboardConfig) => {
        setLocalConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-md rounded bg-white p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <Title>Dashboard Aanpassen</Title>
                        <button onClick={onClose}>
                            <XMarkIcon className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>

                    <Text className="mb-6">Kies welke onderdelen u op het dashboard wilt zien.</Text>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Statistieken (Tellers)</span>
                            <Switch checked={localConfig.showStats} onChange={() => toggle('showStats')} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Laatste Acties</span>
                            <Switch checked={localConfig.showActivities} onChange={() => toggle('showActivities')} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Recent Ingelogd</span>
                            <Switch checked={localConfig.showLogins} onChange={() => toggle('showLogins')} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Mijn Verenigingen</span>
                            <Switch checked={localConfig.showAssociations} onChange={() => toggle('showAssociations')} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700">Contactpersonen</span>
                            <Switch checked={localConfig.showContacts} onChange={() => toggle('showContacts')} />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <Button variant="secondary" onClick={onClose}>Annuleren</Button>
                        <Button onClick={handleSave}>Opslaan</Button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};
